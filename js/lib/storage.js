// localStorage wrapper — storage may be unavailable in private mode

function storageAccess(fn, fallback) {
  try { return fn(); } catch { return fallback; }
}

export const storage = {
  get: (k) => storageAccess(() => localStorage.getItem(k), null),
  set: (k, v) => storageAccess(() => localStorage.setItem(k, v)),
  remove: (k) => storageAccess(() => localStorage.removeItem(k)),
};
