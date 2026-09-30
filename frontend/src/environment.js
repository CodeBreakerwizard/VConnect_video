// Which backend the frontend talks to.
//
// Default: read from REACT_APP_API_URL (set this in a frontend/.env file).
// Falls back to localhost:8000 for local development if nothing is set,
// so you don't accidentally test against a different deployment while
// working on your own backend locally.
//
// For a production build, set REACT_APP_API_URL to your deployed backend URL
// (e.g. in your hosting provider's environment variable settings).

const server = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default server;
