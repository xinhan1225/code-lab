import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const bytes = await readFile(new URL('../dist/engine.wasm', import.meta.url));
const { instance } = await WebAssembly.instantiate(bytes);
const { next_position, rotate, goal } = instance.exports;

test('real Rust Wasm moves within bounds and respects both wall masks', () => {
  assert.equal(next_position(1, 1, 0, 7, 7, 0, 0), 1);
  assert.equal(next_position(1, 1, 1, 7, 7, 0, 0), 9);
  assert.equal(next_position(1, 1, 2, 7, 7, 0, 0), 15);
  assert.equal(next_position(1, 1, 3, 7, 7, 0, 0), 7);
  assert.equal(next_position(0, 0, 0, 7, 7, 0, 0), -1);
  assert.equal(next_position(0, 0, 3, 7, 7, 0, 0), -1);
  assert.equal(next_position(6, 6, 1, 7, 7, 0, 0), -1);
  assert.equal(next_position(6, 6, 2, 7, 7, 0, 0), -1);
  assert.equal(next_position(1, 1, 0, 7, 7, 1 << 1, 0), -1);
  assert.equal(next_position(2, 4, 1, 7, 7, 1 << 31, 0), -1);
  assert.equal(next_position(3, 4, 1, 7, 7, 0, 1), -1);
  assert.equal(next_position(5, 6, 1, 7, 7, 0, 1 << 16), -1);
  assert.equal(next_position(5, 6, 1, 7, 7, 0, 1 << 31), 48);
  for (const args of [
    [0, 0, 0, 0, 7], [0, 0, 0, 7, 8], [0, 0, 4, 7, 7],
    [-1, 0, 1, 7, 7], [7, 0, 3, 7, 7], [0, 2147483647, 2, 7, 7],
  ]) assert.equal(next_position(...args, 0, 0), -1);
});

test('rotation normalizes negative and extreme integer inputs', () => {
  assert.equal(rotate(0, -1), 3);
  assert.equal(rotate(3, 1), 0);
  assert.equal(rotate(0, 8), 0);
  assert.equal(rotate(-5, -5), 2);
  assert.equal(rotate(2147483647, 2147483647), 2);
  assert.equal(rotate(-2147483648, -2147483648), 0);
});

test('exit opens only when every required item has been collected', () => {
  assert.equal(goal(1, 3, 3), 1);
  assert.equal(goal(0, 3, 3), 0);
  assert.equal(goal(1, 2, 3), 0);
  assert.equal(goal(1, 4, 3), 0);
  assert.equal(goal(1, 0, 0), 1);
});
