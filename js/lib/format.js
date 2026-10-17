import { COORD_PRECISION } from '../config.js';

export const round = (n, places = COORD_PRECISION) => Math.round(n * 10 ** places) / 10 ** places;

export const coords = (lat, lon) =>
  `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;
