// "Position" + "Alerts" panel: pick a location, then subscribe

import { $, busy } from '../lib/dom.js';
import { round, coords } from '../lib/format.js';
import { api } from '../services/api.js';
import { setToken, clearToken } from '../services/session.js';
import { createPushSubscription } from '../services/push.js';
import { geolocationSupported, currentPosition, searchPlaces } from '../services/location.js';
import { hud, message } from '../ui/hud.js';
import { show } from '../ui/views.js';

let chosen = null; // { latitude, longitude, label }
let onSubscribed = async () => {};

function choose(latitude, longitude, label) {
  chosen = { latitude: round(latitude), longitude: round(longitude), label };
  const el = $('chosen-location');
  el.textContent = `TARGET LOCKED · ${label.toUpperCase()} · ${coords(chosen.latitude, chosen.longitude)}`;
  el.hidden = false;
  $('search-results').hidden = true;
  $('btn-subscribe').disabled = false;
  hud('locked', coords(chosen.latitude, chosen.longitude));
  message('');
}

async function locate() {
  if (!geolocationSupported()) {
    message('Location is not available in this browser — search for your city instead.', true);
    return;
  }
  const btn = $('btn-locate');
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = '◎ Acquiring…';
  try {
    const pos = await currentPosition();
    choose(pos.coords.latitude, pos.coords.longitude, 'Current location');
  } catch (err) {
    const reason = err.code === err.PERMISSION_DENIED
      ? 'Location access was denied.'
      : "Couldn't get your location.";
    message(reason + ' Search for your city instead.', true);
    $('input-city').focus();
  } finally {
    btn.disabled = false;
    btn.textContent = label;
  }
}

function renderResults(results) {
  const list = $('search-results');
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
}

async function searchCity(event) {
  event.preventDefault();
  const name = $('input-city').value.trim();
  if (name.length < 2) return;

  const list = $('search-results');
  list.replaceChildren();
  try {
    const results = await searchPlaces(name);
    if (results.length === 0) {
      message(`No places found for "${name}".`, true);
      list.hidden = true;
      return;
    }
    message('');
    renderResults(results);
  } catch {
    message('City search is unavailable right now. Try "Use my current location".', true);
  }
}

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

  await busy($('btn-subscribe'), '▶ Arming…', async () => {
    try {
      const sub = await createPushSubscription();
      const reg = await api('/register', { method: 'POST', auth: false, body: chosen });
      setToken(reg.token);
      try {
        await api('/me/push-subscriptions', { method: 'POST', body: sub.toJSON() });
      } catch (e) {
        // Don't leave a half-registered account behind
        await api('/me', { method: 'DELETE' }).catch(() => {});
        clearToken();
        throw e;
      }
      await onSubscribed();
      message('Alerts armed. Hit TEST SIGNAL to check notifications reach you.');
    } catch (e) {
      message(e.status === 429 ? 'Too many sign-ups from your network — try again in an hour.' : e.message, true);
    }
  });
}

export function resetSetup() {
  chosen = null;
  $('chosen-location').hidden = true;
  $('search-results').hidden = true;
  $('input-city').value = '';
  $('btn-subscribe').disabled = true;
  hud('standby', null);
}

/** `subscribed` runs after a successful subscribe, to show the armed view. */
export function initSetup({ subscribed }) {
  onSubscribed = subscribed;
  $('btn-locate').addEventListener('click', locate);
  $('form-search').addEventListener('submit', searchCity);
  $('btn-subscribe').addEventListener('click', subscribe);
}
