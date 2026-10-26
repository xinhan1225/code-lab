const titleText = "document.querySelector('#lab-title').textContent = '星际实验室';";
const titleColor = "document.querySelector('#lab-title').style.color = '#f6c65c';";
const wallColor = "document.body.style.backgroundColor = '#142b3b';";
const accentColor = "document.documentElement.style.setProperty('--lab-accent', '#8bb8ff');";
const beaconOn = "document.querySelector('#lab-beacon').classList.add('on');";

export const BODY_CLASSES = ['starfield', 'blueprint', 'hologram', 'zero-gravity', 'dance-mode', 'scan-mode', 'mirror-world', 'night-shift', 'party-mode'];

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
    id: 7, name: '海底控制室', title: '让实验室潜入深海', concept: '组合不同元素的样式',
    stage: '场景变身', difficulty: 3, newSkill: '选择 .topbar 并设置背景', suggestedMinutes: 4,
    objective: '把标题改为「海底控制室」，整页背景设为 #062a35，顶部 .topbar 背景设为 #0b4650，打造潜艇驾驶舱。',
    starters: {js: "// 驾驶舱、海水和控制台分别改造\ndocument.querySelector('#lab-title').textContent = '海底控制室';\ndocument.body.style.backgroundColor = '#142b3b';\ndocument.querySelector('.topbar').style.backgroundColor = '#142b3b';"},
    solutions: {js: "document.querySelector('#lab-title').textContent = '海底控制室';\ndocument.body.style.backgroundColor = '#062a35';\ndocument.querySelector('.topbar').style.backgroundColor = '#0b4650';"},
    hints: ['这次有三个目标：名称、整页墙面、顶部控制台。', '.topbar 选择顶部控制台，背景属性仍是 backgroundColor。', '两种背景颜色依次是 #062a35 与 #0b4650。'],
    explanation: {js: '相同的样式属性可以用在不同元素上。组合标题与两块背景，就能让熟悉的页面变成一个新场景。'},
    checks: [
      {label: '驾驶舱叫「海底控制室」', op: 'text', target: '#lab-title', value: '海底控制室'},
      {label: '深海墙面是 #062a35', op: 'style', target: 'body', property: 'backgroundColor', value: '#062a35'},
      {label: '顶部控制台是 #0b4650', op: 'style', target: '.topbar', property: 'backgroundColor', value: '#0b4650'},
    ],
  },
  {
    id: 8, name: '星空开窗', title: '把舷窗外的星星请进来', concept: '类名启动整页效果',
    stage: '场景变身', difficulty: 3, newSkill: 'document.body.classList.add', suggestedMinutes: 3,
    objective: '给 document.body 添加 starfield 类名，让实验室的墙面出现星空。',
    starters: {js: "// 星星的开关写在 body 的类名中\ndocument.body.classList.remove('starfield');"},
    solutions: {js: "document.body.classList.add('starfield');"},
    hints: ['这次效果开关在 document.body 上。', 'starfield 代表星空场景，拼写中没有空格。', "用 classList.add('starfield') 打开星空。"],
    explanation: {js: '类名也能控制整页视觉效果。把 starfield 加到 body，页面就会套用准备好的星空样式。'},
    checks: [{label: '星空舷窗已打开', op: 'class', target: 'body', action: 'add', value: 'starfield'}],
  },
  {
    id: 9, name: '蓝图扫描', title: '看见实验室的设计网格', concept: '用类名切换观察方式',
    stage: '场景变身', difficulty: 3, newSkill: 'blueprint 场景类名', suggestedMinutes: 3,
    objective: '给 document.body 添加 blueprint 类名，展开实验室的蓝图与网格。',
    starters: {js: "// 打开工程师的蓝图视图\ndocument.body.classList.remove('blueprint');"},
    solutions: {js: "document.body.classList.add('blueprint');"},
    hints: ['蓝图也是 body 的一个场景开关。', '类名写作 blueprint，放在引号里。', '将 remove 改成 add，展开设计网格。'],
    explanation: {js: 'JavaScript 只改变类名，蓝图的网格与线条由 CSS 绘制。一个状态开关能同时改变多个区域。'},
    checks: [{label: '蓝图网格已展开', op: 'class', target: 'body', action: 'add', value: 'blueprint'}],
  },
  {
    id: 10, name: '全息投影', title: '启动青色全息工作台', concept: '场景类名与主题变量组合',
    stage: '场景变身', difficulty: 3, newSkill: 'hologram 与主题色联动', suggestedMinutes: 4,
    objective: '给 body 添加 hologram，并把根元素的 --lab-accent 设为 #63f4df，让工作台变成青色全息投影。',
    starters: {js: "// 全息开关与投影颜色可以各自控制\ndocument.body.classList.add('hologram');\ndocument.documentElement.style.setProperty('--lab-accent', '#8bb8ff');"},
    solutions: {js: "document.body.classList.add('hologram');\ndocument.documentElement.style.setProperty('--lab-accent', '#63f4df');"},
    hints: ['先用 body 的 hologram 开关启动投影。', '投影的强调色由根元素上的 --lab-accent 控制。', '把 setProperty 的第二个参数改为 #63f4df。'],
    explanation: {js: '场景负责材质，主题变量负责强调色。两种操作组合后，同一个全息场景就有了指定的投影颜色。'},
    checks: [
      {label: '全息投影已启动', op: 'class', target: 'body', action: 'add', value: 'hologram'},
      {label: '投影强调色是 #63f4df', op: 'css-variable', target: 'root', property: '--lab-accent', value: '#63f4df'},
    ],
  },
  {
    id: 11, name: '失重实验', title: '让工作台漂浮在星空中', concept: '多个类名叠加效果',
    stage: '动态实验', difficulty: 3, newSkill: '叠加 starfield 与 zero-gravity', suggestedMinutes: 4,
    objective: '给 body 分别添加 starfield 和 zero-gravity，让工作台在星空中进入失重状态。',
    starters: {js: "// 每条语句打开一种效果\ndocument.body.classList.add('starfield');\ndocument.body.classList.remove('zero-gravity');"},
    solutions: {js: "document.body.classList.add('starfield');\ndocument.body.classList.add('zero-gravity');"},
    hints: ['星空与失重是两个独立类名。', '每次 add 使用一个类名，分成两条语句。', '把第二条语句的 remove 改为 add，让工作台漂浮。'],
    explanation: {js: '元素可以同时拥有多个类名。添加 zero-gravity 不会移除已有的 starfield，所以两种效果可以一起出现。'},
    checks: [
      {label: '星空背景已打开', op: 'class', target: 'body', action: 'add', value: 'starfield'},
      {label: '失重实验已启动', op: 'class', target: 'body', action: 'add', value: 'zero-gravity'},
    ],
  },
  {
    id: 12, name: '机器人舞台', title: '给机器人办一场演出', concept: '状态与文字一起编排',
    stage: '动态实验', difficulty: 4, newSkill: 'dance-mode 与舞台命名', suggestedMinutes: 4,
    objective: '给 body 添加 dance-mode，再把标题改为「机器人舞台」，邀请机器人登台跳舞。',
    starters: {js: "// 先挂牌，再打开舞蹈开关\ndocument.querySelector('#lab-title').textContent = '演出准备中';\ndocument.body.classList.remove('dance-mode');"},
    solutions: {js: "document.querySelector('#lab-title').textContent = '机器人舞台';\ndocument.body.classList.add('dance-mode');"},
    hints: ['舞台名称仍由 #lab-title 的 textContent 修改。', '让机器人跳舞的类名是 dance-mode。', '标题写成「机器人舞台」，并向 body 添加舞蹈类名。'],
    explanation: {js: '文字告诉观众场景的含义，类名让场景动起来。一段程序可以同时负责演出名称和演出状态。'},
    checks: [
      {label: '舞台已命名为「机器人舞台」', op: 'text', target: '#lab-title', value: '机器人舞台'},
      {label: '机器人舞蹈已开始', op: 'class', target: 'body', action: 'add', value: 'dance-mode'},
    ],
  },
  {
    id: 13, name: '激光巡检', title: '让扫描光掠过设计图', concept: '静态场景与动态扫描组合',
    stage: '动态实验', difficulty: 4, newSkill: 'scan-mode 与 blueprint 组合', suggestedMinutes: 4,
    objective: '给 body 添加 blueprint 和 scan-mode，让激光扫描实验室的蓝图。',
    starters: {js: "// 网格是巡检的地图，还需要一道扫描光\ndocument.body.classList.add('blueprint');"},
    solutions: {js: "document.body.classList.add('blueprint');\ndocument.body.classList.add('scan-mode');"},
    hints: ['蓝图类名 blueprint 提供巡检地图。', '扫描类名是 scan-mode，写在 body 上。', "补上一条 document.body.classList.add('scan-mode');"],
    explanation: {js: '先铺好蓝图，再启动扫描。同一个元素上的不同类名各自控制一种效果，组合起来就是完整的巡检场景。'},
    checks: [
      {label: '巡检蓝图已展开', op: 'class', target: 'body', action: 'add', value: 'blueprint'},
      {label: '激光巡检已启动', op: 'class', target: 'body', action: 'add', value: 'scan-mode'},
    ],
  },
  {
    id: 14, name: '镜像观察', title: '从镜子另一边观察实验', concept: '控制观察视角',
    stage: '动态实验', difficulty: 4, newSkill: 'mirror-world 场景类名', suggestedMinutes: 4,
    objective: '给 body 添加 mirror-world，再把标题改为「镜像观察站」，看看工作台翻转后的样子。',
    starters: {js: "// 镜像改变工作台的观察方向\ndocument.querySelector('#lab-title').textContent = '镜像观察站';\ndocument.body.classList.remove('mirror-world');"},
    solutions: {js: "document.querySelector('#lab-title').textContent = '镜像观察站';\ndocument.body.classList.add('mirror-world');"},
    hints: ['镜像观察的类名是 mirror-world。', '将它添加到 body，工作台就会切换视角。', '保留「镜像观察站」标题，把 remove 改为 add。'],
    explanation: {js: '类名不只能控制颜色与动画，还能切换空间变换。工作台的镜像外观由 CSS 处理，按钮和文字继续正常使用。'},
    checks: [
      {label: '标题是「镜像观察站」', op: 'text', target: '#lab-title', value: '镜像观察站'},
      {label: '镜像观察已开启', op: 'class', target: 'body', action: 'add', value: 'mirror-world'},
    ],
  },
  {
    id: 15, name: '深夜航行', title: '在暗夜里点亮航行信号', concept: '整页与局部状态组合',
    stage: '动态实验', difficulty: 4, newSkill: 'night-shift 与信号灯协作', suggestedMinutes: 4,
    objective: '给 body 添加 night-shift，并给 #lab-beacon 添加 on，在夜航场景中点亮信号灯。',
    starters: {js: "// 夜航需要暗下来的船舱和亮起的信号灯\ndocument.body.classList.add('night-shift');\ndocument.querySelector('#lab-beacon').classList.remove('on');"},
    solutions: {js: "document.body.classList.add('night-shift');\n" + beaconOn},
    hints: ['night-shift 是整页的夜航开关。', '信号灯由 #lab-beacon 上的 on 控制。', '两处都用 add：body 开夜航，信号灯开灯。'],
    explanation: {js: 'body 的状态控制整体环境，信号灯的状态控制局部提示。分别选择正确目标，就能精确编排夜航场景。'},
    checks: [
      {label: '夜航场景已开启', op: 'class', target: 'body', action: 'add', value: 'night-shift'},
      {label: '航行信号灯已亮', op: 'class', target: '#lab-beacon', action: 'add', value: 'on'},
    ],
  },
  {
    id: 16, name: '舞池开场', title: '启动机器人的霓虹派对', concept: '多个状态与主题组合',
    stage: '场景导演', difficulty: 5, newSkill: '编排派对、舞蹈与主题色', suggestedMinutes: 5,
    objective: '给 body 添加 party-mode 和 dance-mode，并把 --lab-accent 设为 #ff80cf，开启粉色霓虹舞池。',
    starters: {js: "// 灯光、舞步和主题色都准备好，派对才能开始\ndocument.body.classList.add('party-mode');"},
    solutions: {js: "document.body.classList.add('party-mode');\ndocument.body.classList.add('dance-mode');\ndocument.documentElement.style.setProperty('--lab-accent', '#ff80cf');"},
    hints: ['party-mode 打开派对灯光，dance-mode 邀请机器人跳舞。', '两个类名都添加到 body，用两条 add 语句。', '最后设置根元素的 --lab-accent，颜色是 #ff80cf。'],
    explanation: {js: '多个状态加上主题变量，可以共同组成一场演出。每个开关有清楚的职责，组合后的效果仍然容易修改。'},
    checks: [
      {label: '派对灯光已打开', op: 'class', target: 'body', action: 'add', value: 'party-mode'},
      {label: '机器人已加入舞池', op: 'class', target: 'body', action: 'add', value: 'dance-mode'},
      {label: '霓虹主题色是 #ff80cf', op: 'css-variable', target: 'root', property: '--lab-accent', value: '#ff80cf'},
    ],
  },
  {
    id: 17, name: '停止派对', title: '让热闹的实验室安静下来', concept: '移除类名恢复状态',
    stage: '场景导演', difficulty: 5, newSkill: '用 classList.remove 关闭效果', suggestedMinutes: 4,
    objective: '派对已经开始了！从 body 移除 party-mode 和 dance-mode，让灯光与舞步一起停下来。',
    setupCode: "document.body.classList.add('party-mode');\ndocument.body.classList.add('dance-mode');",
    starters: {js: "// 这次要关掉效果，想想 add 应该换成什么\ndocument.body.classList.add('party-mode');\ndocument.body.classList.add('dance-mode');"},
    solutions: {js: "document.body.classList.remove('party-mode');\ndocument.body.classList.remove('dance-mode');"},
    hints: ['本关一开始，派对与跳舞开关都已经打开。', 'remove 是 add 的反向操作，用来移除指定类名。', '分别移除 party-mode 与 dance-mode，两行都用 remove。'],
    explanation: {js: '添加类名打开效果，移除类名关闭效果。remove 只移除指定状态，body 上的其他类名继续保留。'},
    checks: [
      {label: '派对灯光已关闭', op: 'class', target: 'body', action: 'remove', value: 'party-mode'},
      {label: '机器人舞步已停止', op: 'class', target: 'body', action: 'remove', value: 'dance-mode'},
    ],
  },
  {
    id: 18, name: '穿越星门', title: '组合一场太空跃迁', concept: '编排多重环境效果',
    stage: '场景导演', difficulty: 5, newSkill: '星空、全息与失重的组合', suggestedMinutes: 5,
    objective: '给 body 添加 starfield、hologram、zero-gravity，再把 --lab-accent 设为 #c19bff，开启紫色星门。',
    starters: {js: "// 星门需要星空、全息、失重和紫色能量\ndocument.body.classList.add('starfield');"},
    solutions: {js: "document.body.classList.add('starfield');\ndocument.body.classList.add('hologram');\ndocument.body.classList.add('zero-gravity');\ndocument.documentElement.style.setProperty('--lab-accent', '#c19bff');"},
    hints: ['先把三个场景类名分别添加到 body。', '类名依次是 starfield、hologram、zero-gravity。', '根元素的 --lab-accent 设为 #c19bff，为星门注入紫色能量。'],
    explanation: {js: '复杂场景也能由少量熟悉的操作组成。先启动三种环境效果，再统一主题色，就完成了一场太空跃迁。'},
    checks: [
      {label: '星空已展开', op: 'class', target: 'body', action: 'add', value: 'starfield'},
      {label: '全息星门已启动', op: 'class', target: 'body', action: 'add', value: 'hologram'},
      {label: '失重跃迁已启动', op: 'class', target: 'body', action: 'add', value: 'zero-gravity'},
      {label: '星门能量色是 #c19bff', op: 'css-variable', target: 'root', property: '--lab-accent', value: '#c19bff'},
    ],
  },
  {
    id: 6, name: '实验室总装', title: '组合已经学会的网页操作', concept: '文字、样式、主题与状态组合',
    stage: '综合应用', difficulty: 5, newSkill: '组合标题、颜色、墙面、主题与信号灯', suggestedMinutes: 6,
    objective: '完成最后的实验室总装：标题改为「星际实验室」、文字设为 #f6c65c、墙面设为 #142b3b、主题设为 #8bb8ff，并点亮信号灯。',
    starters: {js: '// 综合前五关的操作：标题、标题颜色、墙面、主题、信号灯\n' + titleText},
    solutions: {js: [titleText, titleColor, wallColor, accentColor, beaconOn].join('\n')},
    hints: ['每条语句按书写顺序改变真实网页，每条语句末尾写分号。', '标题、墙面、主题的颜色依次为 #f6c65c、#142b3b、#8bb8ff。', '标题改为「星际实验室」，并向 #lab-beacon 添加 on 类名，让五个目标全部完成。'],
    explanation: {js: '一次运行可以组合多个已学过的 DOM 操作。下一关或重置时会恢复网页基准外观，可以放心重新实验。'},
    checks: [],
  },
];
PAGE_LEVELS.at(-1).checks = PAGE_LEVELS.slice(0, 5).flatMap(level => level.checks.map(check => ({...check})));

const fail = (line, message) => { throw new Error(`第 ${line} 行：${message}`); };
const colorPattern = /^#[\da-f]{3}(?:[\da-f]{3})?$/i;

function validateCommand(command) {
  const {op, target, property, value, action, line = 1} = command;
  if (typeof value !== 'string') fail(line, '参数必须使用引号包住的文字。');
  if (op === 'text' && target === '#lab-title') {
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
  if (op === 'class' && target === 'body' && BODY_CLASSES.includes(value) && ['add', 'remove'].includes(action)) return;
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
      if (!['#lab-title', '#lab-beacon', '.topbar'].includes(target)) fail(line, '暂不支持这个选择器。请使用任务中的目标。');
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
  const title = getTarget(document, '#lab-title'), beacon = getTarget(document, '#lab-beacon');
  const titleMarkup = title.innerHTML, lightOn = beacon.classList.contains('on');
  const bodyClasses = BODY_CLASSES.map(name => ({name, present: document.body.classList.contains(name)}));
  const styles = [['#lab-title', 'color'], ['body', 'background-color'], ['.topbar', 'background-color'], ['root', '--lab-accent']].map(([target, property]) => {
    const style = getTarget(document, target).style;
    return {style, property, value: style.getPropertyValue(property), priority: style.getPropertyPriority(property)};
  });
  return {restore() {
    title.innerHTML = titleMarkup;
    for (const {style, property, value, priority} of styles) {
      if (value) style.setProperty(property, value, priority);
      else style.removeProperty(property);
    }
    if (lightOn) beacon.classList.add('on'); else beacon.classList.remove('on');
    for (const {name, present} of bodyClasses) document.body.classList[present ? 'add' : 'remove'](name);
  }};
}
