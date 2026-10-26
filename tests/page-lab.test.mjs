import test from 'node:test';
import assert from 'node:assert/strict';
import {BODY_CLASSES, PAGE_LEVELS, compilePageCode, applyPageCommand, checkPageGoals, createPageSnapshot} from '../dist/page-lab.mjs';

function fixture() {
  function element(text = '') {
    const values = new Map(), priorities = new Map(), classes = new Set(['existing']);
    const style = new Proxy({
      getPropertyValue: name => values.get(name) ?? '',
      getPropertyPriority: name => priorities.get(name) ?? '',
      setProperty(name, value, priority = '') { values.set(name, value); priorities.set(name, priority); },
      removeProperty(name) { values.delete(name); priorities.delete(name); },
    }, {
      get(object, property) { return property in object ? object[property] : values.get(property.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase())) ?? ''; },
      set(object, property, value) { object.setProperty(property.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase()), value); return true; },
    });
    let markup = text, content = text;
    return {style, classList: {add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name)},
      get innerHTML() { return markup; }, set innerHTML(value) { markup = value; content = value.replace(/<[^>]+>/g, ''); },
      get textContent() { return content; }, set textContent(value) { content = value; markup = value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); },
    };
  }
  const targets = new Map([['#lab-title', element('实验室')], ['#lab-beacon', element()], ['.topbar', element()]]);
  return {body: element(), documentElement: element(), querySelector: selector => targets.get(selector) ?? null};
}

for (const level of PAGE_LEVELS) {
  test(`web level ${level.id}: starter parses and reference solution passes`, () => {
    assert.doesNotThrow(() => compilePageCode(level.starters.js));
    const document = fixture();
    for (const command of compilePageCode(level.setupCode ?? '')) applyPageCommand(command, document);
    assert.ok(checkPageGoals(level, document).some(check => !check.passed), 'lesson needs an unfinished goal after setup');
    for (const command of compilePageCode(level.starters.js)) applyPageCommand(command, document);
    assert.ok(checkPageGoals(level, document).some(check => !check.passed), 'starter leaves work for the learner');
    for (const command of compilePageCode(level.solutions.js)) assert.match(applyPageCommand(command, document), /第 \d+ 行/);
    assert.ok(checkPageGoals(level, document).every(check => check.passed));
    assert.equal(level.hints.length, 3);
    assert.ok(level.checks.length > 0);
    for (const key of ['name', 'title', 'concept', 'stage', 'newSkill', 'objective']) assert.equal(typeof level[key], 'string');
    assert.ok(Number.isInteger(level.difficulty) && level.difficulty >= 1 && level.difficulty <= 5);
    assert.ok(level.suggestedMinutes > 0);
  });
}

test('web curriculum has stable IDs and its final lesson covers the first five operations', () => {
  assert.deepEqual(PAGE_LEVELS.map(level => level.id), [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 6]);
  assert.deepEqual(PAGE_LEVELS.slice(0, 5).map(level => level.difficulty), [1, 1, 2, 2, 3]);
  assert.ok(PAGE_LEVELS.every((level, index) => index === 0 || level.difficulty >= PAGE_LEVELS[index - 1].difficulty));
  assert.deepEqual(PAGE_LEVELS.at(-1).checks, PAGE_LEVELS.slice(0, 5).flatMap(level => level.checks));
  assert.ok(checkPageGoals(PAGE_LEVELS.at(-1), fixture()).every(check => !check.passed));
  assert.equal(PAGE_LEVELS.at(-1).difficulty, 5);
});

test('quoted semicolons, comment markers, escapes, and source lines parse accurately', () => {
  const commands = compilePageCode('// first\n\ndocument.querySelector("#lab-title").textContent = "Hi; // \\"quote\\" \\\\ \\n \\u661f \\x41"; // tail\ndocument.querySelector(\'#lab-beacon\').classList.remove(\'on\');');
  assert.equal(commands[0].value, 'Hi; // "quote" \\ \n 星 A');
  assert.equal(commands[0].line, 3);
  assert.equal(commands[1].line, 4);
  assert.equal(compilePageCode('// hello\r\ndocument.body.style.backgroundColor = \'#abc\';')[0].line, 2);
  assert.equal(compilePageCode('// hello\rdocument.body.style.backgroundColor = \'#abc\';')[0].line, 2);
  assert.throws(() => compilePageCode("// hi\n\ndocument.querySelector('#lab-title').innerHTML = 'bad';"), /第 3 行/);
});

test('unsupported APIs, selectors, unsafe values, and incomplete statements are rejected', () => {
  for (const code of [
    "alert('x');", "eval('x');", "Function('x')();", "document.constructor('x');",
    "document.querySelector('#lab-title').innerHTML = '<img src=x onerror=alert(1)>';",
    "document.querySelector('body').style.backgroundColor = '#fff';",
    "document.querySelector('#lab-title, body').textContent = 'x';",
    "document.querySelector('#lab-title').style.backgroundImage = 'url(x)';",
    "document.body.style.backgroundColor = 'red';",
    "document.body.style.backgroundColor = '#1234';",
    "document.body.style.backgroundColor = '#fff;display:none';",
    "document.querySelector('.topbar').style.color = '#fff';",
    "document.documentElement.style.setProperty('--other', '#fff');",
    "document.querySelector('#lab-beacon').classList.add('hidden');",
    "document.querySelector('#lab-beacon').classList.add('starfield');",
    "document.querySelector('.topbar').classList.add('starfield');",
    "document.documentElement.classList.add('starfield');",
    "document.body.classList.add('on');",
    "document.body.classList.add('mode-web');",
    "document.body.classList.add('unknown-effect');",
    "document.body.classList.add('starfield dance-mode');",
    "document.body.classList.add('starfield', 'dance-mode');",
    "document.body.classList.toggle('starfield');",
    "document.querySelector('#lab-title').classList.add('on');",
    "document.querySelector('#lab-beacon').classList.toggle('on');",
    "document.querySelector('#lab-title').textContent = document.body;",
    "document.querySelector('#lab-title')['textContent'] = 'x';",
    "document.querySelector('#lab-title').textContent = 'x'",
    "document.querySelector('#lab-title').textContent = 'x';/* comment */",
    "document.querySelector('#lab-title').textContent = 'unterminated;",
    "document.querySelector('#lab-title').textContent = 'bad\\q';",
    "document.querySelector('#lab-title').textContent = 'bad\\u000';",
    "document.querySelector('#lab-title').textContent = 'bad\nnewline';",
  ]) assert.throws(() => compilePageCode(code), Error, code);
  assert.throws(() => compilePageCode(' '.repeat(12001)), /12000/);
  assert.throws(() => compilePageCode("document.querySelector('#lab-title').textContent = '" + '星'.repeat(81) + "';"), /80/);
  assert.equal(compilePageCode("document.querySelector('#lab-title').textContent = '" + '🛰'.repeat(80) + "';")[0].value, '🛰'.repeat(80));
  const statement = "document.body.style.backgroundColor = '#abc';";
  assert.equal(compilePageCode(statement.repeat(64)).length, 64);
  assert.throws(() => compilePageCode(statement.repeat(65)), /64/);
  assert.throws(() => compilePageCode(null), /文字/);
});

test('compilation rejects the whole input before any page effects and application also validates', () => {
  const document = fixture(), original = document.querySelector('#lab-title').textContent;
  assert.throws(() => {
    const commands = compilePageCode("document.querySelector('#lab-title').textContent = '已改变'; alert('bad');");
    for (const command of commands) applyPageCommand(command, document);
  });
  assert.equal(document.querySelector('#lab-title').textContent, original);
  assert.throws(() => applyPageCommand({op: 'style', target: 'body', property: 'backgroundImage', value: 'url(x)', line: 9}, document), /第 9 行/);
  assert.throws(() => applyPageCommand({op: 'class', target: '#lab-beacon', action: '__proto__', value: 'on'}, document));
  assert.throws(() => applyPageCommand({op: 'text', target: '#other', value: 'x'}, document));
  assert.throws(() => applyPageCommand({op: 'text', target: '#lab-title', value: 'x'}, {querySelector: () => null}), /找不到/);
});

test('text assignment displays markup literally and color checks accept browser RGB serialization', () => {
  const document = fixture();
  applyPageCommand(compilePageCode("document.querySelector('#lab-title').textContent = '<img src=x>';" )[0], document);
  assert.equal(document.querySelector('#lab-title').textContent, '<img src=x>');
  assert.equal(document.querySelector('#lab-title').innerHTML, '&lt;img src=x&gt;');
  document.querySelector('#lab-title').style.color = 'rgb(246, 198, 92)';
  assert.equal(checkPageGoals(PAGE_LEVELS[1], document)[0].passed, true);
  document.querySelector('#lab-title').style.color = '#abc';
  assert.equal(checkPageGoals({checks: [{label: 'short', op: 'style', target: '#lab-title', property: 'color', value: '#aabbcc'}]}, document)[0].passed, true);
});

test('snapshot restores only owned text, styles, CSS variable, and class memberships', () => {
  const document = fixture(), title = document.querySelector('#lab-title'), beacon = document.querySelector('#lab-beacon');
  title.innerHTML = '<span>原始</span>实验室';
  title.style.setProperty('color', '#fff', 'important');
  document.body.style.backgroundColor = '#123456';
  document.documentElement.style.setProperty('--lab-accent', '#abc');
  const snapshot = createPageSnapshot(document);
  for (const command of compilePageCode(PAGE_LEVELS.at(-1).solutions.js + "\ndocument.querySelector('.topbar').style.backgroundColor = '#456';")) applyPageCommand(command, document);
  for (const name of BODY_CLASSES) document.body.classList.add(name);
  title.style.setProperty('font-size', '44px');
  beacon.classList.add('unrelated');
  document.body.classList.add('mode-web');
  snapshot.restore();
  assert.equal(title.innerHTML, '<span>原始</span>实验室');
  assert.equal(title.style.color, '#fff');
  assert.equal(title.style.getPropertyPriority('color'), 'important');
  assert.equal(title.style.getPropertyValue('font-size'), '44px');
  assert.equal(document.body.style.backgroundColor, '#123456');
  assert.equal(document.querySelector('.topbar').style.backgroundColor, '');
  assert.equal(document.documentElement.style.getPropertyValue('--lab-accent'), '#abc');
  assert.equal(beacon.classList.contains('on'), false);
  assert.equal(beacon.classList.contains('unrelated'), true);
  assert.equal(beacon.classList.contains('existing'), true);
  assert.ok(BODY_CLASSES.every(name => !document.body.classList.contains(name)));
  assert.equal(document.body.classList.contains('existing'), true);
  assert.equal(document.body.classList.contains('mode-web'), true);
  title.textContent = '再次变化'; snapshot.restore();
  assert.equal(title.innerHTML, '<span>原始</span>实验室');
  beacon.classList.add('on');
  const litSnapshot = createPageSnapshot(document);
  beacon.classList.remove('on'); litSnapshot.restore();
  assert.equal(beacon.classList.contains('on'), true);
});

test('body class whitelist supports adding and removing every effect on body only', () => {
  assert.deepEqual(BODY_CLASSES, ['starfield', 'blueprint', 'hologram', 'zero-gravity', 'dance-mode', 'scan-mode', 'mirror-world', 'night-shift', 'party-mode']);
  const document = fixture();
  for (const name of BODY_CLASSES) {
    applyPageCommand(compilePageCode(`document.body.classList.add('${name}');`)[0], document);
    assert.equal(document.body.classList.contains(name), true);
    applyPageCommand(compilePageCode(`document.body.classList.remove('${name}');`)[0], document);
    assert.equal(document.body.classList.contains(name), false);
    assert.throws(() => applyPageCommand({op: 'class', target: '#lab-beacon', action: 'add', value: name}, document));
  }
  assert.throws(() => applyPageCommand({op: 'class', target: 'body', action: '__proto__', value: 'starfield'}, document));
  assert.throws(() => applyPageCommand({op: 'class', target: 'body', action: 'add', value: 'mode-web'}, document));
});

test('snapshot restores original effect membership while preserving unrelated body classes', () => {
  const document = fixture();
  document.body.classList.add('starfield');
  document.body.classList.add('mode-web');
  const snapshot = createPageSnapshot(document);
  for (const name of BODY_CLASSES) document.body.classList.add(name);
  document.body.classList.remove('starfield');
  document.body.classList.add('new-unrelated');
  snapshot.restore();
  assert.equal(document.body.classList.contains('starfield'), true);
  assert.ok(BODY_CLASSES.filter(name => name !== 'starfield').every(name => !document.body.classList.contains(name)));
  assert.equal(document.body.classList.contains('mode-web'), true);
  assert.equal(document.body.classList.contains('new-unrelated'), true);
});

test('party removal lesson starts active and can be reset and solved repeatedly', () => {
  const document = fixture(), snapshot = createPageSnapshot(document), level = PAGE_LEVELS.find(item => item.id === 17);
  for (let run = 0; run < 2; run++) {
    snapshot.restore();
    for (const command of compilePageCode(level.setupCode)) applyPageCommand(command, document);
    assert.ok(checkPageGoals(level, document).every(check => !check.passed));
    for (const command of compilePageCode(level.solutions.js)) applyPageCommand(command, document);
    assert.ok(checkPageGoals(level, document).every(check => check.passed));
  }
});

test('all effect solutions restore to baseline without needing removed page elements', () => {
  const document = fixture(), snapshot = createPageSnapshot(document);
  document.body.classList.add('mode-web');
  for (const level of PAGE_LEVELS) {
    for (const command of compilePageCode(level.setupCode ?? '')) applyPageCommand(command, document);
    for (const command of compilePageCode(level.solutions.js)) applyPageCommand(command, document);
    snapshot.restore();
    assert.ok(BODY_CLASSES.every(name => !document.body.classList.contains(name)), level.name);
    assert.equal(document.body.classList.contains('mode-web'), true);
    assert.equal(document.querySelector('#lab-title').textContent, '实验室');
    assert.equal(document.querySelector('#lab-beacon').classList.contains('on'), false);
  }
});
