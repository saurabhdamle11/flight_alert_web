// Switches between the cards in index.html (<section id="view-…">)

import { $ } from '../lib/dom.js';

const VIEWS = ['loading', 'unsupported', 'ios-install', 'setup', 'subscribed', 'denied'];

export function show(view) {
  for (const v of VIEWS) $('view-' + v).hidden = v !== view;
}
