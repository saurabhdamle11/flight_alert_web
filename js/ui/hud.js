// Radar scope, status bar and the message line

import { $ } from '../lib/dom.js';

const SYS_LABELS = { standby: 'STANDBY', locked: 'POS LOCKED', armed: 'ALERTS ARMED', error: 'FAULT' };
const READOUT_LABELS = { standby: 'STANDBY', locked: 'LOCKED', armed: 'ARMED', error: 'FAULT' };

/** state: standby | locked | armed | error. `pos` updates the POS readout when given. */
export function hud(state, pos) {
  const scope = $('scope');
  scope.classList.toggle('locked', state === 'locked');
  scope.classList.toggle('armed', state === 'armed');
  $('led').className = 'led' + (state === 'armed' ? '' : state === 'error' ? ' danger' : ' warn');
  $('sys-status').textContent = SYS_LABELS[state];
  $('readout-status').textContent = READOUT_LABELS[state];
  if (pos !== undefined) $('readout-pos').textContent = pos || 'NO FIX';
}

/** Shows a status line under the panels; call with no text to hide it. */
export function message(text, isError = false) {
  const el = $('message');
  if (!text) { el.hidden = true; return; }
  el.textContent = text;
  el.classList.toggle('error', isError);
  el.hidden = false;
}
