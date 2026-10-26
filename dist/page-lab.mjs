const titleText = "document.querySelector('#lab-title').textContent = '星际实验室';";
const titleColor = "document.querySelector('#lab-title').style.color = '#f6c65c';";
const wallColor = "document.body.style.backgroundColor = '#142b3b';";
const accentColor = "document.documentElement.style.setProperty('--lab-accent', '#8bb8ff');";
const beaconOn = "document.querySelector('#lab-beacon').classList.add('on');";
const posterText = "document.querySelector('#lab-poster').textContent = '探索，从这一行代码开始。';";

export const PAGE_LEVELS = [
  {
    id: 1, name: '命名实验室', title: '把代码写进真实网页', concept: '选择元素与文字赋值',
    stage: '认识网页', difficulty: 1, newSkill: 'querySelector 与 textContent', suggestedMinutes: 3,
    objective: '把网页顶部 #lab-title 的名字改成「星际实验室」。',
    starters: {js: "// 选择顶部标题，修改引号中的文字\ndocument.querySelector('#lab-title').textContent = '我的实验室';"},
    solutions: {js: titleText},
    hints: ['#lab-title 是网页顶部实验室名称。', 'querySelector 选择元素，textContent 保存它的文字。', '将等号右侧的文字改成「星际实验室」，保留引号和分号。'],
    explanation: {js: 'document 代表当前网页。querySelector 根据选择器找到元素，textContent 的赋值会立即改写这个真实元素的文字。'},
    checks: [{label: '#lab-title 的文字是「星际实验室」', op: 'text', target: '#lab-title', value: '星际实验室'}],
  },
  {
    id: 2, name: '标题染色', title: '给顶部标题涂上金色', concept: '元素的行内样式',
    stage: '认识网页', difficulty: 1, newSkill: 'style.color', suggestedMinutes: 3,
    objective: '把 #lab-title 的文字颜色设为 #f6c65c。',
    starters: {js: "// style.color 控制文字颜色\ndocument.querySelector('#lab-title').style.color = '#ffffff';"},
    solutions: {js: titleColor},
    hints: ['目标仍是顶部的 #lab-title。', '这次修改 style.color，文字内容无需改变。', '将颜色字符串改为 #f6c65c。'],
    explanation: {js: 'style.color 改变元素的文字颜色。#f6c65c 是十六进制颜色；这个实验接受三位或六位的十六进制颜色。'},
    checks: [{label: '#lab-title 的文字颜色是 #f6c65c', op: 'style', target: '#lab-title', property: 'color', value: '#f6c65c'}],
  },
  {
    id: 3, name: '整页换装', title: '改变实验室的墙面', concept: '网页主体与背景色',
    stage: '布置空间', difficulty: 2, newSkill: 'document.body.style.backgroundColor', suggestedMinutes: 3,
    objective: '把整页 document.body 的背景色设为 #142b3b。',
    starters: {js: "// body 是整页的主体\ndocument.body.style.backgroundColor = '#24384a';"},
    solutions: {js: wallColor},
    hints: ['document.body 指向整张网页的主体。', '背景色属性写作 backgroundColor，C 要大写。', '将背景色字符串改为 #142b3b。'],
    explanation: {js: 'document.body 直接取得网页主体。给它的 style.backgroundColor 赋值，整页可见的墙面就会换色。'},
    checks: [{label: 'document.body 的背景色是 #142b3b', op: 'style', target: 'body', property: 'backgroundColor', value: '#142b3b'}],
  },
  {
    id: 4, name: '主题联动', title: '用一个变量更换实验室强调色', concept: 'CSS 自定义属性',
    stage: '布置空间', difficulty: 2, newSkill: 'style.setProperty', suggestedMinutes: 4,
    objective: '把 document.documentElement 上的 --lab-accent 设为 #8bb8ff，观察整页强调色联动。',
    starters: {js: "// 根元素上的主题变量会被多个区域使用\ndocument.documentElement.style.setProperty('--lab-accent', '#f6c65c');"},
    solutions: {js: accentColor},
    hints: ['document.documentElement 是网页的根元素。', 'setProperty 的两个参数依次是变量名和颜色。', '保留 --lab-accent，将第二个参数改为 #8bb8ff。'],
    explanation: {js: 'CSS 自定义属性用 -- 开头。setProperty(变量名, 值) 设置根元素的主题变量，让使用它的网页区域同步变化。'},
    checks: [{label: 'document.documentElement 的 --lab-accent 是 #8bb8ff', op: 'css-variable', target: 'root', property: '--lab-accent', value: '#8bb8ff'}],
  },
  {
    id: 5, name: '信号灯上线', title: '给实验室亮起一盏灯', concept: '类名控制状态',
    stage: '控制状态', difficulty: 3, newSkill: 'classList.add / remove', suggestedMinutes: 4,
    objective: '给 #lab-beacon 添加 on 类名，让真实网页的实验室信号灯亮起。',
    starters: {js: "// on 类名控制灯光状态\ndocument.querySelector('#lab-beacon').classList.remove('on');"},
    solutions: {js: beaconOn},
    hints: ['#lab-beacon 是网页上的实验室信号灯。', 'classList.add 添加类名，classList.remove 移除类名。', "将 remove 改为 add，并保留参数 'on'。"],
    explanation: {js: '类名让 JavaScript 控制状态、CSS 负责外观。classList.add(\'on\') 点亮信号灯，remove(\'on\') 可以熄灭它。'},
    checks: [{label: '#lab-beacon 包含 on 类名，信号灯已亮', op: 'class', target: '#lab-beacon', action: 'add', value: 'on'}],
  },
  {
    id: 6, name: '实验室总装', title: '组合已经学会的网页操作', concept: '文字、样式、主题与状态组合',
    stage: '综合应用', difficulty: 4, newSkill: '组合前五关的操作', suggestedMinutes: 6,
    objective: '把标题改为「星际实验室」、文字设为金色、墙面设为深蓝、主题设为浅蓝，点亮信号灯，并把 #lab-poster 标语改为「探索，从这一行代码开始。」。',
    starters: {js: '// 综合前五关的操作：标题、标题颜色、墙面、主题、信号灯、#lab-poster 标语\n' + titleText},
    solutions: {js: [titleText, titleColor, wallColor, accentColor, beaconOn, posterText].join('\n')},
    hints: ['每条语句按书写顺序改变真实网页，每条语句末尾写分号。', '颜色依次为 #f6c65c、#142b3b、#8bb8ff。', '完成标题、墙面、主题与信号灯后，用 querySelector 选择 #lab-poster，再用 textContent 把墙面标语改为「探索，从这一行代码开始。」。'],
    explanation: {js: '一次运行可以组合多个已学过的 DOM 操作。下一关或重置时会恢复网页基准外观，可以放心重新实验。'},
    checks: [],
  },
];
PAGE_LEVELS[5].checks = [
  ...PAGE_LEVELS.slice(0, 5).flatMap(level => level.checks.map(check => ({...check}))),
  {label: '#lab-poster 的标语是「探索，从这一行代码开始。」', op: 'text', target: '#lab-poster', value: '探索，从这一行代码开始。'},
];

const fail = (line, message) => { throw new Error(`第 ${line} 行：${message}`); };
const colorPattern = /^#[\da-f]{3}(?:[\da-f]{3})?$/i;

function validateCommand(command) {
  const {op, target, property, value, action, line = 1} = command;
  if (typeof value !== 'string') fail(line, '参数必须使用引号包住的文字。');
  if (op === 'text' && ['#lab-title', '#lab-poster'].includes(target)) {
    if ([...value].length > 80) fail(line, '文字最多 80 个字符。');
    return;
  }
  if (op === 'style' && ((target === '#lab-title' && property === 'color') || (['body', '.topbar'].includes(target) && property === 'backgroundColor'))) {
    if (!colorPattern.test(value)) fail(line, '颜色只支持三位或六位十六进制颜色，例如 #8bb8ff。');
    return;
  }
  if (op === 'css-variable' && target === 'root' && property === '--lab-accent') {
    if (!colorPattern.test(value)) fail(line, '主题色只支持三位或六位十六进制颜色。');
    return;
  }
  if (op === 'class' && target === '#lab-beacon' && value === 'on' && ['add', 'remove'].includes(action)) return;
  fail(line, '暂不支持这个目标、属性或操作。请使用任务中的 DOM 示例。');
}

function tokenize(code) {
  const tokens = [];
  let index = 0, line = 1;
  while (index < code.length) {
    const char = code[index];
    if (/\s/.test(char)) { if (char === '\r' || (char === '\n' && code[index - 1] !== '\r')) line++; index++; continue; }
    if (code.startsWith('//', index)) { while (index < code.length && !['\n', '\r'].includes(code[index])) index++; continue; }
    if (char === "'" || char === '"') {
      const startLine = line, quote = char;
      let value = '', closed = false;
      index++;
      while (index < code.length) {
        const next = code[index++];
        if (next === quote) { closed = true; break; }
        if (next === '\n' || next === '\r') fail(line, '字符串不能直接换行，请使用 \\n。');
        if (next !== '\\') { value += next; continue; }
        const escaped = code[index++];
        const escapes = {n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '\\': '\\', "'": "'", '"': '"'};
        if (Object.hasOwn(escapes, escaped)) value += escapes[escaped];
        else if (escaped === 'x' || escaped === 'u') {
          const length = escaped === 'x' ? 2 : 4;
          const hex = code.slice(index, index + length);
          if (!new RegExp(`^[\\da-fA-F]{${length}}$`).test(hex)) fail(line, '字符串转义格式不正确。');
          value += String.fromCharCode(parseInt(hex, 16)); index += length;
        } else fail(line, '暂不支持这个字符串转义。');
      }
      if (!closed) fail(startLine, '字符串缺少结束引号。');
      tokens.push({value, kind: 'string', line: startLine}); continue;
    }
    const name = /^[A-Za-z_$][\w$]*/.exec(code.slice(index));
    if (name) { tokens.push({value: name[0], kind: 'name', line}); index += name[0].length; continue; }
    if ('.()=;,'.includes(char)) { tokens.push({value: char, kind: 'symbol', line}); index++; continue; }
    fail(line, `暂不支持符号「${char}」。请使用任务中的 DOM 示例。`);
  }
  return tokens;
}

export function compilePageCode(code) {
  if (typeof code !== 'string') throw new Error('代码必须是文字。');
  if (code.length > 12000) throw new Error('代码最多 12000 个字符。');
  const tokens = tokenize(code), commands = [];
  let index = 0;
  const take = value => {
    const token = tokens[index];
    if (!token || token.value !== value || token.kind === 'string') fail(token?.line ?? tokens.at(-1)?.line ?? 1, `这里需要 ${value}。每条语句以分号 ; 结束。`);
    index++; return token;
  };
  const string = () => {
    const token = tokens[index];
    if (token?.kind !== 'string') fail(token?.line ?? tokens.at(-1)?.line ?? 1, '参数必须是单引号或双引号包住的文字。');
    index++; return token.value;
  };
  while (index < tokens.length) {
    const line = tokens[index].line;
    take('document'); take('.');
    let target;
    if (tokens[index]?.value === 'querySelector') {
      take('querySelector'); take('('); target = string(); take(')');
      if (!['#lab-title', '#lab-poster', '#lab-beacon', '.topbar'].includes(target)) fail(line, '暂不支持这个选择器。请使用任务中的目标。');
    }
    else if (tokens[index]?.value === 'body') { take('body'); target = 'body'; }
    else { take('documentElement'); target = 'root'; }
    take('.');
    let command;
    if (tokens[index]?.value === 'textContent') { take('textContent'); take('='); command = {op: 'text', target, value: string(), line}; }
    else if (tokens[index]?.value === 'style') {
      take('style'); take('.');
      if (tokens[index]?.value === 'setProperty') {
        take('setProperty'); take('('); const property = string(); take(','); const value = string(); take(')');
        command = {op: 'css-variable', target, property, value, line};
      } else {
        const property = tokens[index]?.value;
        if (!['color', 'backgroundColor'].includes(property)) fail(tokens[index]?.line ?? line, '暂不支持这个样式属性。');
        take(property); take('='); command = {op: 'style', target, property, value: string(), line};
      }
    } else {
      take('classList'); take('.'); const action = tokens[index]?.value;
      if (!['add', 'remove'].includes(action)) fail(tokens[index]?.line ?? line, '类名只支持 add 或 remove。');
      take(action); take('('); const value = string(); take(')'); command = {op: 'class', target, action, value, line};
    }
    take(';'); validateCommand(command); commands.push(command);
    if (commands.length > 64) fail(line, '一次最多执行 64 条网页操作。');
  }
  return commands;
}

function getTarget(document, target) {
  const element = target === 'body' ? document.body : target === 'root' ? document.documentElement : document.querySelector(target);
  if (!element) throw new Error(`找不到网页目标 ${target}，请刷新页面。`);
  return element;
}

export function applyPageCommand(command, document) {
  validateCommand(command);
  const element = getTarget(document, command.target);
  if (command.op === 'text') element.textContent = command.value;
  else if (command.op === 'style') element.style[command.property] = command.value;
  else if (command.op === 'css-variable') element.style.setProperty(command.property, command.value);
  else element.classList[command.action](command.value);
  const operation = command.op === 'class' ? `classList.${command.action}('${command.value}')` : `${command.property ?? 'textContent'} = ${command.value}`;
  return `第 ${command.line} 行 · ${command.target}：${operation}`;
}

function normalizedColor(value) {
  const text = value.trim().toLowerCase();
  if (/^#[\da-f]{3}$/.test(text)) return '#' + [...text.slice(1)].map(char => char + char).join('');
  const rgb = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(text);
  return rgb ? '#' + rgb.slice(1).map(number => Number(number).toString(16).padStart(2, '0')).join('') : text;
}

export function checkPageGoals(level, document) {
  return level.checks.map(check => {
    const element = getTarget(document, check.target);
    let passed;
    if (check.op === 'text') passed = element.textContent === check.value;
    else if (check.op === 'class') passed = element.classList.contains(check.value) === (check.action === 'add');
    else {
      const actual = check.op === 'css-variable' ? element.style.getPropertyValue(check.property) : element.style[check.property];
      passed = normalizedColor(actual) === normalizedColor(check.value);
    }
    return {label: check.label, passed};
  });
}

export function createPageSnapshot(document) {
  const title = getTarget(document, '#lab-title'), poster = getTarget(document, '#lab-poster'), beacon = getTarget(document, '#lab-beacon');
  const titleMarkup = title.innerHTML, posterText = poster.textContent, lightOn = beacon.classList.contains('on');
  const styles = [['#lab-title', 'color'], ['body', 'background-color'], ['.topbar', 'background-color'], ['root', '--lab-accent']].map(([target, property]) => {
    const style = getTarget(document, target).style;
    return {style, property, value: style.getPropertyValue(property), priority: style.getPropertyPriority(property)};
  });
  return {restore() {
    title.innerHTML = titleMarkup; poster.textContent = posterText;
    for (const {style, property, value, priority} of styles) {
      if (value) style.setProperty(property, value, priority);
      else style.removeProperty(property);
    }
    if (lightOn) beacon.classList.add('on'); else beacon.classList.remove('on');
  }};
}
