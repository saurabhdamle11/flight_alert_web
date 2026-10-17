// This device's API token, persisted in localStorage

import { TOKEN_KEY } from '../config.js';
import { storage } from '../lib/storage.js';

let token = storage.get(TOKEN_KEY);

export const getToken = () => token;

export function setToken(value) {
  token = value;
  storage.set(TOKEN_KEY, value);
}

export function clearToken() {
  token = null;
  storage.remove(TOKEN_KEY);
}
