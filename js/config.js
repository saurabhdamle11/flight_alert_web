// App-wide settings. Colors, fonts and sizes live in styles/theme.css.

export const API_BASE = 'https://flights-api.saurabhdamle.com/api/v1/web';
export const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/** localStorage key for this device's API token */
export const TOKEN_KEY = 'fw.token';

/** Decimal places kept when sending coordinates (2 ≈ 1 km) */
export const COORD_PRECISION = 2;

/** City search: how many places to suggest */
export const GEOCODE_RESULTS = 5;

/** navigator.geolocation options */
export const GEOLOCATION_OPTIONS = { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 };

/** Footer links, in order. Add a page here and it shows up on every page. */
export const FOOTER_LINKS = [
  { href: '/about.html', label: 'About' },
  { href: '/privacy.html', label: 'Privacy policy' },
];
