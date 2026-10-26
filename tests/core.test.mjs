import test from 'node:test';
import assert from 'node:assert/strict';
test('JS loop counter shadows an outer counter before its condition', () => {
  assert.deepEqual(compile('let i=3; for(let i=0;i<i;i++){forward();}', 'js'), []);
});
test('JS block variables cannot be read before their declaration', () => {
  assert.throws(() => compile('let n=3; if(pathAhead()){for(let i=0;i<n;i++){forward();}let n=1;}', 'js'), /初始化|声明/);
});
import {LEVELS} from '../dist/levels.mjs';
import {compile, createState, applyCommand, isPathAhead, getLevelInfo, attachRules} from '../dist/core.mjs';

function run(level, code, language) {
  let state = createState(level);
  const queue = [...compile(code, language)];
  let evaluations = 0;
  while (queue.length && !state.won && state.status !== 'error') {
    assert.ok(++evaluations <= 256);
    const command = queue.shift();
    if (command.op === 'if') queue.unshift(...(isPathAhead(level, state) ? command.then : command.else));
    else state = applyCommand(level, state, command);
  }
  return state;
}

for (const level of LEVELS) for (const language of ['js', 'rust']) {
  test(`${level.id} ${level.name}: ${language} reference solution wins`, () => {
    const state = run(level, level.solutions[language], language);
    assert.equal(state.won, true);
    assert.equal(state.status, 'won');
    assert.equal(state.collected.length, getLevelInfo(level).batteries.length);
  });
  test(`${level.id} ${language} starter parses`, () => {
    assert.doesNotThrow(() => compile(level.starters[language], language));
  });
}

test('syntax errors include the correct source line and reject executable JS', () => {
  assert.throws(() => compile('// comment\n\nalert(1);', 'js'), /第 3 行/);
  assert.throws(() => compile('forward()\nturnLeft();', 'js'), /第 2 行.*；|第 2 行.*;/);
  assert.throws(() => compile('globalThis.process.exit();', 'js'), /第 1 行/);
  assert.throws(() => compile('turn_left();', 'js'), /暂不支持/);
  assert.throws(() => compile('fn main(){turnLeft();}', 'rust'), /暂不支持/);
  assert.throws(() => compile('forward();', 'rust'), /需要 fn main/);
  assert.throws(() => compile('let const = 2;', 'js'), /保留字/);
  assert.throws(() => compile('let n = 2; let n = 3;', 'js'), /重复声明/);
  assert.throws(() => compile('forward();', 'python'), /请选择/);
});

test('loop bounds, expansion, nesting and input size stay bounded', () => {
  assert.equal(compile('for(let i=0;i<256;i++){forward();}', 'js').length, 256);
  assert.throws(() => compile('for(let i=0;i<257;i++){forward();}', 'js'), /0 到 256/);
  assert.throws(() => compile('for(let i=0;i<256;i++){forward();turnLeft();}', 'js'), /最多 256/);
  assert.throws(() => compile('while(true){}', 'js'), /暂不支持/);
  assert.throws(() => compile(' '.repeat(12001), 'js'), /12000/);
  assert.throws(() => compile('for(let i=0;i<256;i++){for(let j=0;j<256;j++){}}', 'js'), /展开过多/);
  assert.throws(() => compile('if(pathAhead()){'.repeat(34) + '}'.repeat(34), 'js'), /嵌套/);
});

test('comments, numeric variables and loop-local counters work', () => {
  assert.equal(compile('let n = 3; // comment\nfor(let i=0;i<n;i++){forward();}', 'js').length, 3);
  assert.equal(compile('fn main(){let mut n: i32=3;for _ in 0..n {forward();}}', 'rust').length, 3);
  assert.equal(compile('for(let i=0;i<3;i++){for(let j=0;j<i;j++){forward();}}', 'js').length, 3);
  assert.throws(() => compile('for(let i=0;i<n;i++){forward();}', 'js'), /变量“n”尚未声明/);
  assert.equal(compile('let __proto__ = 2; for(let i=0;i<__proto__;i++){forward();}', 'js').length, 2);
  assert.throws(() => compile('fn main(){let n: usize = -1;}', 'rust'), /范围/);
  assert.throws(() => compile('fn main(){let n: i32 = 2147483648;}', 'rust'), /范围/);
  assert.doesNotThrow(() => compile('fn main(){let n: usize = 4294967295;}', 'rust'));
  assert.throws(() => compile('fn main(){let n: usize = 4294967296;}', 'rust'), /范围/);
});

test('conditions evaluate the current position and both branches are reachable', () => {
  const level = LEVELS.find(item => item.id === 2);
  const state = run(level, 'for(let i=0;i<5;i++){if(pathAhead()){forward();}else{turnLeft();}}', 'js');
  assert.equal(state.won, true);
  assert.equal(state.moves, 4);
  assert.equal(state.steps, 5);
  const commands = compile('// first\nif(pathAhead()){\nforward();\n}else{turnLeft();}', 'js');
  assert.equal(commands[0].line, 2);
  assert.equal(commands[0].then[0].line, 3);
  assert.equal(commands[0].else[0].op, 'left');
});

test('collision reports a line and does not mutate the original state', () => {
  const level = {rows:['#####','#SBE#','#####'],startDir:1};
  const original = createState(level);
  const snapshot = structuredClone(original);
  const rotated = applyCommand(level, original, {op:'left', line:1});
  const failed = applyCommand(level, rotated, {op:'forward', line:7});
  assert.deepEqual(original, snapshot);
  assert.notEqual(rotated.collected, original.collected);
  assert.equal(failed.status, 'error');
  assert.match(failed.error, /第 7 行.*墙/);
  assert.equal(failed.moves, 0);
  assert.equal(failed.steps, 2);
});

test('exit needs every battery and collecting the same battery is idempotent', () => {
  const level = {rows:['#####','#S.E#','#.B.#','#####'], startDir:1};
  assert.equal(run(level, 'forward();forward();', 'js').won, false);
  const state = run(level, 'turnRight();forward();turnLeft();forward();turnRight();turnRight();forward();turnLeft();turnLeft();forward();forward();turnLeft();forward();', 'js');
  assert.equal(state.won, true);
  assert.equal(state.collected.length, 1);
});

test('attached Wasm-shaped rules receive map bits and control movement', () => {
  const calls = [];
  const api = {
    next_position(x,y,dir,width,height,lo,hi) {
      calls.push([width,height,lo,hi]);
      const [dx,dy] = [[0,-1],[1,0],[0,1],[-1,0]][dir];
      const nx=x+dx, ny=y+dy, index=ny*width+nx;
      return nx<0 || ny<0 || nx>=width || ny>=height || ((index<32?lo>>>index:hi>>>(index-32))&1) ? -1 : index;
    },
    rotate: (dir, delta) => (dir+delta+4)%4,
    goal: (exit,collected,total) => Number(exit && collected===total),
  };
  try {
    attachRules(api);
    for (const level of LEVELS) assert.equal(run(level, level.solutions.js, 'js').won, true);
    assert.ok(calls.some(([,height,,hi]) => height===6 && hi>0));
    assert.throws(() => attachRules({}), /缺少/);
  } finally { attachRules(); }
});

test('rectangular level data includes exactly one start and exit', () => {
  assert.equal(LEVELS.length, 18);
  for (const level of LEVELS) {
    const info = getLevelInfo(level);
    assert.ok(info.width <= 7 && info.height <= 7);
    assert.ok(info.width >= 6 && info.height === 6);
    assert.ok(level.rows.join('').split('#').length - 1 < info.width * info.height * 0.35);
    assert.equal(level.hints.length, 3);
  }
  assert.throws(() => getLevelInfo({rows:['S#','E'],startDir:0}), /矩形/);
});

test('curriculum preserves saved IDs and increases difficulty gently', () => {
  assert.deepEqual(LEVELS.map(level => level.id), [7, 8, 1, 9, 10, 2, 11, 12, 3, 13, 4, 14, 15, 5, 16, 17, 6, 18]);
  assert.equal(new Set(LEVELS.map(level => level.id)).size, 18);
  for (let id = 1; id <= 6; id++) assert.ok(LEVELS.find(level => level.id === id));
  for (let index = 0; index < LEVELS.length; index++) {
    const level = LEVELS[index];
    assert.ok(['基础控制', '循环思维', '变量与判断', '综合应用'].includes(level.stage));
    assert.ok(Number.isInteger(level.difficulty) && level.difficulty >= 1 && level.difficulty <= 5);
    assert.ok(typeof level.newSkill === 'string' && level.newSkill.length > 0);
    assert.ok(Number.isInteger(level.suggestedMinutes) && level.suggestedMinutes > 0);
    if (index) {
      const increase = level.difficulty - LEVELS[index - 1].difficulty;
      assert.ok(increase >= 0 && increase <= 1);
    }
  }
});

test('first steps isolate calls and turns before combined routes', () => {
  const first = LEVELS.find(level => level.id === 7);
  assert.equal(getLevelInfo(first).batteries.length, 0);
  assert.deepEqual(compile(first.starters.js, 'js'), []);
  assert.equal(run(first, first.solutions.js, 'js').moves, 1);
  assert.equal(run(LEVELS.find(level => level.id === 8), 'forward();forward();', 'js').won, true);
  for (const [id, turn] of [[9, 'left'], [10, 'right']]) {
    const level = LEVELS.find(level => level.id === id);
    assert.deepEqual(compile(level.solutions.js, 'js').map(command => command.op), [turn, 'forward']);
    assert.equal(run(level, level.solutions.js, 'js').steps, 2);
  }
});

test('single conditions introduce each branch before repeated sensor checks', () => {
  for (const language of ['js', 'rust']) {
    const yes = LEVELS.find(level => level.id === 14);
    const no = LEVELS.find(level => level.id === 15);
    assert.equal(isPathAhead(yes, createState(yes)), true);
    assert.equal(isPathAhead(no, createState(no)), false);
    assert.equal(compile(yes.solutions[language], language).length, 1);
    assert.equal(run(yes, yes.solutions[language], language).steps, 1);
    assert.equal(run(no, no.solutions[language], language).steps, 2);
    const right = LEVELS.find(level => level.id === 16);
    assert.equal(run(right, right.solutions[language], language).moves, 4);
    assert.equal(run(right, right.solutions[language], language).steps, 5);
    const final = LEVELS.find(level => level.id === 18);
    const state = run(final, final.solutions[language], language);
    assert.equal(state.moves, 13);
    assert.equal(state.steps, 16);
    assert.equal(state.collected.length, 3);
  }
});
