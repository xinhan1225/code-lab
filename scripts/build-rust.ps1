$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$localRustup = Join-Path $projectRoot 'tools/cargo/bin/rustup.exe'
$previousRustupHome = $env:RUSTUP_HOME
$previousCargoHome = $env:CARGO_HOME
try {
    if (Test-Path -LiteralPath $localRustup) {
        $env:RUSTUP_HOME = Join-Path $projectRoot 'tools/rustup'
        $env:CARGO_HOME = Join-Path $projectRoot 'tools/cargo'
        $compiler = Join-Path $projectRoot 'tools/cargo/bin/rustc.exe'
        $compilerArgs = @('+1.85.1')
    } else {
        $compiler = (Get-Command rustc -ErrorAction Stop).Source
        $compilerArgs = @()
    }
    New-Item -ItemType Directory -Force -Path (Join-Path $projectRoot 'dist') | Out-Null
    & $compiler @compilerArgs --version
    if ($LASTEXITCODE -ne 0) { throw 'Rust compiler is unavailable.' }
    & $compiler @compilerArgs (Join-Path $projectRoot 'rust-engine/lib.rs') --crate-type cdylib --edition 2021 --target wasm32-unknown-unknown -C opt-level=s -C panic=abort -C strip=symbols -o (Join-Path $projectRoot 'dist/engine.wasm')
    if ($LASTEXITCODE -ne 0) { throw 'Rust WebAssembly compilation failed.' }
    Get-Item -LiteralPath (Join-Path $projectRoot 'dist/engine.wasm') | Select-Object Name, Length
} finally {
    $env:RUSTUP_HOME = $previousRustupHome
    $env:CARGO_HOME = $previousCargoHome
}
