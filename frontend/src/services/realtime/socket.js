import { io } from 'socket.io-client';

// A single shared connection for the whole app (not one per component) —
// io() with no URL connects to the page's own origin, which Vite's dev
// proxy forwards to the backend (see vite.config.js), and which is simply
// the same server in production. autoConnect is off; App.jsx drives
// connect/disconnect off the logged-in user's identity.
let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io({ withCredentials: true, autoConnect: false });
  }
  return socket;
}
