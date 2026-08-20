const defaultApiBase = 'http://localhost:5000/api';

export const API_BASE = (import.meta.env.VITE_API_BASE || defaultApiBase).replace(/\/$/, '');

// In production Vite values are embedded at build time. Deriving the socket
// host from VITE_API_BASE prevents a missing VITE_SOCKET_URL from silently
// sending the browser back to localhost.
export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || API_BASE.replace(/\/api$/, '')).replace(/\/$/, '');
