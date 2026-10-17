// Flight Whisperer backend API

import { API_BASE } from '../config.js';
import { getToken } from './session.js';

let vapidKeyPromise = null; // fetched once per page load

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) headers.Authorization = 'Bearer ' + getToken();

  let res;
  try {
    res = await fetch(API_BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error("Can't reach the Flight Whisperer server. Check your connection and try again.");
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error((data && data.detail) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export function vapidKey() {
  if (!vapidKeyPromise) {
    vapidKeyPromise = api('/vapid-public-key', { auth: false }).then((r) => r.publicKey);
    vapidKeyPromise.catch(() => { vapidKeyPromise = null; });
  }
  return vapidKeyPromise;
}
