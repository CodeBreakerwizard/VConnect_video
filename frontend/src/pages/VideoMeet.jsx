import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import io from "socket.io-client";
import { Badge, IconButton, TextField } from '@mui/material';
import { Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'
import server from '../environment';

const server_url = server;

var connections = {};

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
    ]
}

export default function VideoMeetComponent() {

    const navigate = useNavigate();

    var socketRef = useRef();
    let socketIdRef = useRef();

    let localVideoref = useRef();
    const cameraStreamRef = useRef(null);
    const displayStreamRef = useRef(null);
    const mediaReadyRef = useRef(Promise.resolve());

    let [video, setVideo] = useState([]);

    let [audio, setAudio] = useState();
    let [mediaNotice, setMediaNotice] = useState("");

    let [screen, setScreen] = useState();

    let [showModal, setModal] = useState(false);

    let [screenAvailable, setScreenAvailable] = useState();

    let [messages, setMessages] = useState([])

    let [message, setMessage] = useState("");

    let [newMessages, setNewMessages] = useState(0);

    let [askForUsername, setAskForUsername] = useState(true);

    let [username, setUsername] = useState("");

    const videoRef = useRef([])

    let [videos, setVideos] = useState([])

    // TODO
    // if(isChrome() === false) {


    // }

    const getPermissions = async () => {
        // Screen sharing does not require a camera or microphone. Keep this
        // control available even when another browser owns the physical device.
        setScreenAvailable(Boolean(navigator.mediaDevices?.getDisplayMedia));
        try {
            // Ask independently: a locked/denied camera must not also remove
            // microphone and screen-sharing capability from this participant.
            const tracks = [];
            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                tracks.push(...videoStream.getVideoTracks());
            } catch (error) {
                console.warn("Camera unavailable:", error.name);
                setMediaNotice("Camera is unavailable. Turn it off in another app/browser, then click the camera button to retry.");
            }
            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                tracks.push(...audioStream.getAudioTracks());
            } catch (error) {
                console.warn("Microphone unavailable:", error.name);
                setMediaNotice("Microphone is unavailable. Turn it off in another app/browser, then click the microphone button to retry.");
            }

            const hasVideo = tracks.some((track) => track.kind === 'video');
            const hasAudio = tracks.some((track) => track.kind === 'audio');
            // Keep audio/video transceivers present even without local hardware.
            // This lets the participant still receive calls and begin screen share.
            if (!hasVideo) tracks.push(Object.assign(black(), { isPlaceholder: true }));
            if (!hasAudio) tracks.push(Object.assign(silence(), { isPlaceholder: true }));
            const userMediaStream = new MediaStream(tracks);
            cameraStreamRef.current = userMediaStream;
            window.localStream = userMediaStream;
            setVideo(hasVideo);
            setAudio(hasAudio);

            if (localVideoref.current) {
                localVideoref.current.srcObject = userMediaStream;
            }
        } catch (error) {
            console.error("Unable to access camera or microphone:", error);
        }
    };

    useEffect(() => {
        mediaReadyRef.current = getPermissions();
        // Media is initialized once per meeting component.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    let getMedia = async () => {
        // Do not negotiate a call until the initial media request has settled.
        // Otherwise a fast click can permanently negotiate placeholder tracks.
        await mediaReadyRef.current;
        connectToSocketServer();
    }

    let getDislayMediaSuccess = (stream) => {
        console.log("HERE")
        displayStreamRef.current = stream;
        const screenTrack = stream.getVideoTracks()[0];
        const micTrack = cameraStreamRef.current?.getAudioTracks()[0];
        window.localStream = new MediaStream(micTrack ? [screenTrack, micTrack] : [screenTrack]);
        localVideoref.current.srcObject = window.localStream

        for (let id in connections) {
            if (id === socketIdRef.current) continue
            const sender = connections[id].getSenders().find((item) => item.track?.kind === 'video');
            if (sender) sender.replaceTrack(screenTrack).catch(console.error);
        }

        screenTrack.onended = () => {
            setScreen(false)
            const cameraTrack = cameraStreamRef.current?.getVideoTracks()[0];
            if (cameraTrack) {
                window.localStream = cameraStreamRef.current;
                localVideoref.current.srcObject = cameraStreamRef.current;
                for (let id in connections) {
                    const sender = connections[id].getSenders().find((item) => item.track?.kind === 'video');
                    if (sender) sender.replaceTrack(cameraTrack).catch(console.error);
                }
            }
        }
    }

    let gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message)
        const peer = connections[fromId];

        if (peer && fromId !== socketIdRef.current) {
            if (signal.sdp) {
                peer.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        peer.createAnswer().then((description) => {
                            peer.setLocalDescription(description).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': peer.localDescription }))
                            }).catch(e => console.log(e))
                        }).catch(e => console.log(e))
                    }
                }).catch(e => console.log(e))
            }

            if (signal.ice) {
                peer.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
            }
        }
    }

    const createPeerConnection = (peerId) => {
        if (peerId === socketIdRef.current || connections[peerId]) return connections[peerId];

        const peer = new RTCPeerConnection(peerConfigConnections);
        connections[peerId] = peer;
        peer.onicecandidate = ({ candidate }) => {
            if (candidate) socketRef.current.emit('signal', peerId, JSON.stringify({ ice: candidate }));
        };
        peer.ontrack = (event) => {
            const stream = event.streams[0];
            if (!stream) return;
            setVideos((current) => {
                const exists = current.some((item) => item.socketId === peerId);
                const updated = exists
                    ? current.map((item) => item.socketId === peerId ? { ...item, stream } : item)
                    : [...current, { socketId: peerId, stream }];
                videoRef.current = updated;
                return updated;
            });
        };

        if (!window.localStream) {
            window.localStream = new MediaStream([black(), silence()]);
        }
        window.localStream.getTracks().forEach((track) => peer.addTrack(track, window.localStream));
        return peer;
    };

    const createOffer = async (peerId) => {
        const peer = createPeerConnection(peerId);
        if (!peer) return;
        const description = await peer.createOffer();
        await peer.setLocalDescription(description);
        socketRef.current.emit('signal', peerId, JSON.stringify({ sdp: peer.localDescription }));
    };

    let connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false })

        socketRef.current.on('signal', gotMessageFromServer)

        socketRef.current.on('connect', () => {
            socketIdRef.current = socketRef.current.id
            socketRef.current.emit('join-call', window.location.href)

            socketRef.current.on('chat-message', addMessage)

            socketRef.current.on('user-left', (id) => {
                connections[id]?.close();
                delete connections[id];
                setVideos((videos) => videos.filter((video) => video.socketId !== id))
            })

            socketRef.current.on('existing-users', (clientIds) => {
                clientIds.forEach((clientId) => createOffer(clientId).catch(console.error));
            });

            socketRef.current.on('user-joined', (clientId) => {
                createPeerConnection(clientId);
            })
        })
    }

    let silence = () => {
        let ctx = new AudioContext()
        let oscillator = ctx.createOscillator()
        let dst = oscillator.connect(ctx.createMediaStreamDestination())
        oscillator.start()
        ctx.resume()
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
    }
    let black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height })
        canvas.getContext('2d').fillRect(0, 0, width, height)
        let stream = canvas.captureStream()
        return Object.assign(stream.getVideoTracks()[0], { enabled: false })
    }

    const placeholderFor = (kind) => Object.assign(kind === 'video' ? black() : silence(), { isPlaceholder: true });

    const replaceOutgoingTrack = (kind, track) => {
        Object.values(connections).forEach((peer) => {
            const sender = peer.getSenders().find((item) => item.track?.kind === kind);
            if (sender) sender.replaceTrack(track).catch(console.error);
        });
    };

    const setDeviceTrack = (kind, nextTrack) => {
        const stream = cameraStreamRef.current || new MediaStream();
        const previousTrack = stream.getTracks().find((track) => track.kind === kind);
        if (previousTrack) stream.removeTrack(previousTrack);
        stream.addTrack(nextTrack);
        cameraStreamRef.current = stream;

        // While sharing, the video sender must continue to send the screen;
        // microphone changes always apply immediately.
        if (kind === 'audio' || !screen) replaceOutgoingTrack(kind, nextTrack);
        if (!screen) {
            window.localStream = stream;
            if (localVideoref.current) localVideoref.current.srcObject = stream;
        }
        return previousTrack;
    };

    const startDevice = async (kind) => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia(
                kind === 'video' ? { video: true, audio: false } : { video: false, audio: true }
            );
            const track = mediaStream.getTracks()[0];
            const previousTrack = setDeviceTrack(kind, track);
            if (previousTrack && !previousTrack.isPlaceholder) previousTrack.stop();
            if (kind === 'video') setVideo(true);
            else setAudio(true);
            setMediaNotice("");
        } catch (error) {
            console.error(`Unable to start ${kind}:`, error);
            setMediaNotice(`${kind === 'video' ? 'Camera' : 'Microphone'} is still in use or blocked. Release it in the other browser, then try again.`);
        }
    };

    const stopDevice = (kind) => {
        const currentTrack = cameraStreamRef.current?.getTracks().find((track) => track.kind === kind);
        if (!currentTrack || currentTrack.isPlaceholder) return;
        const placeholder = placeholderFor(kind);
        setDeviceTrack(kind, placeholder);
        currentTrack.stop(); // Releases the real webcam/microphone for another browser.
        if (kind === 'video') setVideo(false);
        else setAudio(false);
    };

    const handleVideo = () => {
        const track = cameraStreamRef.current?.getVideoTracks()[0];
        if (track && !track.isPlaceholder && video) stopDevice('video');
        else startDevice('video');
    };
    const handleAudio = () => {
        const track = cameraStreamRef.current?.getAudioTracks()[0];
        if (track && !track.isPlaceholder && audio) stopDevice('audio');
        else startDevice('audio');
    };
    let handleScreen = () => {
        if (screen) {
            displayStreamRef.current?.getTracks().forEach((track) => track.stop());
            return;
        }
        // Must be called directly from the click handler or browsers may reject it.
        navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
            .then(getDislayMediaSuccess)
            .then(() => setScreen(true))
            .catch((error) => console.error("Unable to start screen sharing:", error));
    }

    let handleEndCall = () => {
        try {
            let tracks = localVideoref.current.srcObject.getTracks()
            tracks.forEach(track => track.stop())
        } catch (e) { }
        window.location.href = "/"
    }

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data }
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
    };



    let sendMessage = () => {
        console.log(socketRef.current);
        socketRef.current.emit('chat-message', message, username)
        setMessage("");

        // this.setState({ message: "", sender: username })
    }

    
    let connect = () => {
        setAskForUsername(false);
        getMedia();
    }


    return (
        <div>

            {askForUsername === true ?

                <div className={styles.lobbyPageContainer}>

                    <nav className={styles.lobbyNav}>
                        <div className={styles.lobbyBrand}>
                            <div className={styles.lobbyLogoMark}>🎥</div>
                            <h2>Vconnect</h2>
                        </div>
                        <div className={styles.lobbyBackHome} onClick={() => navigate("/")} role="button">
                            ← Back to Home
                        </div>
                    </nav>

                    <div className={styles.lobbyContent}>

                        <div className={styles.lobbyWelcomeCard}>
                            <h2>Welcome! 👋</h2>
                            <p className={styles.lobbySubtext}>Join a meeting instantly as a guest.</p>

                            <ul className={styles.lobbyFeatureList}>
                                <li>
                                    <span className={styles.lobbyFeatureIcon}>👤</span>
                                    <div>
                                        <p className={styles.lobbyFeatureTitle}>No account required</p>
                                        <p className={styles.lobbyFeatureSub}>Join a meeting in just one click</p>
                                    </div>
                                </li>
                                <li>
                                    <span className={styles.lobbyFeatureIcon}>🎥</span>
                                    <div>
                                        <p className={styles.lobbyFeatureTitle}>High quality</p>
                                        <p className={styles.lobbyFeatureSub}>Crystal clear video & audio</p>
                                    </div>
                                </li>
                                <li>
                                    <span className={styles.lobbyFeatureIcon}>💻</span>
                                    <div>
                                        <p className={styles.lobbyFeatureTitle}>Works everywhere</p>
                                        <p className={styles.lobbyFeatureSub}>On desktop, tablet & mobile devices</p>
                                    </div>
                                </li>
                                <li>
                                    <span className={styles.lobbyFeatureIcon}>🔒</span>
                                    <div>
                                        <p className={styles.lobbyFeatureTitle}>100% Secure</p>
                                        <p className={styles.lobbyFeatureSub}>Your calls are private and encrypted</p>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        <div className={styles.lobbyJoinCard}>
                            <h2>Enter into Lobby ✨</h2>
                            <p className={styles.lobbySubtext}>Enter your name to join the meeting</p>

                            <div className={styles.lobbyPreviewWrap}>
                                <video className={styles.lobbyPreviewVideo} ref={localVideoref} autoPlay muted></video>
                            </div>

                            <div className={styles.lobbyInputRow}>
                                <TextField
                                    id="outlined-basic"
                                    label="Enter your name"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    variant="outlined"
                                    fullWidth
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            color: '#f5f6fa',
                                            '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' },
                                            '&:hover fieldset': { borderColor: '#a855f7' },
                                            '&.Mui-focused fieldset': { borderColor: '#a855f7' },
                                        },
                                        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
                                    }}
                                />
                                <Button
                                    variant="contained"
                                    onClick={connect}
                                    disabled={!username}
                                    sx={{
                                        background: 'linear-gradient(135deg, #6d5dfc, #a855f7)',
                                        whiteSpace: 'nowrap',
                                        paddingInline: '1.4rem',
                                        '&:hover': { background: 'linear-gradient(135deg, #5b4ce0, #9333ea)' },
                                    }}
                                >
                                    Connect →
                                </Button>
                            </div>

                            <p className={styles.lobbyTipsHeading}>Tips for a better experience</p>
                            <div className={styles.lobbyTipsGrid}>
                                <div className={styles.lobbyTipCard}>
                                    <span>🎥</span>
                                    <div>
                                        <p className={styles.lobbyFeatureTitle}>Allow Camera Access</p>
                                        <p className={styles.lobbyFeatureSub}>You can change this later</p>
                                    </div>
                                </div>
                                <div className={styles.lobbyTipCard}>
                                    <span>🎙️</span>
                                    <div>
                                        <p className={styles.lobbyFeatureTitle}>Allow Microphone Access</p>
                                        <p className={styles.lobbyFeatureSub}>For clear communication</p>
                                    </div>
                                </div>
                                <div className={styles.lobbyTipCard}>
                                    <span>📶</span>
                                    <div>
                                        <p className={styles.lobbyFeatureTitle}>Stable Internet</p>
                                        <p className={styles.lobbyFeatureSub}>For the best call quality</p>
                                    </div>
                                </div>
                            </div>

                            <p className={styles.lobbyPrivacyNote}>🔒 Your privacy is important to us. No data is stored.</p>
                        </div>

                    </div>

                </div> :


                <div className="min-h-screen overflow-hidden bg-slate-950 text-white">
                    <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between border-b border-white/10 bg-slate-950/75 px-5 py-4 backdrop-blur-md">
                        <div>
                            <p className="text-lg font-semibold tracking-tight">Vconnect</p>
                            <p className="text-xs text-slate-400">{username} · {videos.length + 1} participant{videos.length === 0 ? '' : 's'}</p>
                        </div>
                        <div className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">Meeting active</div>
                    </header>

                    <main className="flex h-screen items-center justify-center px-4 pb-28 pt-20">
                        {videos.length === 0 ? (
                            <div className="flex max-w-sm flex-col items-center gap-4 text-center">
                                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-violet-500/15 text-4xl">👋</div>
                                <h1 className="text-xl font-semibold">Waiting for others to join</h1>
                                <p className="text-sm leading-6 text-slate-400">Share this meeting link. When someone joins, their video will appear here.</p>
                            </div>
                        ) : (
                            <div className={`grid h-full w-full max-w-7xl gap-4 ${videos.length === 1 ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
                                {videos.map((remoteVideo) => (
                                    <div key={remoteVideo.socketId} className="relative min-h-0 overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-panel">
                                        <video
                                            data-socket={remoteVideo.socketId}
                                            ref={(ref) => {
                                                if (ref && remoteVideo.stream && ref.srcObject !== remoteVideo.stream) {
                                                    ref.srcObject = remoteVideo.stream;
                                                    ref.play().catch(() => {});
                                                }
                                            }}
                                            className="h-full w-full object-cover"
                                            autoPlay
                                            playsInline
                                        />
                                        <div className="absolute bottom-4 left-4 rounded-lg bg-black/55 px-3 py-1.5 text-sm font-medium backdrop-blur">Participant</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </main>

                    <div className="absolute right-5 top-20 z-10 w-40 overflow-hidden rounded-2xl border border-white/20 bg-slate-900 shadow-panel sm:w-56">
                        <video
                            className="aspect-[4/3] w-full bg-slate-800 object-cover"
                            ref={(ref) => {
                                localVideoref.current = ref;
                                if (ref && window.localStream && ref.srcObject !== window.localStream) {
                                    ref.srcObject = window.localStream;
                                    ref.play().catch(() => {});
                                }
                            }}
                            autoPlay
                            muted
                            playsInline
                        />
                        <div className="absolute bottom-2 left-2 rounded-md bg-black/55 px-2 py-1 text-xs font-medium">You</div>
                    </div>

                    {showModal && <aside className="absolute bottom-24 right-5 top-20 z-30 flex w-[min(22rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-panel backdrop-blur-xl">
                        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                            <h2 className="font-semibold">Meeting chat</h2>
                            <button onClick={() => setModal(false)} className="text-sm text-slate-400 hover:text-white">Close</button>
                        </div>
                        <div className="flex-1 space-y-4 overflow-y-auto p-5">
                            {messages.length ? messages.map((item, index) => (
                                <div key={index} className="rounded-xl bg-white/5 p-3">
                                    <p className="mb-1 text-xs font-semibold text-violet-300">{item.sender}</p>
                                    <p className="text-sm text-slate-200">{item.data}</p>
                                </div>
                            )) : <p className="pt-8 text-center text-sm text-slate-400">No messages yet</p>}
                        </div>
                        <form onSubmit={(event) => { event.preventDefault(); if (message.trim()) sendMessage(); }} className="flex gap-2 border-t border-white/10 p-3">
                            <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a message" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-violet-400" />
                            <button type="submit" className="rounded-xl bg-violet-500 px-3 text-sm font-medium hover:bg-violet-400">Send</button>
                        </form>
                    </aside>}

                    {mediaNotice && <div className="absolute bottom-24 left-1/2 z-30 w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-amber-300/25 bg-amber-950/90 px-4 py-3 text-center text-sm text-amber-100 shadow-lg backdrop-blur">
                        {mediaNotice}
                    </div>}

                    <div className="absolute inset-x-0 bottom-0 z-40 flex justify-center bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent px-4 pb-5 pt-10">
                        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/90 p-2 shadow-panel backdrop-blur-xl">
                            <IconButton aria-label="Toggle camera" title="Toggle camera" onClick={handleVideo} className="!bg-white/10 !text-white hover:!bg-white/20">
                                {video === true ? <VideocamIcon /> : <VideocamOffIcon />}
                            </IconButton>
                            <IconButton aria-label="Toggle microphone" title="Toggle microphone" onClick={handleAudio} className="!bg-white/10 !text-white hover:!bg-white/20">
                                {audio === true ? <MicIcon /> : <MicOffIcon />}
                            </IconButton>
                            {screenAvailable && <IconButton aria-label="Share screen" title={screen ? 'Stop sharing screen' : 'Share screen'} onClick={handleScreen} className="!bg-white/10 !text-white hover:!bg-white/20">
                                {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                            </IconButton>}
                            <Badge badgeContent={newMessages} max={999} color="secondary">
                                <IconButton aria-label="Toggle chat" title="Toggle chat" onClick={() => { setModal(!showModal); setNewMessages(0); }} className="!bg-white/10 !text-white hover:!bg-white/20"><ChatIcon /></IconButton>
                            </Badge>
                            <IconButton aria-label="Leave meeting" title="Leave meeting" onClick={handleEndCall} className="!bg-red-500 !text-white hover:!bg-red-400"><CallEndIcon /></IconButton>
                        </div>
                    </div>
                </div>

            }

        </div>
    )
}
