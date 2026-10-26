const KEY = 'code-lab-progress-v1';
export function loadProgress(storage) {
  const fresh = { language: 'js', levelId: 1, completed: { js: [], rust: [] }, drafts: {}, speed: 1, sound: false };
  try {
    const raw = JSON.parse(storage.getItem(KEY));
    if (!raw || typeof raw !== 'object') return fresh;
    const ids = value => Array.isArray(value) ? [...new Set(value.filter(n => Number.isInteger(n) && n >= 1 && n <= 6))] : [];
    fresh.completed = { js: ids(raw.completed?.js), rust: ids(raw.completed?.rust) };
    fresh.language = raw.language === 'rust' ? 'rust' : 'js';
    fresh.levelId = Number.isInteger(raw.levelId) && raw.levelId >= 1 && raw.levelId <= 6 ? raw.levelId : 1;
    fresh.speed = [0.5, 1, 2, 4].includes(raw.speed) ? raw.speed : 1;
    fresh.sound = raw.sound === true;
    if (raw.drafts && typeof raw.drafts === 'object') {
      for (const [key, value] of Object.entries(raw.drafts)) {
        if (/^(js|rust):[1-6]$/.test(key) && typeof value === 'string' && value.length <= 12000) fresh.drafts[key] = value;
      }
    }
  } catch { /* A blocked store must not prevent learning. */ }
  return fresh;
}
export function saveProgress(storage, progress) {
  try { storage.setItem(KEY, JSON.stringify(progress)); return true; } catch { return false; }
}
