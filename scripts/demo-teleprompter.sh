#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  AgentChain Guard — Colosseum Demo Teleprompter
#  Run: bash scripts/demo-teleprompter.sh
# ─────────────────────────────────────────────────────────────

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────
RESET="\033[0m"
BOLD="\033[1m"
DIM="\033[2m"
CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
MAGENTA="\033[35m"
WHITE="\033[97m"
BG_BLUE="\033[44m"
BG_BLACK="\033[40m"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
API_URL="https://agentguard-api-hnrutilnsq-uc.a.run.app"
DASHBOARD_URL="https://agentchain-guard-solana-dashboard.vercel.app"
PROGRAM_ID="HutGfrkJTsaGMC4bs7X2EFsbbP8LaTEDkWsEBM86RGHz"

# ── Helpers ───────────────────────────────────────────────────
clear_screen() { printf "\033[2J\033[H"; }

header() {
  printf "${BG_BLUE}${BOLD}${WHITE}  🛡️  AGENTCHAIN GUARD — COLOSSEUM DEMO TELEPROMPTER  ${RESET}\n"
  printf "${DIM}  60-second script · Frontier Hackathon · May 2026${RESET}\n\n"
}

scene_banner() {
  local num="$1" title="$2" timing="$3"
  printf "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n"
  printf "${CYAN}${BOLD}  ⏱  SCENE ${num}: ${title}${RESET}  ${DIM}(${timing})${RESET}\n"
  printf "${CYAN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}\n\n"
}

narration() {
  printf "${BG_BLACK}${BOLD}${WHITE}  🎙  NARRATION:${RESET}\n"
  printf "${BG_BLACK}${WHITE}"
  while IFS= read -r line; do
    printf "  %s\n" "$line"
  done <<< "$1"
  printf "${RESET}\n"
}

action_required() {
  printf "${YELLOW}${BOLD}  👆 ACTION REQUIRED:${RESET}\n"
  while IFS= read -r line; do
    printf "${YELLOW}     %s${RESET}\n" "$line"
  done <<< "$1"
  printf "\n"
}

note() {
  printf "${DIM}  📌 NOTE: %s${RESET}\n\n" "$1"
}

success() {
  printf "${GREEN}${BOLD}  ✅ %s${RESET}\n" "$1"
}

fail_warn() {
  printf "${RED}${BOLD}  ⚠️  %s${RESET}\n" "$1"
}

wait_key() {
  printf "${MAGENTA}${BOLD}  ▶  Press ENTER to continue to next scene...${RESET}"
  read -r _
  echo ""
}

run_check() {
  local label="$1" cmd="$2"
  printf "${DIM}  🔄 Running: ${cmd}${RESET}\n"
  if eval "$cmd" > /tmp/demo_check_out 2>&1; then
    success "$label"
    if [ -s /tmp/demo_check_out ]; then
      printf "${DIM}"
      head -5 /tmp/demo_check_out | sed 's/^/     /'
      printf "${RESET}\n"
    fi
  else
    fail_warn "$label FAILED — check output below:"
    cat /tmp/demo_check_out | sed 's/^/     /' | head -20
    printf "\n${YELLOW}  Continue anyway? (y/N): ${RESET}"
    read -r ans
    [[ "$ans" =~ ^[Yy]$ ]] || exit 1
  fi
  echo ""
}

countdown() {
  local secs="$1" label="${2:-Starting in}"
  for i in $(seq "$secs" -1 1); do
    printf "\r${YELLOW}  ${label}: ${BOLD}${i}s${RESET}  "
    sleep 1
  done
  printf "\r%-40s\n" ""
}

# ─────────────────────────────────────────────────────────────
#  PRE-FLIGHT
# ─────────────────────────────────────────────────────────────
clear_screen
header

printf "${BOLD}  PRE-FLIGHT CHECKS${RESET}\n\n"

# 1. API health
run_check "Cloud Run API is reachable" \
  "curl -sf --max-time 8 '${API_URL}/health'"

# 2. Dashboard reachable
run_check "Dashboard URL responds" \
  "curl -sf --max-time 8 -o /dev/null -w 'HTTP %{http_code}' '${DASHBOARD_URL}'"

# 3. LiteSVM tests
printf "${DIM}  Running LiteSVM tests (this takes ~15s)...${RESET}\n"
if (cd "$ROOT_DIR" && pnpm exec vitest run tests/litesvm 2>&1 | tail -5 | grep -qE "pass|Tests.*[0-9]+ passed"); then
  success "LiteSVM: tests passed"
else
  printf "  Running via make test...\n"
  if (cd "$ROOT_DIR" && make test 2>&1 | tail -5 | grep -qiE "passed|ok"); then
    success "LiteSVM: tests passed (via make)"
  else
    fail_warn "LiteSVM run failed or uncertain — verify manually before recording"
  fi
fi

printf "\n"

printf "${WHITE}  Program ID: ${BOLD}${PROGRAM_ID}${RESET}\n"
printf "${WHITE}  API:        ${BOLD}${API_URL}${RESET}\n"
printf "${WHITE}  Dashboard:  ${BOLD}${DASHBOARD_URL}${RESET}\n\n"

printf "${GREEN}${BOLD}  PRE-FLIGHT COMPLETE.${RESET}\n"
printf "${DIM}  Open your screen recorder. Split: browser (right) | terminal (left).${RESET}\n\n"

action_required "Open $DASHBOARD_URL in the browser NOW before starting.
Open a second terminal for the 'make test' scene (Scene 5).
Font size ≥ 16pt in both terminals."

printf "${MAGENTA}${BOLD}  ▶  Press ENTER when recorder is running and you're ready to start...${RESET}"
read -r _
echo ""

# ─────────────────────────────────────────────────────────────
#  SCENE 1 — The Threat (0:00–0:10)
# ─────────────────────────────────────────────────────────────
clear_screen
header
scene_banner "1" "THE THREAT" "0:00 – 0:10 · 10s"

narration "In the Agentic Internet, the danger isn't an agent failing to act —
it's an agent acting without permission.
Giving an AI a private key is a liability.
AgentChain Guard creates an Authority Boundary between the agent and the treasury."

action_required "BROWSER: Dashboard hero is visible.
Hover mouse over 'Policy-Bound Settlement' text.
Hold still — static shot. Let the tagline land."

note "No clicks yet. This scene is pure framing."

wait_key

# ─────────────────────────────────────────────────────────────
#  SCENE 2 — Live Policy Engine (0:10–0:25)
# ─────────────────────────────────────────────────────────────
clear_screen
header
scene_banner "2" "LIVE POLICY ENGINE" "0:10 – 0:25 · 15s"

narration "An agent proposes a 3 USDC payment.
Our SDK recursively sorts the agent's metadata
and produces a deterministic SHA-256 receipt —
the ONLY key that can unlock the vault.
The live Cloud Run policy engine just evaluated it.
Decision: ALLOW."

action_required "BROWSER: Click 'Allowed Payment' (3 USDC) scenario button.
Watch the [POLICY-ENGINE] logs appear.
PAUSE 1s on the receipt_hash field — zoom if possible.
Highlight/mouse-over the hash value."

note "The receipt_hash is the money shot. Don't rush past it."

wait_key

# ─────────────────────────────────────────────────────────────
#  SCENE 3 — Policy Enforcement (0:25–0:37)
# ─────────────────────────────────────────────────────────────
clear_screen
header
scene_banner "3" "POLICY ENFORCEMENT" "0:25 – 0:37 · 12s"

narration "A high-risk amount hits the allowlist gate.
The policy engine fires — DENY —
before a single lamport touches the escrow.
The agent is stopped at the boundary.
Not the wallet. The boundary."

action_required "BROWSER: Click 'Blocked Payment' (150 USDC).
PAUSE 1s after DENY appears in the log — let judges read it.
Do NOT click anything else. Let the log sit on screen."

note "Emphasize 'boundary' not 'wallet'. It's the differentiator."

wait_key

# ─────────────────────────────────────────────────────────────
#  SCENE 4 — Human Gate (0:37–0:52)
# ─────────────────────────────────────────────────────────────
clear_screen
header
scene_banner "4" "HUMAN APPROVAL GATE" "0:37 – 0:52 · 15s"

narration "High-value action — exceeds the 100 USDC threshold.
Settlement is gated behind a human operator.
I audit the deterministic receipt JSON
and sign the approval PDA.
This is machine speed PLUS human authority.
Not one or the other."

action_required "BROWSER: Click 'Approval Required' (250 USDC).
Watch status change to 'Requires Approval'.
Open the receipt drawer — show the JSON fields briefly (2s).
Click 'Approve & Settle'.
If on-chain explorer link appears — mouse over it."

note "Judges love the audit trail. Drawer open = trust signal."

wait_key

# ─────────────────────────────────────────────────────────────
#  SCENE 5 — Proof + CTA (0:52–1:00)
# ─────────────────────────────────────────────────────────────
clear_screen
header
scene_banner "5" "PROOF + CTA" "0:52 – 1:00 · 8s"

narration "19 LiteSVM integration tests verify the full state machine.
The hashing logic is cross-verified SDK-to-program.
AgentChain Guard: we don't just move SOL —
we move AUTHORIZED SOL."

action_required "TERMINAL (second window): Run exactly:
  make test
Wait for '19 passed' (or '19/19').
Keep terminal visible as you deliver the closing line.
DO NOT switch back to browser — end on the green test output."

printf "${BOLD}${GREEN}  🔥 LIVE RUN: Executing make test now (for your reference)...${RESET}\n\n"
if (cd "$ROOT_DIR" && make test 2>&1 | tail -10); then
  success "Tests confirmed passing — ready for the final scene."
else
  fail_warn "Test output unclear — run 'make test' manually in your second terminal."
fi

wait_key

# ─────────────────────────────────────────────────────────────
#  DONE
# ─────────────────────────────────────────────────────────────
clear_screen
header

printf "${GREEN}${BOLD}  🎬 SCRIPT COMPLETE — STOP RECORDING${RESET}\n\n"

printf "${WHITE}  Post-record checklist:${RESET}\n"
printf "${DIM}  [ ] Trim to exactly 60s\n"
printf "  [ ] Verify receipt_hash is legible in Scene 2\n"
printf "  [ ] Verify DENY log is readable in Scene 3\n"
printf "  [ ] 19/19 test output visible in Scene 5\n"
printf "  [ ] Upload to docs/submission/demo.mp4 (P-5.3)\n"
printf "  [ ] Add video link to docs/submission/README.md\n"
printf "  [ ] git tag guard-solana/colosseum-2026-05 && git push --tags${RESET}\n\n"

printf "${CYAN}${BOLD}  Program ID: ${PROGRAM_ID}${RESET}\n"
printf "${CYAN}${BOLD}  API:        ${API_URL}${RESET}\n"
printf "${CYAN}${BOLD}  Dashboard:  ${DASHBOARD_URL}${RESET}\n\n"
