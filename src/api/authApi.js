/**
 * Auth API client for the AQI Intelligence Platform.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/** GET /api/auth/csrf/ — Get CSRF token */
async function getCSRFToken() {
  const res = await fetch(`${API_BASE}/auth/csrf/`, { credentials: 'include' });
  const data = await res.json();
  return data.csrfToken;
}

/** POST /api/auth/login/ */
export async function login(username, password) {
  const csrfToken = await getCSRFToken();
  const res = await fetch(`${API_BASE}/auth/login/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': csrfToken,
    },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Login failed');
  }
  return res.json();
}

/** POST /api/auth/logout/ */
export async function logout() {
  const csrfToken = await getCSRFToken();
  await fetch(`${API_BASE}/auth/logout/`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-CSRFToken': csrfToken },
  });
}

/** GET /api/auth/me/ — Check current session */
export async function getMe() {
  try {
    const res = await fetch(`${API_BASE}/auth/me/`, { credentials: 'include' });
    return res.json();
  } catch {
    return { authenticated: false, user: null };
  }
}
