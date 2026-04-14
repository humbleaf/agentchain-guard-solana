# ══════════════════════════════════════════════════════════════════
# AgentChain Guard for Solana — Makefile
# ══════════════════════════════════════════════════════════════════
# Policy and settlement control layer for autonomous commerce.
# Colosseum Frontier Hackathon · May 2026
# ══════════════════════════════════════════════════════════════════

.PHONY: setup deploy dev test test-policy test-all build demo clean

# ── First-time setup ─────────────────────────────────────────────
# Installs toolchain, generates keypairs, funds wallets from devnet faucet.
# Idempotent — safe to re-run.
setup:
	@bash scripts/setup.sh

# ── Build + Deploy ───────────────────────────────────────────────
# Builds Anchor program, deploys to devnet, creates mock token,
# initializes guard, seeds demo data. One command.
deploy:
	@bash scripts/deploy.sh

# ── Development ──────────────────────────────────────────────────
# Start all services: dashboard (3009), policy engine (3010), demo agent.
dev:
	pnpm turbo run dev --parallel

# Policy engine only
dev-policy:
	pnpm --filter @agentguard/policy-engine dev

# Dashboard only
dev-dashboard:
	pnpm --filter @agentguard/dashboard dev

# ── Testing ──────────────────────────────────────────────────────
# Anchor program tests (LiteSVM)
test:
	cd programs/agentchain-guard && anchor test

# Policy engine unit tests
test-policy:
	pnpm --filter @agentguard/policy-engine test

# All tests
test-all: test test-policy

# ── Build ────────────────────────────────────────────────────────
build:
	pnpm turbo run build

# Build Anchor program only
build-program:
	cd programs/agentchain-guard && anchor build

# ── Demo ─────────────────────────────────────────────────────────
# Run the 3-scenario demo from CLI
demo:
	pnpm --filter @agentguard/demo-agent start

# ── Utilities ────────────────────────────────────────────────────
# Fund wallets from devnet faucet
fund:
	@echo "💰 Requesting devnet SOL airdrops..."
	@solana airdrop 2 $$(solana-keygen pubkey .keys/deployer.json) --url devnet || true
	@solana airdrop 1 $$(solana-keygen pubkey .keys/authority.json) --url devnet || true
	@solana airdrop 1 $$(solana-keygen pubkey .keys/agent.json) --url devnet || true

# Show wallet addresses
wallets:
	@echo "Deployer:   $$(solana-keygen pubkey .keys/deployer.json 2>/dev/null || echo 'NOT GENERATED')"
	@echo "Authority:  $$(solana-keygen pubkey .keys/authority.json 2>/dev/null || echo 'NOT GENERATED')"
	@echo "Approver:   $$(solana-keygen pubkey .keys/approver.json 2>/dev/null || echo 'NOT GENERATED')"
	@echo "Agent:      $$(solana-keygen pubkey .keys/agent.json 2>/dev/null || echo 'NOT GENERATED')"

# Clean build artifacts
clean:
	rm -rf node_modules .turbo
	rm -rf apps/dashboard/.next apps/dashboard/node_modules
	rm -rf packages/*/dist packages/*/node_modules
	rm -rf programs/agentchain-guard/target
