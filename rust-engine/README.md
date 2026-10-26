# Rust 规则引擎

`lib.rs` 使用 Rust 标准核心库，无第三方 crate。浏览器载入实际编译的 `dist/engine.wasm`，JavaScript 负责界面与程序执行流程。

在项目根目录重新编译：

```powershell
./scripts/build-rust.ps1
node --test tests/wasm.test.mjs
```

构建脚本优先使用 `tools/` 中的项目本地 Rust 1.85.1；没有本地工具链时使用 PATH 中的 `rustc`，需要先安装 `wasm32-unknown-unknown` 目标。已提供编译产物，运行游戏无需安装 Rust。

项目本地工具链可以通过官方 rustup 安装，以下命令只在当前 PowerShell 进程设置安装位置，不修改系统 PATH：

```powershell
New-Item -ItemType Directory -Force tools | Out-Null
curl.exe --fail --location https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe --output tools/rustup-init.exe
$env:RUSTUP_HOME = Join-Path (Get-Location) 'tools/rustup'
$env:CARGO_HOME = Join-Path (Get-Location) 'tools/cargo'
./tools/rustup-init.exe -y --no-modify-path --profile minimal --default-toolchain 1.85.1 --target wasm32-unknown-unknown
```

目标说明：[Rust 官方文档](https://doc.rust-lang.org/rustc/platform-support/wasm32-unknown-unknown.html)。

## 导出接口

| 函数 | 参数与结果 |
| --- | --- |
| `next_position(x, y, dir, width, height, walls_lo, walls_hi)` | 方向 0 北、1 东、2 南、3 西。返回 `y * width + x` 形式的目标格编号；出界、碰墙或参数无效时返回 `-1`。网格边长 1–7。低 32 位与高 32 位墙掩码由两个 i32 传入，按无符号位解释。 |
| `rotate(dir, delta)` | 旋转后归一化到 0–3，支持负数及完整 i32 输入范围。 |
| `goal(at_exit, collected, total)` | 站在出口且已收集数量等于所需数量时返回 1，否则返回 0。 |

当前构建：`rustc 1.85.1 (4eb161250 2025-03-15)`，`cdylib`，`wasm32-unknown-unknown`，优化体积、panic abort、去除符号。
