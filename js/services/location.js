// Device geolocation and city search (Open-Meteo geocoding)

import { GEOCODE_URL, GEOCODE_RESULTS, GEOLOCATION_OPTIONS } from '../config.js';

export const geolocationSupported = () => 'geolocation' in navigator;

/** Resolves with a GeolocationPosition; rejects with a GeolocationPositionError. */
export function currentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, GEOLOCATION_OPTIONS);
  });
}

/** Places matching `name`: [{ name, admin1, country, latitude, longitude }, …] */
export async function searchPlaces(name) {
  const res = await fetch(`${GEOCODE_URL}?name=${encodeURIComponent(name)}&count=${GEOCODE_RESULTS}&language=en&format=json`);
  const data = await res.json();
  return data.results || [];
}
