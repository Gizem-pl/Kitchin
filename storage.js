// storage.js — ONE place for persistence.
//
// The backend contract is identical to React Native's AsyncStorage:
//   getItem(key) -> Promise<string|null>, setItem(key, value) -> Promise, removeItem(key) -> Promise
// To port to Expo:
//   import AsyncStorage from '@react-native-async-storage/async-storage';
//   const store = createStore(AsyncStorage);
// Nothing else in the app needs to change.

const PREFIX = 'kitchenos.v1.';

export const KEYS = {
  settings: 'settings', // pantry toggles, dietary locks, blocklist, appliances
  targets: 'targets', // daily protein / calorie targets
  mealLogs: 'mealLogs', // { 'YYYY-MM-DD': [entries] }
  weightLogs: 'weightLogs', // [{ date, kg, chest, waist, hip }]
  fridge: 'fridge', // Quick Cook selections
  batch: 'batch', // Batch Prep selections
  recipePrefs: 'recipePrefs', // per-recipe portions + swaps
  cart: 'cart', // 7-day planner: week settings, generated meal blocks, eaten/bought ticks
  customRecipes: 'customRecipes', // My Recipes: written in-app, generated from the fridge, or imported
  customPantry: 'customPantry', // [{ id, name }] staples typed in on the Rules tab (on/off lives in settings.pantry)
};

/** Browser backend wrapping localStorage (fails soft in private mode / quota errors). */
export const localStorageBackend = {
  async getItem(key) {
    try { return globalThis.localStorage ? globalThis.localStorage.getItem(key) : null; } catch { return null; }
  },
  async setItem(key, value) {
    try { if (globalThis.localStorage) globalThis.localStorage.setItem(key, value); } catch (e) { console.warn('Storage write failed', e); }
  },
  async removeItem(key) {
    try { if (globalThis.localStorage) globalThis.localStorage.removeItem(key); } catch { /* ignore */ }
  },
};

/** In-memory backend (tests, or fallback). */
export function memoryBackend() {
  const m = new Map();
  return {
    async getItem(k) { return m.has(k) ? m.get(k) : null; },
    async setItem(k, v) { m.set(k, String(v)); },
    async removeItem(k) { m.delete(k); },
  };
}

export function createStore(backend = localStorageBackend) {
  const timers = {};

  async function get(key, fallback = null) {
    const raw = await backend.getItem(PREFIX + key);
    if (raw === null || raw === undefined) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  async function set(key, value) {
    await backend.setItem(PREFIX + key, JSON.stringify(value));
  }

  /** Debounced write: coalesces rapid taps into one write per key. */
  function save(key, value, delay = 250) {
    clearTimeout(timers[key]);
    timers[key] = setTimeout(() => { delete timers[key]; set(key, value); }, delay);
  }

  /** Drop pending writes so they can't land on top of a reset or a restored backup. */
  function cancelPending() {
    Object.keys(timers).forEach((key) => {
      clearTimeout(timers[key]);
      delete timers[key];
    });
  }

  /** Write any pending debounced values immediately (e.g. when the app is backgrounded). */
  function flush(getValue) {
    Object.keys(timers).forEach((key) => {
      clearTimeout(timers[key]);
      delete timers[key];
      set(key, getValue(key));
    });
  }

  async function loadAll() {
    const out = {};
    for (const k of Object.values(KEYS)) {
      const v = await get(k, undefined);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }

  async function saveAll(data) {
    cancelPending();
    for (const k of Object.values(KEYS)) {
      if (data[k] !== undefined) await set(k, data[k]);
    }
  }

  async function clearAll() {
    cancelPending();
    for (const k of Object.values(KEYS)) await backend.removeItem(PREFIX + k);
  }

  return { get, set, save, flush, loadAll, saveAll, clearAll };
}
