import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProgress, saveProgress } from '../dist/progress.mjs';
import { LEVELS } from '../dist/levels.mjs';

test('corrupt or inaccessible storage starts a playable session', () => {
  assert.deepEqual(loadProgress({ getItem: () => '{broken' }).completed, { js: [], rust: [] });
  assert.equal(loadProgress({ getItem() { throw new Error('blocked'); } }).language, 'js');
  assert.equal(saveProgress({ setItem() { throw new Error('blocked'); } }, {}), false);
});
test('progress validates untrusted data and separates the two languages', () => {
  const data = loadProgress({ getItem: () => JSON.stringify({ language: 'rust', levelId: 99, completed: { js: [1, 1, -1, 7], rust: [2] }, drafts: { 'js:1': 'forward();', x: '<script>' }, speed: 99 }) });
  assert.deepEqual(data.completed, { js: [1, 7], rust: [2] });
  assert.equal(data.levelId, LEVELS[0].id);
  assert.equal(data.language, 'rust');
  assert.deepEqual(data.drafts, { 'js:1': 'forward();' });
  assert.equal(data.speed, 1);
});
test('old six-lesson progress keeps its original identities and drafts', () => {
  const old = { language: 'rust', levelId: 6, completed: { js: [1,2,3,4,5,6], rust: [1] }, drafts: { 'js:1': '// old first mission', 'rust:6': 'fn main() {}' } };
  const data = loadProgress({ getItem: () => JSON.stringify(old) });
  assert.equal(data.track, 'robot');
  assert.equal(data.levelId, 6);
  assert.deepEqual(data.completed.js, old.completed.js);
  assert.deepEqual(data.drafts, old.drafts);
});
test('page experiments keep independent progress and drafts with validated input', () => {
  const data = loadProgress({ getItem: () => JSON.stringify({ track:'page', pageLevelId:4, pageCompleted:[1,2,2,7,'3'], completed:{js:[18],rust:[3]}, drafts:{'page:1':'hello','page:7':'no','js:18':'yes','rust:99':'no'} }) });
  assert.equal(data.track, 'page');
  assert.equal(data.pageLevelId, 4);
  assert.deepEqual(data.pageCompleted, [1,2]);
  assert.deepEqual(data.completed, {js:[18],rust:[3]});
  assert.deepEqual(data.drafts, {'page:1':'hello','js:18':'yes'});
});
