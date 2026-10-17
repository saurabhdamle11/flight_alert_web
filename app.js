'use strict';

const API = 'https://flights-api.saurabhdamle.com/api/v1/web';
const GEOCODE = 'https://geocoding-api.open-meteo.com/v1/search';
const TOKEN_KEY = 'fw.token';

const $ = (id) => document.getElementById(id);
const VIEWS = ['loading', 'unsupported', 'ios-install', 'setup', 'subscribed', 'denied'];

// ── Storage (may be unavailable in private mode) ─────────────────────────────

function storageAccess(fn, fallback) {
  try { return fn(); } catch { return fallback; }
}
const storage = {
  get: (k) => storageAccess(() => localStorage.getItem(k), null),
  set: (k, v) => storageAccess(() => localStorage.setItem(k, v)),
  remove: (k) => storageAccess(() => localStorage.removeItem(k)),
};

let token = storage.get(TOKEN_KEY);
let chosen = null;          // { latitude, longitude, label }
let vapidKeyPromise = null; // fetched once per page load

// ── UI helpers ───────────────────────────────────────────────────────────────

function show(view) {
  for (const v of VIEWS) $('view-' + v).hidden = v !== view;
}

function message(text, isError = false) {
  const el = $('message');
  if (!text) { el.hidden = true; return; }
  el.textContent = text;
  el.classList.toggle('error', isError);
  el.hidden = false;
}

async function busy(button, label, fn) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = label;
  try { return await fn(); }
  finally { button.disabled = false; button.textContent = original; }
}

const round = (n, places = 2) => Math.round(n * 10 ** places) / 10 ** places;
const coords = (lat, lon) => `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;

// ── API ──────────────────────────────────────────────────────────────────────

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) headers.Authorization = 'Bearer ' + token;

  let res;
  try {
    res = await fetch(API + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
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

// ── Push plumbing ────────────────────────────────────────────────────────────

const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

function urlBase64ToUint8Array(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function vapidKey() {
  if (!vapidKeyPromise) {
    vapidKeyPromise = api('/vapid-public-key', { auth: false }).then((r) => r.publicKey);
    vapidKeyPromise.catch(() => { vapidKeyPromise = null; });
  }
  return vapidKeyPromise;
}

async function createPushSubscription() {
  const registration = await navigator.serviceWorker.ready;
  const key = urlBase64ToUint8Array(await vapidKey());

  // A subscription made with a different server key can't be reused
  const existing = await registration.pushManager.getSubscription();
  if (existing) await existing.unsubscribe();

  try {
    return await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  } catch (e) {
    if (navigator.brave) {
      throw new Error('Brave blocks push notifications by default. Turn on "Use Google services for push messaging" in brave://settings/privacy, then try again.');
    }
    throw new Error('Your browser could not set up notifications (' + (e.message || e.name) + ').');
  }
}

/** Re-sends this browser's subscription so the server always has the current one. */
async function syncPushSubscription() {
  if (Notification.permission !== 'granted') return;
  const registration = await navigator.serviceWorker.ready;
  let sub = await registration.pushManager.getSubscription();
  if (!sub) sub = await createPushSubscription();
  await api('/me/push-subscriptions', { method: 'POST', body: sub.toJSON() });
}

// ── Location ─────────────────────────────────────────────────────────────────

function choose(latitude, longitude, label) {
  chosen = { latitude: round(latitude), longitude: round(longitude), label };
  const el = $('chosen-location');
  el.textContent = `📍 ${label} · ${coords(chosen.latitude, chosen.longitude)}`;
  el.hidden = false;
  $('search-results').hidden = true;
  $('btn-subscribe').disabled = false;
  message('');
}

function locate() {
  if (!('geolocation' in navigator)) {
    message('Location is not available in this browser — search for your city instead.', true);
    return;
  }
  const btn = $('btn-locate');
  btn.disabled = true;
  btn.textContent = 'Finding you…';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      btn.disabled = false;
      btn.textContent = 'Use my current location';
      choose(pos.coords.latitude, pos.coords.longitude, 'Current location');
    },
    (err) => {
      btn.disabled = false;
      btn.textContent = 'Use my current location';
      const reason = err.code === err.PERMISSION_DENIED
        ? 'Location access was denied.'
        : "Couldn't get your location.";
      message(reason + ' Search for your city instead.', true);
      $('input-city').focus();
    },
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 }
  );
}

async function searchCity(event) {
  event.preventDefault();
  const name = $('input-city').value.trim();
  if (name.length < 2) return;

  const list = $('search-results');
  list.replaceChildren();
  try {
    const res = await fetch(`${GEOCODE}?name=${encodeURIComponent(name)}&count=5&language=en&format=json`);
    const data = await res.json();
    const results = data.results || [];
    if (results.length === 0) {
      message(`No places found for "${name}".`, true);
      list.hidden = true;
      return;
    }
    message('');
    for (const r of results) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      const sub = [r.admin1, r.country].filter(Boolean).join(', ');
      b.append(r.name);
      if (sub) {
        const span = document.createElement('div');
        span.className = 'sub';
        span.textContent = sub;
        b.append(span);
      }
      b.addEventListener('click', () => choose(r.latitude, r.longitude, sub ? `${r.name}, ${r.country || sub}` : r.name));
      li.append(b);
      list.append(li);
    }
    list.hidden = false;
  } catch {
    message('City search is unavailable right now. Try "Use my current location".', true);
  }
}

// ── Subscribe / unsubscribe ──────────────────────────────────────────────────

async function subscribe() {
  if (!chosen) return;
  message('');

  // Must be the first await so the browser treats it as part of the click
  const permission = await Notification.requestPermission();
  if (permission === 'denied') { show('denied'); return; }
  if (permission !== 'granted') {
    message('Notifications are needed to alert you — please allow them when asked.', true);
    return;
  }

  await busy($('btn-subscribe'), 'Subscribing…', async () => {
    try {
      const sub = await createPushSubscription();
      const reg = await api('/register', { method: 'POST', auth: false, body: chosen });
      token = reg.token;
      storage.set(TOKEN_KEY, token);
      try {
        await api('/me/push-subscriptions', { method: 'POST', body: sub.toJSON() });
      } catch (e) {
        // Don't leave a half-registered account behind
        await api('/me', { method: 'DELETE' }).catch(() => {});
        storage.remove(TOKEN_KEY);
        token = null;
        throw e;
      }
      await renderSubscribed();
      message("You're all set! Tap “Send a test notification” to check it works.");
    } catch (e) {
      message(e.status === 429 ? 'Too many sign-ups from your network — try again in an hour.' : e.message, true);
    }
  });
}

async function unsubscribe() {
  if (!confirm('Stop flight alerts and delete your saved location?')) return;
  await busy($('btn-unsubscribe'), 'Unsubscribing…', async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await api('/me', { method: 'DELETE' }).catch((e) => { if (e.status !== 401) throw e; });
      storage.remove(TOKEN_KEY);
      token = null;
      resetSetup();
      show('setup');
      message("You've been unsubscribed and your data was deleted.");
    } catch (e) {
      message(e.message, true);
    }
  });
}

async function sendTest() {
  await busy($('btn-test'), 'Sending…', async () => {
    try {
      const r = await api('/me/test-notification', { method: 'POST' });
      if (r.sent > 0) {
        message('Sent! It should appear in a few seconds.');
      } else if (r.removed > 0) {
        await syncPushSubscription();
        message('This browser needed to re-register — try the test again.');
      } else {
        message("Couldn't deliver the test notification. Try again in a minute.", true);
      }
    } catch (e) {
      message(e.status === 429 ? 'Easy there — try another test in a few minutes.' : e.message, true);
    }
  });
}

// ── Rendering ────────────────────────────────────────────────────────────────

async function renderSubscribed(me) {
  me = me || await api('/me');
  const loc = me.location;
  $('sub-label').textContent = loc ? loc.label : 'your location';
  $('sub-radius').textContent = loc ? Math.round(loc.radiusKm) : 25;
  $('sub-coords').textContent = loc ? coords(loc.latitude, loc.longitude) : '';
  show('subscribed');
}

function resetSetup() {
  chosen = null;
  $('chosen-location').hidden = true;
  $('search-results').hidden = true;
  $('input-city').value = '';
  $('btn-subscribe').disabled = true;
}

async function init() {
  $('btn-locate').addEventListener('click', locate);
  $('form-search').addEventListener('submit', searchCity);
  $('btn-subscribe').addEventListener('click', subscribe);
  $('btn-unsubscribe').addEventListener('click', unsubscribe);
  $('btn-test').addEventListener('click', sendTest);
  $('btn-reload').addEventListener('click', () => location.reload());

  if (!pushSupported()) {
    show(isIos() && !isStandalone() ? 'ios-install' : 'unsupported');
    return;
  }

  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch {
    show('unsupported');
    return;
  }

  if (!token) {
    vapidKey().catch(() => {}); // warm up so subscribing is quick
    show(Notification.permission === 'denied' ? 'denied' : 'setup');
    return;
  }

  try {
    await renderSubscribed(await api('/me'));
    if (Notification.permission === 'denied') {
      show('denied');
      return;
    }
    syncPushSubscription().catch(() => {});
  } catch (e) {
    if (e.status === 401) {
      // Account no longer exists — start over
      storage.remove(TOKEN_KEY);
      token = null;
      show('setup');
    } else {
      show('setup');
      message(e.message, true);
    }
  }
}

init();
