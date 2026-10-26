//! Game rules compiled into WebAssembly; JavaScript owns rendering and input.
#![no_std]

use core::panic::PanicInfo;

#[panic_handler]
fn panic(_: &PanicInfo) -> ! {
    loop {}
}

/// Return the destination cell, or -1 when the move is invalid or blocked.
#[no_mangle]
pub extern "C" fn next_position(
    x: i32, y: i32, dir: i32, width: i32, height: i32,
    walls_lo: i32, walls_hi: i32,
) -> i32 {
    if width < 1 || height < 1 || width > 7 || height > 7
        || x < 0 || y < 0 || x >= width || y >= height {
        return -1;
    }
    let (dx, dy) = match dir {
        0 => (0, -1),
        1 => (1, 0),
        2 => (0, 1),
        3 => (-1, 0),
        _ => return -1,
    };
    let (nx, ny) = (x + dx, y + dy);
    if nx < 0 || ny < 0 || nx >= width || ny >= height {
        return -1;
    }
    let index = ny * width + nx;
    let walls = (walls_lo as u32 as u64) | ((walls_hi as u32 as u64) << 32);
    if walls & (1u64 << index) != 0 { -1 } else { index }
}

/// Normalize both operands before adding so even extreme i32 inputs are safe.
#[no_mangle]
pub extern "C" fn rotate(dir: i32, delta: i32) -> i32 {
    ((dir % 4 + delta % 4) % 4 + 4) % 4
}

#[no_mangle]
pub extern "C" fn goal(at_exit: i32, collected: i32, total: i32) -> i32 {
    (at_exit != 0 && collected == total) as i32
}
