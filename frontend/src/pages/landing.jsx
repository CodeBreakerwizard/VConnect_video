import React from 'react'
import "../App.css"
import { Link, useNavigate } from 'react-router-dom'

export default function LandingPage() {

    const router = useNavigate();

    return (
        <div className='landingPageContainer'>
            <nav>
                <div className='navHeader'>
                    <div className='logoMark'>🎥</div>
                    <h2>Vconnect</h2>
                </div>
                <div className='navlist'>
                    <p onClick={() => {
                        router("/aljk23")
                    }}>Join as Guest</p>
                    <p onClick={() => {
                        router("/auth")
                    }}>Register</p>
                    <p onClick={() => {
                        router("/auth")
                    }} role='button'>Login</p>
                    <div className='navCta' onClick={() => { router("/auth") }} role='button'>
                        Get Started →
                    </div>
                </div>
            </nav>

            <div className="landingMainContainer">
                <div className="heroLeft">
                    <div className="heroBadge">🛡️ HD Quality &nbsp;•&nbsp; Secure &nbsp;•&nbsp; Easy to Use</div>

                    <h1>Connect with your <span className="gradientText">loved</span> ones</h1>

                    <p className="heroSubtitle">High-quality video calls for everyone. Stay close, no matter the distance.</p>

                    <div className="heroActions">
                        <div className="primaryCta" role='button' onClick={() => router("/auth")}>
                            <Link to={"/auth"}>Get Started Free →</Link>
                        </div>
                        <div className="secondaryCta" role='button' onClick={() => router("/aljk23")}>
                            Join as Guest ⓘ
                        </div>
                    </div>

                    <div className="featureRow">
                        <div className="featureChip">
                            <span>🛡️</span>
                            <div>
                                <span className="chipTitle">Secure</span>
                                <span className="chipSub">End-to-end encrypted</span>
                            </div>
                        </div>
                        <div className="featureChip">
                            <span>⚡</span>
                            <div>
                                <span className="chipTitle">Fast</span>
                                <span className="chipSub">Low latency calls</span>
                            </div>
                        </div>
                        <div className="featureChip">
                            <span>👥</span>
                            <div>
                                <span className="chipTitle">Groups</span>
                                <span className="chipSub">Up to 50 participants</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="heroRight">
                    <div className="callCard cardBack">
                        <div className="callTopBar">
                            <span>00:24:18</span>
                            <span>📶 🔋</span>
                        </div>
                        <div className="callAvatarWrap">
                            <div className="callAvatarCircle">JD</div>
                            <div className="callPip">AK</div>
                        </div>
                        <div className="callControls">
                            <div className="callBtn">🔇</div>
                            <div className="callBtn">🎥</div>
                            <div className="callBtn">🔊</div>
                            <div className="callBtn endBtn">📞</div>
                        </div>
                    </div>

                    <div className="callCard cardFront">
                        <div className="callTopBar">
                            <span>00:24:18</span>
                            <span>📶 🔋</span>
                        </div>
                        <div className="callAvatarWrap">
                            <div className="callAvatarCircle">AK</div>
                            <div className="callPip">JD</div>
                        </div>
                        <div className="callControls">
                            <div className="callBtn">🎥</div>
                            <div className="callBtn">🔊</div>
                            <div className="callBtn endBtn">📞</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
