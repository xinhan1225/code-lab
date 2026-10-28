const TOUR_KEY = 'code-lab-tour-v1';

export function initTour({ storage, onStart }) {
  const $ = id => document.getElementById(id);
  const dialog = $('tour-dialog'), card = $('tour-card'), next = $('tour-next');
  const steps = [
    ['.topnav', '先选一条学习路线', '「实验室」用代码指挥机器人；「改造实验室」用 JavaScript 改变真实网页。需要查语法时，打开「学习手册」。'],
    ['.mission-button.active', '从当前这一关开始', '这里可以选择实验。选中的关卡会突出显示，完成后会有勾选标记。进度和每关草稿会自动保存在当前浏览器。手机上可横向滑动课程列表。'],
    ['.mission-intro', '先读目标，再动手', '这里说明本关要做什么。展开「过关要求与知识点」，可以查看具体要求和本关会学到的语法。'],
    ['.language-tabs', '选择你想练习的语言', '机器人路线支持 JavaScript 和 Rust，两种语言分别记录进度。网页改造使用 JavaScript，因此 Rust 选项会暂时禁用。初次体验可以先用 JavaScript。'],
    ['.editor-window', '在这里修改代码', '每关已准备好起始代码。直接点击编辑区输入，草稿会自动保存。运行时，高亮行会告诉你代码执行到了哪里。'],
    ['.editor-actions', '写好后，点击「运行代码」', '运行后再次点击可暂停，再点继续。「提示」会逐步提供思路；「重置」会恢复本关起始代码和场景。也可用 Ctrl / ⌘ + Enter 运行或暂停。'],
    ['.board-container', '观察代码带来的变化', '机器人路线中，沿着地砖行走，收集琥珀色能量，再到达绿色出口。网页路线中，还要留意页面名称、颜色和环境发生的变化。'],
    ['.playback-bar', '看不清？慢一点，或单步执行', '左侧调整运行速度；「单步执行」每次执行一条指令，便于检查移动、转向和条件分支。暂停后也可以继续单步观察。'],
    ['.terminal', '出错时，从这里找原因', '运行结果会记录执行过程、代码行号和错误原因。结合编辑器中的高亮行修改代码，再运行一次。右上角的小按钮可以清空日志。'],
    ['.goals-card', '用检查清单确认完成情况', '每达到一个目标，这里就会打勾。所有目标完成后，屏幕底部会出现「下一关」按钮；你也可以直接按 Enter 继续。'],
    ['.header-tools', '准备好，开始第一轮实验', '右上角可以开关音效、查看引擎状态。「?」是新手引导入口，随时都能重新看一遍。现在从任务目标开始，修改代码并运行吧。'],
  ];
  let index = 0, frame = 0, previousFocus, previousScroll;
  const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

  function position(allowScroll = false) {
    if (!dialog.open) return;
    const target = document.querySelector(steps[index][0]);
    if (!target) return;
    const width = innerWidth, height = innerHeight, gap = 16, edge = 12, pad = 6;
    card.style.maxHeight = `${height - edge * 2}px`;
    const cw = card.offsetWidth, ch = card.offsetHeight;
    let rect = target.getBoundingClientRect();
    const sideSpace = Math.max(width - rect.right, rect.left);
    if (allowScroll && sideSpace < cw + gap + edge && rect.height + ch + gap + edge * 2 + pad * 2 <= height) {
      window.scrollBy({ top: rect.top - edge - pad, behavior: 'instant' });
      rect = target.getBoundingClientRect();
      if (height - rect.bottom - pad < ch + gap + edge && rect.top - pad < ch + gap + edge) {
        window.scrollBy({ top: rect.bottom - height + edge + pad, behavior: 'instant' });
        rect = target.getBoundingClientRect();
      }
    }
    const left = clamp(rect.left - pad, 4, width - 4);
    const right = clamp(rect.right + pad, left, width - 4);
    const top = clamp(rect.top - pad, 4, height - 4);
    const bottom = clamp(rect.bottom + pad, top, height - 4);
    $('tour-spotlight').style.cssText = `left:${left}px;top:${top}px;width:${right - left}px;height:${bottom - top}px`;
    dialog.dataset.target = steps[index][0];
    dialog.dataset.step = String(index + 1);
    const svg = dialog.querySelector('svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    $('tour-shade').setAttribute('d', `M0 0H${width}V${height}H0Z M${left} ${top}H${right}V${bottom}H${left}Z`);
    let x, y;
    if (width - right >= cw + gap + edge) { x = right + gap; y = top; }
    else if (left >= cw + gap + edge) { x = left - gap - cw; y = top; }
    else if (height - bottom >= ch + gap + edge) { x = left; y = bottom + gap; }
    else if (top >= ch + gap + edge) { x = left; y = top - gap - ch; }
    else { x = edge; y = height - bottom >= top ? bottom + gap : top - gap - ch; }
    card.style.left = `${clamp(x, edge, width - cw - edge)}px`;
    card.style.top = `${clamp(y, edge, height - ch - edge)}px`;
  }

  function showStep() {
    const [, title, description] = steps[index];
    $('tour-progress').textContent = `${String(index + 1).padStart(2, '0')} / ${steps.length}`;
    $('tour-title').textContent = title;
    $('tour-description').textContent = description;
    $('tour-back').disabled = index === 0;
    next.textContent = index === steps.length - 1 ? '开始实验 →' : '下一步 →';
    document.querySelector(steps[index][0])?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
    card.scrollTop = 0;
    position(true);
    next.focus({ preventScroll: true });
  }

  function start() {
    if (dialog.open) return;
    previousFocus = document.activeElement;
    previousScroll = { left: scrollX, top: scrollY };
    onStart();
    index = 0;
    dialog.showModal();
    showStep();
  }

  $('tour-button').addEventListener('click', start);
  $('tour-close').addEventListener('click', () => dialog.close());
  $('tour-back').addEventListener('click', () => { if (index > 0) { index--; showStep(); } });
  next.addEventListener('click', () => { if (index < steps.length - 1) { index++; showStep(); } else dialog.close(); });
  dialog.addEventListener('close', () => {
    try { storage.setItem(TOUR_KEY, 'seen'); } catch { /* The guide also works without storage. */ }
    cancelAnimationFrame(frame);
    window.scrollTo({ ...previousScroll, behavior: 'instant' });
    (previousFocus && previousFocus !== document.body ? previousFocus : $('code')).focus({ preventScroll: true });
  });
  const schedulePosition = () => {
    if (!dialog.open) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => position());
  };
  window.addEventListener('resize', schedulePosition);
  window.visualViewport?.addEventListener('resize', schedulePosition);
  new ResizeObserver(schedulePosition).observe(document.documentElement);
  window.addEventListener('scroll', schedulePosition, true);
  dialog.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); }
  });
  let seen = false;
  try { seen = storage.getItem(TOUR_KEY) === 'seen'; } catch { /* Storage may be disabled. */ }
  if (!seen) start();
}
