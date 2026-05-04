#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
//  matrix-rain.mjs — Terminal Matrix Rain (smooth edition)
//
//  Anti-flicker stack:
//    1. Synchronized Output (DEC 2026) — terminal suppresses partial renders
//    2. Dirty-cell diffing — only rewrite cells that changed
//    3. Single write() per frame — one OS call, no tearing
//    4. Batched color state — minimize escape sequence volume
//
//  Run: node scripts/matrix-rain.mjs   |   make matrix
//  Exit: q / ESC / Ctrl+C
// ─────────────────────────────────────────────────────────────────────────────

// ── Charset (mirrored from MatrixSelection.tsx) ───────────────────────────────
const KATAKANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
const LATIN    = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&'
const SYMBOLS  = (KATAKANA + LATIN).split('')
const SYM_LEN  = SYMBOLS.length

// ── Physics constants (mirrored from MatrixSelection.tsx) ─────────────────────
const PHI              = 1.618034
const RAIN_DURATION_MS = 7708
const FRAME_MS         = 40       // 25fps — fast enough, stable enough

// ── ANSI ──────────────────────────────────────────────────────────────────────
const ESC = '\x1b'
const CSI = `${ESC}[`

// DEC 2026: Synchronized Output — tells terminal to batch the frame
// Supported: iTerm2 ≥3.5, Kitty, WezTerm, Alacritty, foot
const SYNC_START = `${ESC}[?2026h`
const SYNC_END   = `${ESC}[?2026l`

const HIDE_CURSOR = `${CSI}?25l`
const SHOW_CURSOR = `${CSI}?25h`
const HOME        = `${CSI}H`
const CLEAR       = `${CSI}2J${CSI}H`
const RESET_ATTRS = `${CSI}0m`

const goto     = (r, c) => `${CSI}${r};${c}H`
const rgb      = (r, g, b) => `${ESC}[38;2;${r};${g};${b}m`
const BOLD_ON  = `${CSI}1m`
const BOLD_OFF = `${CSI}22m`

// ── Helpers ───────────────────────────────────────────────────────────────────
const rchar  = () => SYMBOLS[(Math.random() * SYM_LEN) | 0]
const sleep  = ms => new Promise(r => setTimeout(r, ms))
const dims   = () => ({ W: process.stdout.columns || 80, H: process.stdout.rows || 24 })

function phiEaseOut(t) {
  return Math.pow(PHI, -t * 3)
}

// ── Cell model ────────────────────────────────────────────────────────────────
// Each cell: { r, g, b, bold, ch } or null (black/empty)
function emptyCell() { return null }

function cellEq(a, b) {
  if (a === b) return true
  if (!a && !b) return true
  if (!a || !b) return false
  return a.r === b.r && a.g === b.g && a.b === b.b && a.bold === b.bold && a.ch === b.ch
}

// ── Grid ──────────────────────────────────────────────────────────────────────
function makeGrid(W, H) {
  return Array.from({ length: H }, () => Array(W).fill(null))
}

// ── Column factory ────────────────────────────────────────────────────────────
function makeCol(x, H) {
  const length = 4 + (Math.random() * 16 | 0)
  return {
    x:      x,
    y:      -(Math.random() * H * 0.5),
    speed:  0.6 + Math.random() * 2.0,
    opacity:0.55 + Math.random() * 0.45,
    length,
    chars:  Array.from({ length: 22 }, rchar),
    delay:  (Math.random() * 20) | 0,
  }
}

// ── Render: dirty-diff two grids into a single string ─────────────────────────
// Only emits escape codes for cells that changed vs prevGrid.
// Returns { out: string, nextPrev: grid }
function renderDiff(curr, prev, W, H) {
  let out = ''
  let lastR = -1, lastG = -1, lastB = -1, lastBold = false
  let cursorRow = -1, cursorCol = -1

  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const cell = curr[r][c]
      const old  = prev[r][c]
      if (cellEq(cell, old)) continue   // unchanged — skip entirely

      // Move cursor only when needed
      if (cursorRow !== r || cursorCol !== c) {
        out += goto(r + 1, c + 1)
        cursorRow = r
        cursorCol = c
      }

      if (!cell) {
        // Erase to black
        if (lastR !== 0 || lastG !== 0 || lastB !== 0 || lastBold) {
          out += `${RESET_ATTRS}${rgb(0, 0, 0)}`
          lastR = 0; lastG = 0; lastB = 0; lastBold = false
        }
        out += ' '
      } else {
        // Color change
        if (cell.r !== lastR || cell.g !== lastG || cell.b !== lastB) {
          out += rgb(cell.r, cell.g, cell.b)
          lastR = cell.r; lastG = cell.g; lastB = cell.b
        }
        // Bold change
        if (cell.bold && !lastBold) {
          out += BOLD_ON
          lastBold = true
        } else if (!cell.bold && lastBold) {
          out += BOLD_OFF
          lastBold = false
        }
        out += cell.ch
      }

      cursorCol++
      if (cursorCol >= W) { cursorRow++; cursorCol = 0 }
    }
  }

  return out
}

// ── Blink phase (φ-accelerated, mirrors runBlink) ─────────────────────────────
async function runBlink() {
  const BLINK_ON_COLOR  = { r: 16, g: 185, b: 129 }  // emerald
  const BLINK_ON_ALPHA  = 0.4

  for (let outer = 0; outer < 3; outer++) {
    for (let inner = 0; inner < 3; inner++) {
      const accel = Math.pow(1 / PHI, inner + outer * 0.5)
      const { W, H } = dims()

      // ON — sparse green chars across full terminal
      let frame = SYNC_START + HOME
      frame += rgb(
        (BLINK_ON_COLOR.r * BLINK_ON_ALPHA) | 0,
        (BLINK_ON_COLOR.g * BLINK_ON_ALPHA) | 0,
        (BLINK_ON_COLOR.b * BLINK_ON_ALPHA) | 0,
      )
      for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
          frame += Math.random() < 0.06 ? rchar() : ' '
        }
        if (r < H - 1) frame += '\r\n'
      }
      frame += RESET_ATTRS + SYNC_END
      process.stdout.write(frame)
      await sleep(Math.max(27 * accel, 6))

      // OFF
      process.stdout.write(SYNC_START + CLEAR + SYNC_END)
      if (inner < 2 || outer < 2) await sleep(Math.max(22 * accel, 5))
    }
    if (outer < 2) await sleep(Math.max(17 * Math.pow(1 / PHI, outer), 8))
  }
}

// ── Watermark — baked into curr grid ─────────────────────────────────────────
function paintWatermark(grid, W, H) {
  const LINE1 = '  AGENTCHAIN GUARD  '
  const LINE2 = 'authority boundary active'
  const r1 = ((H / 2) | 0) - 1
  const r2 = (H / 2) | 0
  const c1 = Math.max(0, ((W - LINE1.length) / 2) | 0)
  const c2 = Math.max(0, ((W - LINE2.length) / 2) | 0)

  for (let i = 0; i < LINE1.length && c1 + i < W; i++) {
    grid[r1][c1 + i] = { r: 180, g: 255, b: 180, bold: true, ch: LINE1[i] }
  }
  for (let i = 0; i < LINE2.length && c2 + i < W; i++) {
    grid[r2][c2 + i] = { r: 16, g: 185, b: 129, bold: false, ch: LINE2[i] }
  }
}

// ── Rain loop ─────────────────────────────────────────────────────────────────
async function runRain() {
  let { W, H } = dims()
  let cols = Array.from({ length: W }, (_, i) => makeCol(i, H))

  let prev = makeGrid(W, H)
  let frameCount = 0
  const startTime = Date.now()

  // Detect resize
  process.stdout.on('resize', () => {
    const nd = dims()
    if (nd.W !== W || nd.H !== H) {
      W = nd.W; H = nd.H
      cols = Array.from({ length: W }, (_, i) => makeCol(i, H))
      prev = makeGrid(W, H)
      process.stdout.write(CLEAR)
    }
  })

  while (true) {
    const elapsed = Date.now() - startTime
    const progress = (elapsed % RAIN_DURATION_MS) / RAIN_DURATION_MS
    const globalAlpha = phiEaseOut(progress)

    // Build curr grid
    const curr = makeGrid(W, H)
    frameCount++

    for (const col of cols) {
      if (frameCount < col.delay) continue
      col.y += col.speed * phiEaseOut(progress * 0.7)

      for (let j = 0; j < col.length; j++) {
        const charY = (col.y - j * 1.5) | 0
        if (charY < 0 || charY >= H) continue
        const x = col.x | 0
        if (x < 0 || x >= W) continue

        const trailFade = 1 - j / col.length
        const alpha = col.opacity * trailFade * globalAlpha
        if (alpha < 0.04) continue

        if (Math.random() < 0.06) col.chars[j] = rchar()
        const ch = col.chars[j] || SYMBOLS[0]

        if (j === 0) {
          // Head: bright white-green
          const v = Math.min((alpha * 1.3 * 255) | 0, 255)
          curr[charY][x] = { r: v, g: 255, b: v, bold: true, ch }
        } else {
          const g = (160 + trailFade * 95) | 0
          const scale = alpha * 0.85
          curr[charY][x] = {
            r: (16 * scale) | 0,
            g: (g  * scale) | 0,
            b: (80 * scale) | 0,
            bold: false,
            ch,
          }
        }
      }

      // Recycle column
      if (progress < 0.6 && col.y - col.length * 1.5 > H) {
        const nc = makeCol(col.x, H)
        Object.assign(col, nc)
        col.delay = 0
        col.y = -2
      }
    }

    // Bake watermark into the frame
    paintWatermark(curr, W, H)

    // Diff and emit as a single write
    const diff = renderDiff(curr, prev, W, H)
    if (diff.length > 0) {
      process.stdout.write(SYNC_START + diff + RESET_ATTRS + SYNC_END)
    }

    // Swap buffers
    prev = curr

    await sleep(FRAME_MS)
  }
}

// ── Cleanup ───────────────────────────────────────────────────────────────────
function cleanup() {
  process.stdout.write(SHOW_CURSOR + CLEAR + RESET_ATTRS)
  process.exit(0)
}

process.on('SIGINT',  cleanup)
process.on('SIGTERM', cleanup)

if (process.stdin.isTTY) {
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.on('data', key => {
    if (key[0] === 0x71 || key[0] === 0x1b || key[0] === 0x03) cleanup()
  })
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  process.stdout.write(HIDE_CURSOR + CLEAR)
  await runBlink()
  await runRain()
}

main().catch(err => {
  process.stdout.write(SHOW_CURSOR)
  console.error(err)
  process.exit(1)
})
