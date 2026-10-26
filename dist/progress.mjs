import { LEVELS } from './levels.mjs';
import { PAGE_LEVELS } from './page-lab.mjs';
const KEY = 'code-lab-progress-v1';
export function loadProgress(storage) {
  const validIds = new Set(LEVELS.map(level => level.id));
  const pageIds = new Set(PAGE_LEVELS.map(level => level.id));
  const fresh = { track: 'robot', language: 'js', levelId: LEVELS[0].id, pageLevelId: 1, completed: { js: [], rust: [] }, pageCompleted: [], drafts: {}, speed: 1, sound: false };
  try {
    const raw = JSON.parse(storage.getItem(KEY));
    if (!raw || typeof raw !== 'object') return fresh;
    const ids = (value, valid = validIds) => Array.isArray(value) ? [...new Set(value.filter(n => Number.isInteger(n) && valid.has(n)))] : [];
    fresh.completed = { js: ids(raw.completed?.js), rust: ids(raw.completed?.rust) };
    fresh.language = raw.language === 'rust' ? 'rust' : 'js';
    fresh.levelId = validIds.has(raw.levelId) ? raw.levelId : LEVELS[0].id;
    fresh.track = raw.track === 'page' ? 'page' : 'robot';
    fresh.pageLevelId = pageIds.has(raw.pageLevelId) ? raw.pageLevelId : PAGE_LEVELS[0].id;
    fresh.pageCompleted = ids(raw.pageCompleted, pageIds);
    fresh.speed = [0.5, 1, 2, 4].includes(raw.speed) ? raw.speed : 1;
    fresh.sound = raw.sound === true;
    if (raw.drafts && typeof raw.drafts === 'object') {
      for (const [key, value] of Object.entries(raw.drafts)) {
        const match = /^(js|rust|page):(\d+)$/.exec(key);
        if (match && (match[1] === 'page' ? pageIds.has(Number(match[2])) : validIds.has(Number(match[2]))) && typeof value === 'string' && value.length <= 12000) {
          // Remove only the retired generated sample; custom edits remain in the draft.
          fresh.drafts[key] = match[1] === 'page' ? value.split(/\r?\n/).filter(line => line.trim() !== "document.querySelector('#lab-poster').textContent = '探索，从这一行代码开始。';").join('\n') : value;
        }
      }
    }
  } catch { /* A blocked store must not prevent learning. */ }
  return fresh;
}
export function saveProgress(storage, progress) {
  try { storage.setItem(KEY, JSON.stringify(progress)); return true; } catch { return false; }
}
