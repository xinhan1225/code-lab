import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProgress, saveProgress } from '../dist/progress.mjs';

test('corrupt or inaccessible storage starts a playable session', () => {
  assert.deepEqual(loadProgress({ getItem: () => '{broken' }).completed, { js: [], rust: [] });
  assert.equal(loadProgress({ getItem() { throw new Error('blocked'); } }).language, 'js');
  assert.equal(saveProgress({ setItem() { throw new Error('blocked'); } }, {}), false);
});
test('progress validates untrusted data and separates the two languages', () => {
  const data = loadProgress({ getItem: () => JSON.stringify({ language: 'rust', levelId: 99, completed: { js: [1, 1, -1, 7], rust: [2] }, drafts: { 'js:1': 'forward();', x: '<script>' }, speed: 99 }) });
  assert.deepEqual(data.completed, { js: [1], rust: [2] });
  assert.equal(data.levelId, 1);
  assert.equal(data.language, 'rust');
  assert.deepEqual(data.drafts, { 'js:1': 'forward();' });
  assert.equal(data.speed, 1);
});
