# Vconnect

A full-stack video conferencing web application. Users can register, start or join a meeting with a shareable code, video/audio call in real time over WebRTC, chat during a call, and see their past meeting history — or skip signup entirely and join a call as a guest.

## Features

- **Real-time video/audio calls** over WebRTC, with Socket.IO handling offer/answer/ICE candidate signaling between peers
- **Room-based sessions** — each meeting code is its own signaling room; joining, leaving, and reconnecting are tracked per room
- **In-call chat** alongside the video grid
- **Screen sharing**
- **Guest access** — join a call instantly with just a name, no account needed
- **Account system** — register/login with bcrypt-hashed passwords, and a history of past meetings tied to your account
- **REST API** (Express + MongoDB/Mongoose) backing auth and meeting history

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18, React Router, Material UI, Socket.IO client |
| Backend | Node.js, Express, Socket.IO, Mongoose (MongoDB) |
| Auth | bcrypt password hashing, token-based sessions |
| Real-time | WebRTC (peer connections) + Socket.IO (signaling) |

## Project structure

```
Zoom/
├── frontend/          React app
│   └── src/
│       ├── pages/          Landing, auth, home, history, video-call/lobby screens
│       ├── contexts/       Auth context (login/register/history calls)
│       ├── utils/          Route auth guard
│       └── styles/         CSS modules for the call/lobby UI
└── backend/           Express API + Socket.IO signaling server
    └── src/
        ├── controllers/    Socket signaling logic, user/auth logic
        ├── models/         Mongoose schemas (User, Meeting)
        └── routes/         REST routes
```

## Getting started

You'll need Node.js installed, and a MongoDB connection string (a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster works fine).

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and set your own values:

```
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/<db-name>
PORT=8000
```

Then run it:

```bash
npm run dev      # starts with nodemon (auto-restarts on changes)
# or
npm start        # plain node
```

You should see `LISTENING ON PORT 8000` and a Mongo connection confirmation in the terminal.

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

Opens at `http://localhost:3000`. By default it talks to the backend at `http://localhost:8000` — no extra config needed for local development. If you want it to point somewhere else (e.g. a deployed backend), copy `frontend/.env.example` to `frontend/.env` and set `REACT_APP_API_URL`.

## Security note

`.env` files hold real credentials and are git-ignored on purpose — never commit them. Use `.env.example` as the template for what variables are needed. If a real secret ever ends up in a commit, rotating the credential (e.g. changing the database password in Atlas) is what actually fixes it; deleting the line in a later commit isn't enough, since it's still visible in git history unless that history is rewritten.

## Scripts reference

**Backend** (`backend/package.json`)
- `npm run dev` – start with nodemon
- `npm start` – start with node
- `npm run prod` – start with pm2

**Frontend** (`frontend/package.json`)
- `npm start` – dev server
- `npm run build` – production build
- `npm test` – test runner
