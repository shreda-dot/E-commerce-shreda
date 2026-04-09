import axios from 'axios';

/**
 * Single-service deployment (frontend + backend on same Render domain):
 *   Leave VITE_API_URL unset (or set to '').
 *   The empty baseURL makes every `/api/...` call hit the same origin,
 *   which is exactly where Express is listening.
 *
 * Local development:
 *   Also leave VITE_API_URL unset.
 *   Vite's dev-server proxy (vite.config.js → server.proxy) forwards
 *   /api and /images requests to http://localhost:3000.
 *
 * Two-service deployment (separate Render services):
 *   Set VITE_API_URL=https://your-backend.onrender.com in Render's
 *   environment variables. The baseURL will then prefix all API calls.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  withCredentials: true,
});
