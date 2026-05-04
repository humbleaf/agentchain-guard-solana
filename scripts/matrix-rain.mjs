#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
//  matrix-rain.mjs — Terminal port of MatrixSelection.tsx
//  Same charset · same φ-ease · same blink phase · same column physics
//
//  Run: node scripts/matrix-rain.mjs
//  Exit: Ctrl+C
// ─────────────────────────────────────────────────────────────────────────────

import * as readline from 'readline'

// ── Constants (mirrored from MatrixSelection.tsx) ────────────────────────────
const KATAKANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
const LATIN    = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&'
const SYMBOLS  = (KATAKANA + LATIN).split('')

const PHI              = 1.618034
const RAIN_DURATION_MS = 7708          // one cycle — loops infinitely
const FRAME_MS         = 50            // ~20fps (terminal safe)
const BLINK_OUTER      = 3
const BLINK_INNER      = 3

// ── ANSI helpers ─────────────────────────────────────────────────────────────
const ESC = '\x1b'
const CSI = `${ESC}[`

const ansi = {
  hide_cursor:   `${CSI}?25l`,
  show_cursor:   `${CSI}?25h`,
  clear:         `${CSI}2J${CSI}H`,
  home:          `${CSI}H`,
  goto:          (r, c) => `${CSI}${r};${c}H`,
  bold:          `${CSI}1m`,
  reset:         `${CSI}0m`,
  // 256-color fg: ESC[38;5;<n>m
  // Bright-head green ≈ color 156, trail: 22 (dark green) → 40 (green)
  rgb:           (r, g, b) => `${ESC}[38;2;${r};${g};${b}m`,
  black_bg:      `${CSI}40m`,
}

// ── Terminal dimensions ───────────────────────────────────────────────────────
function dims() {
  return {
    cols: process.stdout.columns  || 80,
    rows: process.stdout.rows     || 24,
  }
}

// ── Column factory (mirrors createColumn) ────────────────────────────────────
function makeCol(x, rows) {
  const length = 4 + Math.floor(Math.random() * 16)
  return {
    x,
    y: -(Math.random() * rows * 0.5),
    speed: 0.8 + Math.random() * 2.2,    // scaled for terminal rows vs px
    opacity: 0.5 + Math.random() * 0.5,
    length,
    chars: Array.from({ length: 20 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]),
    delay: Math.floor(Math.random() * 20),
  }
}

// ── φ ease-out (mirrors phiEaseOut) ─────────────────────────────────────────
function phiEaseOut(t) {
  return Math.pow(PHI, -t * 3)
}

// ── Sleep ─────────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

// ── Write helper (direct stdout, no newlines) ─────────────────────────────────
const write = s => process.stdout.write(s)

// ── Blink phase (φ-accelerated, mirrors runBlink) ────────────────────────────
async function runBlink(cols, rows) {
  for (let outer = 0; outer < BLINK_OUTER; outer++) {
    for (let inner = 0; inner < BLINK_INNER; inner++) {
      const accel = Math.pow(1 / PHI, inner + outer * 0.5)

      // Flash the whole terminal with emerald (rgba(16,185,129,0.35) → approximate)
      write(ansi.home)
      write(`${ansi.rgb(16, 185, 129)}${ansi.black_bg}`)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          write(Math.random() < 0.08 ? SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)] : ' ')
        }
      }
      write(ansi.reset)
      await sleep(Math.max(27 * accel, 6))

      // Clear
      write(ansi.clear)
      await sleep(Math.max(22 * accel, 5))
    }
    if (outer < BLINK_OUTER - 1) await sleep(Math.max(17 * Math.pow(1 / PHI, outer), 8))
  }
}

// ── Rain loop ─────────────────────────────────────────────────────────────────
async function runRain() {
  const { cols, rows } = dims()

  // Build one column per terminal column
  const columns = Array.from({ length: cols }, (_, i) => makeCol(i, rows))

  const startTime = Date.now()
  let frameCount = 0

  while (true) {
    const elapsed = Date.now() - startTime
    const progress = (elapsed % RAIN_DURATION_MS) / RAIN_DURATION_MS  // loop
    const globalAlpha = phiEaseOut(progress)

    // Build the frame buffer — 2D char grid
    const { cols: W, rows: H } = dims()
    const fg  = Array.from({ length: H }, () => Array(W).fill(null))  // {r,g,b,bold,ch}
    const bg  = Array.from({ length: H }, () => Array(W).fill(null))

    frameCount++

    for (const col of columns) {
      if (frameCount < col.delay) continue
      col.y += col.speed * phiEaseOut(progress * 0.7)

      for (let j = 0; j < col.length; j++) {
        const charY = Math.floor(col.y - j * 1.4)
        if (charY < 0 || charY >= H) continue

        const x = col.x
        if (x < 0 || x >= W) continue

        const trailFade = 1 - j / col.length
        const alpha = col.opacity * trailFade * globalAlpha
        if (alpha < 0.04) continue

        // Mutate characters (mirrors the 8% chance)
        if (Math.random() < 0.08) {
          col.chars[j] = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
        }
        const ch = col.chars[j] || SYMBOLS[0]

        if (j === 0) {
          // Head: bright white-green
          const brightness = Math.min(Math.floor(alpha * 1.3 * 255), 255)
          fg[charY][x] = { r: 180, g: 255, b: 180, bold: true, ch, alpha }
        } else {
          // Trail: emerald gradient fading with trailFade
          const g = Math.floor(160 + trailFade * 95)
          fg[charY][x] = { r: 16, g, b: 80, bold: false, ch, alpha: alpha * 0.85 }
        }
      }

      // Reset column when it scrolls off (mirrors the recycling logic)
      if (progress < 0.6 && col.y - col.length * 1.4 > H) {
        const newCol = makeCol(col.x, H)
        Object.assign(col, newCol)
        col.delay = 0
        col.y = -2
      }
    }

    // Render frame
    write(ansi.home)
    let lastR = -1, lastG = -1, lastB = -1, lastBold = null

    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const cell = fg[r][c]
        if (!cell) {
          // empty cell — black bg space
          if (lastR !== 0 || lastG !== 0 || lastB !== 0) {
            write(`${ansi.rgb(0, 0, 0)}`)
            lastR = 0; lastG = 0; lastB = 0
          }
          write(' ')
        } else {
          // Blend alpha over black background
          const r_ = Math.floor(cell.r * cell.alpha)
          const g_ = Math.floor(cell.g * cell.alpha)
          const b_ = Math.floor(cell.b * cell.alpha)

          if (r_ !== lastR || g_ !== lastG || b_ !== lastB || cell.bold !== lastBold) {
            write(`${cell.bold ? ansi.bold : ''}${ansi.rgb(r_, g_, b_)}`)
            lastR = r_; lastG = g_; lastB = b_; lastBold = cell.bold
          }
          write(cell.ch)
          if (cell.bold) write(ansi.reset)  // reset bold after head char
        }
      }
      if (r < H - 1) write('\r\n')
    }
    write(ansi.reset)

    await sleep(FRAME_MS)
  }
}

// ── Watermark overlay ─────────────────────────────────────────────────────────
function drawWatermark() {
  const { cols, rows } = dims()
  const line1 = '🛡️  AGENTCHAIN GUARD'
  const line2 = 'Authority Boundary Active'
  const c1 = Math.floor((cols - line1.length) / 2)
  const c2 = Math.floor((cols - line2.length) / 2)
  const midRow = Math.floor(rows / 2)

  // We overlay after rain renders — use a separate interval
  return setInterval(() => {
    const { cols: W, rows: H } = dims()
    const r1 = Math.floor(H / 2) - 1
    const r2 = Math.floor(H / 2)
    const c1_ = Math.max(0, Math.floor((W - line1.length) / 2))
    const c2_ = Math.max(0, Math.floor((W - line2.length) / 2))

    write(`${ansi.goto(r1, c1_)}${ansi.rgb(180, 255, 180)}${ansi.bold}${line1}${ansi.reset}`)
    write(`${ansi.goto(r2, c2_)}${ansi.rgb(16, 185, 129)}${line2}${ansi.reset}`)
  }, 100)
}

// ── Cleanup & exit ────────────────────────────────────────────────────────────
function cleanup() {
  write(ansi.show_cursor)
  write(ansi.clear)
  write(ansi.reset)
  process.exit(0)
}

process.on('SIGINT',  cleanup)
process.on('SIGTERM', cleanup)
process.on('exit',    () => write(ansi.show_cursor))

// Make stdin raw so Ctrl+C still fires SIGINT
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.on('data', key => {
    // q or ESC also exits
    if (key[0] === 0x71 || key[0] === 0x1b || (key[0] === 0x03)) cleanup()
  })
}

// ── Entry ─────────────────────────────────────────────────────────────────────
async function main() {
  write(ansi.hide_cursor)
  write(ansi.clear)

  // Blink phase
  const { cols, rows } = dims()
  await runBlink(cols, rows)

  // Start watermark ticker
  const wmInterval = drawWatermark()

  // Rain loop (runs forever, handles its own looping via modulo)
  await runRain()

  clearInterval(wmInterval)
}

main().catch(err => {
  write(ansi.show_cursor)
  console.error(err)
  process.exit(1)
})
