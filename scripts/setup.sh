#!/bin/bash
set -e

echo "🛡️  AgentGuard — Full Development Setup"
echo "======================================="
echo ""

# ── 1. Check prerequisites ──
echo "📋 Checking prerequisites..."

if ! command -v rustc &>/dev/null; then
  echo "  ⚙️  Installing Rust..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env"
else
  echo "  ✓ Rust $(rustc --version | awk '{print $2}')"
fi

# Solana CLI
SOLANA_BIN="$HOME/.local/share/solana/install/active_release/bin"
export PATH="$SOLANA_BIN:$PATH"

if ! command -v solana &>/dev/null; then
  echo "  ⚙️  Installing Solana CLI..."
  sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
  export PATH="$SOLANA_BIN:$PATH"
else
  echo "  ✓ Solana $(solana --version | awk '{print $2}')"
fi

# AVM + Anchor
if ! command -v avm &>/dev/null; then
  echo "  ⚙️  Installing AVM..."
  cargo install --git https://github.com/coral-xyz/anchor avm --force
fi

if ! command -v anchor &>/dev/null; then
  echo "  ⚙️  Installing Anchor 0.31.1..."
  avm install 0.31.1
  avm use 0.31.1
else
  echo "  ✓ Anchor $(anchor --version | awk '{print $2}')"
fi

# pnpm
if ! command -v pnpm &>/dev/null; then
  echo "  ⚙️  Installing pnpm..."
  npm i -g pnpm@10
else
  echo "  ✓ pnpm $(pnpm --version)"
fi

echo ""

# ── 2. Install node dependencies ──
echo "📦 Installing node dependencies..."
pnpm install --no-strict-peer-dependencies
echo ""

# ── 3. Configure Solana for devnet ──
echo "🌐 Configuring Solana for devnet..."
solana config set --url devnet
echo ""

# ── 4. Generate keypairs (idempotent) ──
KEYS_DIR=".keys"
mkdir -p "$KEYS_DIR"

generate_key() {
  local name=$1
  local path="$KEYS_DIR/${name}.json"
  if [ ! -f "$path" ]; then
    echo "  🔑 Generating ${name} keypair..."
    solana-keygen new --outfile "$path" --no-bip39-passphrase --force --silent
  else
    echo "  ✓ ${name} keypair exists"
  fi
}

echo "🔐 Checking keypairs..."
generate_key "deployer"
generate_key "authority"
generate_key "approver"
generate_key "agent"
echo ""

# ── 5. Fund wallets ──
echo "💰 Requesting devnet SOL airdrops..."
echo "   (Rate limits may apply — retry if needed)"

airdrop_safe() {
  local key=$1
  local amount=$2
  local pubkey
  pubkey=$(solana-keygen pubkey "$key")
  echo -n "  Airdropping ${amount} SOL to $(echo "$pubkey" | head -c 8)... "
  if solana airdrop "$amount" "$pubkey" --url devnet &>/dev/null; then
    echo "✓"
  else
    echo "⚠ rate-limited (retry: solana airdrop $amount $pubkey --url devnet)"
  fi
}

airdrop_safe "$KEYS_DIR/deployer.json" 2
sleep 2
airdrop_safe "$KEYS_DIR/authority.json" 1
sleep 2
airdrop_safe "$KEYS_DIR/agent.json" 1
echo ""

# ── 6. Print addresses ──
echo "✅ Setup Complete"
echo "================="
echo "  Deployer:   $(solana-keygen pubkey $KEYS_DIR/deployer.json)"
echo "  Authority:  $(solana-keygen pubkey $KEYS_DIR/authority.json)"
echo "  Approver:   $(solana-keygen pubkey $KEYS_DIR/approver.json)"
echo "  Agent:      $(solana-keygen pubkey $KEYS_DIR/agent.json)"
echo ""
echo "Next: make deploy"
