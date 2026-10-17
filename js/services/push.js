// Browser push plumbing: support checks, service worker, subscriptions

import { api, vapidKey } from './api.js';

export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

/** sw.js must stay at the site root so its scope covers the whole site. */
export const registerServiceWorker = () => navigator.serviceWorker.register('/sw.js');

function urlBase64ToUint8Array(base64) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function createPushSubscription() {
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
export async function syncPushSubscription() {
  if (Notification.permission !== 'granted') return;
  const registration = await navigator.serviceWorker.ready;
  let sub = await registration.pushManager.getSubscription();
  if (!sub) sub = await createPushSubscription();
  await api('/me/push-subscriptions', { method: 'POST', body: sub.toJSON() });
}

export async function removePushSubscription() {
  const registration = await navigator.serviceWorker.ready;
  const sub = await registration.pushManager.getSubscription();
  if (sub) await sub.unsubscribe();
}
