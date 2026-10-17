// Entry point for index.html: wires up the views and picks which one to show

import { $ } from './lib/dom.js';
import { api, vapidKey } from './services/api.js';
import { getToken, clearToken } from './services/session.js';
import { pushSupported, isIos, isStandalone, registerServiceWorker, syncPushSubscription } from './services/push.js';
import { message } from './ui/hud.js';
import { show } from './ui/views.js';
import { initSetup, resetSetup } from './views/setup.js';
import { initSubscribed, renderSubscribed } from './views/subscribed.js';
import './components/site-footer.js';

async function init() {
  initSetup({ subscribed: () => renderSubscribed() });
  initSubscribed({ unsubscribed: () => { resetSetup(); show('setup'); } });
  $('btn-reload').addEventListener('click', () => location.reload());

  if (!pushSupported()) {
    show(isIos() && !isStandalone() ? 'ios-install' : 'unsupported');
    return;
  }

  try {
    await registerServiceWorker();
  } catch {
    show('unsupported');
    return;
  }

  if (!getToken()) {
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
      clearToken();
      show('setup');
    } else {
      show('setup');
      message(e.message, true);
    }
  }
}

init();
