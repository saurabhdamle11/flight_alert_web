// Switches between the panels in index.html (<section id="view-…">)

import { $ } from '../lib/dom.js';
import { hud } from './hud.js';

const VIEWS = ['loading', 'unsupported', 'ios-install', 'setup', 'subscribed', 'denied'];

export function show(view) {
  for (const v of VIEWS) $('view-' + v).hidden = v !== view;
  if (view === 'unsupported' || view === 'denied') hud('error');
  else if (view === 'setup' && $('chosen-location').hidden) hud('standby');
}
