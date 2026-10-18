// "You're all set" card: shows the saved location, test signal, unsubscribe

import { $, busy } from '../lib/dom.js';
import { coords } from '../lib/format.js';
import { api } from '../services/api.js';
import { clearToken } from '../services/session.js';
import { removePushSubscription, syncPushSubscription } from '../services/push.js';
import { message } from '../ui/message.js';
import { show } from '../ui/views.js';

let onUnsubscribed = () => {};

/** Shows the subscribed view for `me` (fetched from the API when not given). */
export async function renderSubscribed(me) {
  me = me || await api('/me');
  const loc = me.location;
  $('sub-label').textContent = loc ? loc.label : 'your location';
  $('sub-radius').textContent = loc ? Math.round(loc.radiusKm) : 25;
  $('sub-coords').textContent = loc ? coords(loc.latitude, loc.longitude) : '';
  show('subscribed');
}

async function unsubscribe() {
  if (!confirm('Stop flight alerts and delete your saved location?')) return;
  await busy($('btn-unsubscribe'), 'Turning off…', async () => {
    try {
      await removePushSubscription();
      await api('/me', { method: 'DELETE' }).catch((e) => { if (e.status !== 401) throw e; });
      clearToken();
      onUnsubscribed();
      message('Alerts are off. Your location and account were deleted.');
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
        message('Test sent — it should appear in a few seconds.');
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

/** `unsubscribed` runs after alerts are removed, to return to setup. */
export function initSubscribed({ unsubscribed }) {
  onUnsubscribed = unsubscribed;
  $('btn-test').addEventListener('click', sendTest);
  $('btn-unsubscribe').addEventListener('click', unsubscribe);
}
