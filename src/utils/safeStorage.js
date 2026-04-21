/**
 * Wrapper autour de localStorage qui résiste au blocage
 * par la protection anti-pistage d'Edge (Tracking Prevention).
 * Quand localStorage est bloqué, les données sont gardées en mémoire
 * pour la durée de la session.
 */
const memoryFallback = new Map();

let _storageAvailable = null;

function isStorageAvailable() {
  if (_storageAvailable !== null) return _storageAvailable;
  try {
    const key = '__rsc_storage_test__';
    localStorage.setItem(key, '1');
    localStorage.removeItem(key);
    _storageAvailable = true;
  } catch {
    _storageAvailable = false;
  }
  return _storageAvailable;
}

export const safeStorage = {
  getItem(key) {
    try {
      if (isStorageAvailable()) return localStorage.getItem(key);
    } catch { /* blocked */ }
    return memoryFallback.get(key) ?? null;
  },

  setItem(key, value) {
    try {
      if (isStorageAvailable()) {
        localStorage.setItem(key, value);
        return;
      }
    } catch { /* blocked */ }
    memoryFallback.set(key, value);
  },

  removeItem(key) {
    try {
      if (isStorageAvailable()) localStorage.removeItem(key);
    } catch { /* blocked */ }
    memoryFallback.delete(key);
  },
};
