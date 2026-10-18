// The status / error message line under the controls

import { $ } from '../lib/dom.js';

/** Shows a status line under the controls; call with no text to hide it. */
export function message(text, isError = false) {
  const el = $('message');
  if (!text) { el.hidden = true; return; }
  el.textContent = text;
  el.classList.toggle('error', isError);
  el.hidden = false;
}
