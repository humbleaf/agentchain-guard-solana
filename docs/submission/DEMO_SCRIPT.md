# 🎬 Final Demo Script: AgentChain Guard (120s)

**Vibe**: Calm, technical, confident. Focus on the "Authority Boundary".

---

## 0:00 - 0:15: The Thesis
"AI agents are ready to trade, but our wallets aren't ready for them. Giving an agent a private key is a liability. We built AgentChain Guard to provide the physical Authority Boundary that agents need to move money safely on Solana."

## 0:15 - 0:35: The Dashboard & Wallet Proof
"I'm starting the dashboard. You'll see we're in 'Simulation Mode'—this is a zero-setup path for judges. I'll connect my Devnet wallet. Now we're in 'Wallet Proof' mode. My public key is now the identity behind every proposal, allowing us to bind intent to a real signature without requiring Devnet SOL for every demo step."

## 0:35 - 1:00: Allowed Payment (The Determinism Lock)
"Let's run an 'Allowed Payment'. An agent proposes a 3 USDC action. Watch the 'Determinism Lock'. Our SDK recursively sorts the agent's metadata to create a SHA-256 receipt. This hash is the immutable proof of intent. In production, this hash is the ONLY value that can unlock the on-chain vault. The policy evaluation you see here is running live on our Cloud Run API."

## 1:00 - 1:30: High-Value Gate (Human-in-the-Loop)
"Now, a 250 USDC payout. This exceeds our 100 USDC threshold. The status changes to 'Requires Approval'. Every policy reason—from max-spend to allowlist status—is returned by the live engine. I can open the receipt, audit the deterministic JSON, and demonstrate the approval gate. We've separated the machine's speed from the human's authority."

## 1:30 - 1:50: Technical Verification
"This isn't just a UI. Our Anchor state machine is verified with 19 integration tests running in LiteSVM. We have 100% parity for our hashing logic across the SDK and the program. We are technically honest: while the settlement is simulated for demo reliability, the logic is mathematically verifiable."

## 1:50 - 2:00: Closing
"Solana gives agents speed. AgentChain Guard gives them permission. We are the trust layer for the Agentic Internet. Built by Humbleaf for the Frontier."

---

## 💡 Narration Tips
- **Pause** for 1 second after "Determinism Lock" to show the hash appearing.
- **Show the logs**: The logs clearly distinguish between [POLICY-ENGINE] and [SIMULATED-SETTLEMENT]. Highlight this.
- **Honesty wins**: Explicitly mention that the settlement is simulated to ensure demo reliability. Judges value this precision.
