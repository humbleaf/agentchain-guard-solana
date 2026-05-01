# 🎬 Final Demo Script: AgentChain Guard (120s)

**Vibe**: Calm, technical, confident. No marketing goblin energy.

---

## 0:00 - 0:15: The Thesis
"AI agents are ready to trade, but our wallets aren't ready for them. Giving an agent a private key is a liability. We built AgentChain Guard to provide the physical Authority Boundary that agents need to move money safely."

## 0:15 - 0:40: The Setup & Mode
"I'm connecting my operator wallet on Solana Devnet. You'll see we're in 'Devnet Authority' mode. If you're reviewing this locally, the dashboard supports a zero-setup 'Simulation Mode' to demonstrate the logic without Devnet SOL."

## 0:40 - 1:05: Deterministic Proof (The "Wow" Moment)
"Let's run an 'Allowed Payment'. An agent proposes a 3 USDC action. Watch the 'Determinism Lock'. Our SDK recursively sorts the agent's metadata to create a SHA-256 receipt. This hash is the immutable proof of intent that gates the on-chain vault."

## 1:05 - 1:30: Policy & Human Gate
"Now, a 250 USDC payout. This exceeds our 100 USDC threshold. The status changes to 'Requires Approval'. I can open the receipt, audit the deterministic JSON, and sign the approval PDA to release the funds. Real-time safety, human oversight."

## 1:30 - 1:50: Technical Verification
"This isn't just a UI. Every state transition is backed by our Anchor program. We have 19 integration tests running in LiteSVM and 3 SDK unit tests ensuring our hashing never drifts. It is mathematically verifiable."

## 1:50 - 2:00: Closing
"Solana gives agents speed. AgentChain Guard gives them permission. We are the trust layer for the Agentic Internet. Built by Humbleaf for the Frontier."

---

## 💡 Narration Tips
- **Pause** for 1 second after saying "Determinism Lock" to let the judge see the UI update.
- **Don't rush** the wallet signature; use that time to explain the approval PDA.
- **Be clear** about what is simulated vs real; it builds credibility.
