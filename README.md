# CODE LAB · 双语代码实验室

一个可以实际游玩的中文编程闯关游戏。玩家编写 JavaScript 或 Rust 教学代码，指挥 B-01 完成 18 个机器人实验；还可以进入 18 个趣味网页实验，用 JavaScript 改变整个实验室页面，共 54 个语言挑战。

## 直接开始

Windows：双击根目录的 `start-game.cmd`。本机已具备 Node.js；启动后自动打开 `http://localhost:4173`，保留启动窗口即可继续游玩。关闭启动窗口可停止服务。

其他环境：安装 Node.js 20 或更高版本，然后在项目目录运行 `npm start`，打开上述网址。无需安装依赖，也不需要重新编译 Rust。

不要直接双击 `dist/index.html`：浏览器的文件安全限制会阻止 ES 模块和 Wasm 加载。请使用启动器或本地服务。

## GitHub Pages 部署

在 GitHub 仓库的 Settings → Pages 中，将 Source 设为 GitHub Actions。推送到 `main` 后，`.github/workflows/pages.yml` 会先运行核心测试，再发布 `dist/` 内的完整网站；也可以在 Actions 页面手动运行。无需安装依赖或重新编译 Rust。存档保存在访问者浏览器中，不跨设备同步。

## 怎么玩

首次打开会自动显示 11 步新手引导：灰色遮罩逐项留出矩形高亮，说明路线、选关、目标、编辑器、运行、棋盘、单步和日志。支持下一步、上一步、跳过及 Esc 关闭；右上角「新手引导 / ?」可随时重看。打开引导会暂停正在运行的代码，草稿保留。

1. 在左侧选择实验，在 JavaScript / Rust 标签之间切换。
2. 阅读目标，修改代码，点击“运行代码”，或按 Ctrl / ⌘ + Enter。
3. 观察机器人、当前执行行和运行日志。单步按钮每次执行一条移动或条件判断。
4. 遇到墙或未完成目标时，修改代码再运行。“重置”恢复本关起始代码。
5. 需要帮助可逐次点击“提示”；第三条提示后能查看参考答案。
6. 收集所有能量并到达出口后通关，点击下一关继续。

18 关按基础控制、循环思维、变量与判断、综合应用排列：先练一两步前进、单次左右转，再接触短循环、循环次数、变量和独立判断，最后组合巡航。两种语言分别保存 18 关成绩和编辑草稿。旧版六关使用原来的存档身份，升级后不会丢失或错配旧成绩。

顶部“改造实验室”进入 18 个 JavaScript 趣味网页实验。除了名称、颜色、主题和信号灯，还能打开星空、切换蓝图与全息投影、让机器人失重或跳舞、扫描和镜像观察窗、开启夜航与霓虹派对。每个效果来自真实 DOM 类名，下一关、切换路线或重置时恢复本关初始环境。第 17 课会先开启派对，供玩家练习关闭效果。网页路线独立保存成绩和代码草稿。

寄语框已删除。通关后的“下一关”固定在屏幕底部，显示下个实验的名称；按钮会获得键盘焦点，可以按 Enter 继续。若跳到了最后一课而前面仍有未完成内容，按钮会引导到尚未完成的课程。

通关后，B-01 会跳跃、挥臂，并出现彩屑和扩散光环。开启系统“减少动态效果”时，改为固定光环与成功提示。浏览器存储被禁用时仍可玩，但刷新后不会保留进度。

## 本次 UI 改版

界面使用米白工作台、炭灰编辑器和低饱和绿。先读一句话目标，再写代码、运行并观察。知识点和 B-01 提示可展开，运行按钮是主要操作。网页课程的深色环境和标题染色均保留并适配文字对比度。新参考图位于 `design/ui-refresh/`，设计来源、截图和验证范围见 `docs/ui-refresh.md`。

顶部三个导航选项整体居中。机器人棋盘采用完整相接的等距地砖、低矮灰色障碍、琥珀能量和贴地绿色出口，修正原有投影错位，避免遮挡机器人与目标。

## JavaScript 与 Rust 的分工

| 部分 | 实际用途 |
| --- | --- |
| JavaScript | 页面、编辑器、教学语法解析、执行调度、Canvas 等距地图、动画、进度 |
| Rust → WebAssembly | 真实参与移动、墙体碰撞、转向和通关判定 |
| HTML / CSS | 按生图设计重现导航、编辑器、运行日志与实验场 |

右上角显示“Rust 引擎在线”时，规则函数确实来自 `dist/engine.wasm`。文件由项目内的官方 Rust 1.85.1 工具链编译，源码位于 `rust-engine/lib.rs`。默认分发包含编译产物，游玩无需安装 Rust。

## 教学代码支持范围

这是受限教学解释器，不是完整 JavaScript 运行器或 Rust 编译器。用户代码不会传给 `eval`、`Function` 或系统命令。

| 用途 | JavaScript | Rust |
| --- | --- | --- |
| 前进 | `forward();` | `forward();` |
| 左右转 | `turnLeft();` / `turnRight();` | `turn_left();` / `turn_right();` |
| 传感器 | `pathAhead()` | `path_ahead()` |
| 变量 | `let n = 3;` | `let n: usize = 3;` |
| 循环 | `for (let i = 0; i < n; i++) { ... }` | `for _ in 0..n { ... }` |
| 条件 | `if (pathAhead()) { ... } else { ... }` | `if path_ahead() { ... } else { ... }` |

Rust 程序必须写在 `fn main() { ... }` 内；支持整数声明、读取、注释和嵌套代码块。不支持赋值更新、任意表达式、数组、异步、所有权/借用练习或任意标准库。变量声明只接受整数常量；Rust 支持 i32 和 Wasm32 usize 范围。本课程的机器人函数是游戏 API，不是两种语言的标准库函数。

单次输入上限 12000 字符、循环上限 256 次、执行上限 256 条、嵌套上限 32 层。解释器会静态检查所有分支（包括未选择的分支）和展开循环；错误检查不完全等同于完整语言运行时。

网页路线支持以下真实 DOM 操作（字符串字面量及 `//` 注释，不支持变量或循环）：

```js
document.querySelector('#lab-title').textContent = '星际实验室';
document.querySelector('#lab-title').style.color = '#f6c65c';
document.body.style.backgroundColor = '#142b3b';
document.querySelector('.topbar').style.backgroundColor = '#102b30';
document.documentElement.style.setProperty('--lab-accent', '#8bb8ff');
document.querySelector('#lab-beacon').classList.add('on');
document.querySelector('#lab-beacon').classList.remove('on');
document.body.classList.add('starfield');
document.body.classList.add('zero-gravity');
document.body.classList.add('dance-mode');
document.body.classList.remove('dance-mode');
```

场景类名包括 `starfield`、`blueprint`、`hologram`、`zero-gravity`、`dance-mode`、`scan-mode`、`mirror-world`、`night-shift`、`party-mode`，可添加、组合或移除。颜色只接受三位或六位十六进制值，文字最多 80 字，每次最多 64 条网页操作。不支持任意选择器、`innerHTML`、外部网络或任意脚本执行。

旧成绩继续保留。旧第六关的默认答案会移除已退役的寄语语句；用户自定义的草稿内容保持原样，如引用已删除目标，可重置本关获取新起始代码。

## 项目文件

- `docs/task-plan.md`：任务计划书。
- `docs/expansion-plan.md`：18 关、网页实验、任务视觉和通关特效的升级计划。
- `docs/fun-lab-plan.md`：趣味网页课程、寄语移除与固定通关导航的升级计划。
- `design/interface-concept.png`：早期界面设计原图；本次 generate-image 参考图和实施截图位于 `design/ui-refresh/`。
- `design/prompt.txt`：完整生成提示词；工具为内置 imagegen。
- `dist/`：可部署的完整游戏，无网络字体或外部素材依赖。
- `rust-engine/`：真实 Rust 源码、构建与接口说明。
- `scripts/build-rust.ps1`：本地重建 Wasm；工具链位于 `tools/`，不更改全局环境。
- `tests/`：核心逻辑、存储、真实 Wasm 测试。
- `scripts/browser-check.mjs`：使用本机 Edge 的真实浏览器交互检查，使用独立临时资料目录，不接触用户浏览器资料。
- `docs/report-outline.md`：课堂汇报与现场演示顺序。

## 验证

运行 `npm test` 检查全部核心测试。浏览器交互验证需先运行游戏，再运行 `node scripts/browser-check.mjs`；默认使用本机 Microsoft Edge，可通过 `EDGE_PATH` 指定其他 Chromium 浏览器路径。

实际完成记录见 `docs/delivery-notes.md`。`artifacts/` 包含本机截图和浏览器验证记录，不随站点分发；`tools/` 是本地构建工具，同样无需交给玩家。
