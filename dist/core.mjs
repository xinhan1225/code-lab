const MAX_COMMANDS = 256;
const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const fail = (message, line = 1) => { throw new Error(`第 ${line} 行：${message}`); };

// Parse only the documented teaching language. User code never reaches eval/Function.
export function compile(code, language) {
  if (language !== 'js' && language !== 'rust') fail('请选择 JavaScript 或 Rust。');
  if (typeof code !== 'string') fail('代码必须是文本。');
  if (code.length > 12000) fail('代码不能超过 12000 个字符。');
  const tokens = [];
  let offset = 0, line = 1;
  while (offset < code.length) {
    const tail = code.slice(offset);
    const whitespace = /^\s+/.exec(tail);
    if (whitespace) {
      line += (whitespace[0].match(/\n/g) || []).length;
      offset += whitespace[0].length;
      continue;
    }
    const comment = /^\/\/[^\n]*/.exec(tail);
    if (comment) { offset += comment[0].length; continue; }
    const token = /^(?:[A-Za-z_][A-Za-z_0-9]*|[0-9]+|\+\+|\.\.|[(){};:=<\-])/.exec(tail);
    if (!token) fail(`暂不支持字符“${tail[0]}”。请使用课程列出的语法。`, line);
    tokens.push({value: token[0], line});
    offset += token[0].length;
  }
  tokens.push({value: '<结束>', line});
  let at = 0;
  const peek = () => tokens[at];
  const take = value => {
    const token = peek();
    if (token.value !== value) fail(`需要“${value}”，这里是“${token.value}”。`, token.line);
    at++;
    return token;
  };
  const identifier = () => {
    const token = peek();
    if (!/^[A-Za-z_][A-Za-z_0-9]*$/.test(token.value)) fail('需要变量名称。', token.line);
    if (['let', 'mut', 'for', 'if', 'else', 'fn', 'in', 'main', 'forward', 'turnLeft', 'turnRight', 'pathAhead', 'turn_left', 'turn_right', 'path_ahead', 'const', 'var', 'return', 'while', 'class', 'function', 'new', 'true', 'false', 'null', 'undefined', 'break', 'continue', 'switch', 'case', 'default', 'throw', 'try', 'catch', 'finally', 'import', 'export', 'await', 'async', 'yield', 'delete', 'typeof', 'instanceof', 'void', 'do', 'this', 'super', 'extends', 'with', 'debugger', 'enum', 'struct', 'impl', 'trait', 'pub', 'use', 'mod', 'match', 'loop', 'move', 'ref', 'self', 'Self', 'static', 'type', 'unsafe', 'where', 'as', 'crate', 'dyn', 'extern', 'union'].includes(token.value)) fail('这个名称是保留字，请换一个变量名称。', token.line);
    at++;
    return token.value;
  };
  const expression = () => {
    const token = peek();
    let sign = 1;
    if (token.value === '-') { take('-'); sign = -1; }
    if (/^[0-9]+$/.test(peek().value)) {
      const number = sign * Number(peek().value);
      at++;
      if (!Number.isSafeInteger(number)) fail('整数超出安全范围。', token.line);
      return {number, line: token.line};
    }
    if (sign < 0) fail('负号后需要整数。', token.line);
    return {name: identifier(), line: token.line};
  };
  const commandNames = language === 'js'
    ? {forward: 'forward', turnLeft: 'left', turnRight: 'right'}
    : {forward: 'forward', turn_left: 'left', turn_right: 'right'};
  const sensor = language === 'js' ? 'pathAhead' : 'path_ahead';
  function block(depth) {
    if (depth > 32) fail('代码嵌套不能超过 32 层。', peek().line);
    take('{');
    const statements = sequence(depth);
    take('}');
    return statements;
  }
  function sequence(depth = 0) {
    const body = [];
    while (!['}', '<结束>'].includes(peek().value)) {
      const token = peek();
      const name = token.value;
      if (name === ';') { at++; continue; }
      if (Object.hasOwn(commandNames, name)) {
        at++; take('('); take(')'); take(';');
        body.push({op: commandNames[name], line: token.line});
      } else if (name === 'let') {
        at++;
        if (language === 'rust' && peek().value === 'mut') at++;
        const variable = identifier();
        let type;
        if (language === 'rust' && peek().value === ':') {
          at++;
          if (!['i32', 'usize'].includes(peek().value)) fail('本课程支持 i32 或 usize 类型。', peek().line);
          type = peek().value; at++;
        }
        take('=');
        const value = expression();
        if (!('number' in value)) fail('变量声明需要一个整数，例如 let distance = 3。', value.line);
        if (language === 'rust' && (value.number < (type === 'usize' ? 0 : -2147483648) || value.number > (type === 'usize' ? 4294967295 : 2147483647))) fail('数值超出本课程 Rust 整数类型的范围。', value.line);
        take(';');
        body.push({op: 'let', name: variable, value, line: token.line});
      } else if (name === 'for') {
        at++;
        let variable, count;
        if (language === 'js') {
          take('('); take('let'); variable = identifier(); take('='); take('0'); take(';');
          take(variable); take('<'); count = expression(); take(';'); take(variable); take('++'); take(')');
        } else {
          take('_'); take('in'); take('0'); take('..'); count = expression();
        }
        body.push({op: 'for', name: variable, count, body: block(depth + 1), line: token.line});
      } else if (name === 'if') {
        at++;
        if (language === 'js') take('(');
        take(sensor); take('('); take(')');
        if (language === 'js') take(')');
        const then = block(depth + 1);
        let otherwise = [];
        if (peek().value === 'else') { at++; otherwise = block(depth + 1); }
        body.push({op: 'if', line: token.line, then, else: otherwise});
      } else {
        fail(`暂不支持“${name}”。可使用移动函数、整数变量、for 和 if。`, token.line);
      }
    }
    return body;
  }
  let ast;
  if (language === 'rust') {
    if (peek().value !== 'fn') fail('Rust 代码需要 fn main() { ... } 入口函数。', peek().line);
    take('fn'); take('main'); take('('); take(')'); ast = block(0);
  } else ast = sequence();
  take('<结束>');
  const uninitialized = Symbol('uninitialized');
  function resolve(value, scope) {
    if ('number' in value) return value.number;
    if (!Object.hasOwn(scope, value.name)) fail(`变量“${value.name}”尚未声明。`, value.line);
    if (scope[value.name] === uninitialized) fail(`变量“${value.name}”尚未初始化，请在声明后使用。`, value.line);
    return scope[value.name];
  }
  let work = 0;
  function lower(body, outer) {
    const scope = Object.assign(Object.create(null), outer);
    const declarations = new Set();
    if (language === 'js') {
      for (const node of body) {
        if (node.op !== 'let') continue;
        if (declarations.has(node.name)) fail(`变量“${node.name}”在这个代码块中重复声明。`, node.line);
        declarations.add(node.name);
        scope[node.name] = uninitialized;
      }
    }
    const result = [];
    let cost = 0;
    const append = (command, weight = 1) => {
      cost += weight;
      if (cost > MAX_COMMANDS) fail('执行指令最多 256 条，请缩短循环。', command.line);
      result.push(command);
    };
    for (const node of body) {
      if (++work > 8192) fail('代码展开过多，请减少嵌套循环。', node.line);
      if (node.op === 'let') {
        scope[node.name] = resolve(node.value, scope);
      }
      else if (node.op === 'for') {
        const loopScope = Object.assign(Object.create(null), scope);
        if (node.name) loopScope[node.name] = 0;
        const count = resolve(node.count, loopScope);
        if (count < 0 || count > MAX_COMMANDS) fail('循环次数必须在 0 到 256 之间。', node.line);
        for (let index = 0; index < count; index++) {
          if (++work > 8192) fail('代码展开过多，请减少嵌套循环。', node.line);
          const local = Object.assign(Object.create(null), scope);
          if (node.name) local[node.name] = index;
          const lowered = lower(node.body, local);
          for (const command of lowered.commands) append(command, commandCost(command));
        }
      } else if (node.op === 'if') {
        const yes = lower(node.then, scope), no = lower(node.else, scope);
        append({op: 'if', line: node.line, then: yes.commands, else: no.commands}, 1 + Math.max(yes.cost, no.cost));
      } else append({...node});
    }
    return {commands: result, cost};
  }
  function commandCost(command) {
    return command.op === 'if' ? 1 + Math.max(command.then.reduce((n, c) => n + commandCost(c), 0), command.else.reduce((n, c) => n + commandCost(c), 0)) : 1;
  }
  return lower(ast, {}).commands;
}

const infoCache = new WeakMap();
export function getLevelInfo(level) {
  if (infoCache.has(level)) return infoCache.get(level);
  const height = level.rows.length, width = level.rows[0]?.length;
  if (!width || width > 7 || !height || height > 7 || level.rows.some(row => row.length !== width || /[^#.SBE]/.test(row))) throw new Error('关卡地图必须是最多 7×7 的矩形。');
  let start, exit, wallsLo = 0, wallsHi = 0;
  const batteries = [];
  level.rows.forEach((row, y) => [...row].forEach((cell, x) => {
    if (cell === 'S') { if (start) throw new Error('关卡只能有一个起点。'); start = {x, y}; }
    if (cell === 'E') { if (exit) throw new Error('关卡只能有一个出口。'); exit = {x, y}; }
    if (cell === 'B') batteries.push({x, y});
    if (cell === '#') {
      const index = y * width + x;
      if (index < 32) wallsLo = (wallsLo | (1 << index)) >>> 0;
      else wallsHi = (wallsHi | (1 << (index - 32))) >>> 0;
    }
  }));
  if (!start || !exit || !Number.isInteger(level.startDir) || level.startDir < 0 || level.startDir > 3) throw new Error('关卡缺少起点、出口或有效朝向。');
  const info = {width, height, start, exit, batteries, wallsLo, wallsHi};
  infoCache.set(level, info);
  return info;
}

const fallbackRules = {
  next_position(x, y, dir, width, height, lo, hi) {
    const [dx, dy] = directions[dir];
    const nx = x + dx, ny = y + dy, index = ny * width + nx;
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) return -1;
    if ((index < 32 ? lo >>> index : hi >>> (index - 32)) & 1) return -1;
    return index;
  },
  rotate: (dir, delta) => (dir + delta + 4) % 4,
  goal: (atExit, collected, total) => Number(Boolean(atExit) && collected === total),
};
let rules = fallbackRules;
// Attach the compiled Rust WebAssembly exports; omit the argument to restore JS rules.
export function attachRules(exports) {
  if (exports === undefined) { rules = fallbackRules; return; }
  if (!['next_position', 'rotate', 'goal'].every(name => typeof exports?.[name] === 'function')) throw new Error('规则模块缺少 next_position、rotate 或 goal。');
  rules = exports;
}

export function createState(level) {
  const {start} = getLevelInfo(level);
  return {x: start.x, y: start.y, dir: level.startDir, collected: [], steps: 0, moves: 0, won: false, status: 'ready', error: null};
}
function nextPosition(level, state) {
  const info = getLevelInfo(level);
  return rules.next_position(state.x, state.y, state.dir, info.width, info.height, info.wallsLo, info.wallsHi);
}
export function isPathAhead(level, state) { return nextPosition(level, state) !== -1; }

// Movement is immutable. The UI evaluates `if` with isPathAhead and queues its selected branch.
export function applyCommand(level, state, command) {
  if (!['forward', 'left', 'right'].includes(command?.op)) throw new Error('请先展开条件分支，再执行移动指令。');
  if (state.won || state.status === 'error') return {...state, collected: [...state.collected]};
  const info = getLevelInfo(level);
  const next = {...state, collected: [...state.collected], steps: state.steps + 1, status: 'running', error: null};
  if (command.op === 'forward') {
    const position = nextPosition(level, state);
    if (position === -1) return {...next, status: 'error', error: `第 ${command.line || 1} 行：前方是墙，机器人无法前进。`};
    next.x = position % info.width;
    next.y = Math.floor(position / info.width);
    next.moves++;
    const key = `${next.x},${next.y}`;
    if (level.rows[next.y][next.x] === 'B' && !next.collected.includes(key)) next.collected.push(key);
  } else next.dir = rules.rotate(state.dir, command.op === 'left' ? -1 : 1);
  next.won = Boolean(rules.goal(Number(next.x === info.exit.x && next.y === info.exit.y), next.collected.length, info.batteries.length));
  if (next.won) next.status = 'won';
  return next;
}
