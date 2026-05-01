# 🎬 Demo Script: AgentChain Guard (2 Minutes)

## 0:00 - 0:15: The Problem
"AI agents are ready to act as economic actors, but today's wallets aren't ready for them. Giving an agent your private key is like giving a robot your credit card with no limit. We need an Authority Boundary."

## 0:15 - 0:35: The Solution
"Introducing AgentChain Guard. A policy-bound settlement layer on Solana. It ensures every agent action is checked against pre-set budgets, allowlists, and human approval thresholds before a single lamport is released."

## 0:35 - 1:20: Live Demo Flow
- **Step 1: Connect Wallet**. "I'm connecting my operator wallet on Solana Devnet."
- **Step 2: Allowed Payment**. "An agent proposes a 3 USDC payment. The Policy Engine passes it, funds are escrowed, and settlement happens instantly."
- **Step 3: The Trace**. "Look at the Intent Trace. We see the exact moment the receipt was hashed and the PDA was created."
- **Step 4: Blocked Action**. "Now the agent tries a 150 USDC transfer. It's blocked by the 'max-spend' policy. No funds ever leave the treasury."
- **Step 5: Approval Flow**. "Finally, a 250 USDC payout. It requires human sign-off. I can review the receipt detail and click 'Approve & Settle' to release the funds."

## 1:20 - 1:45: Technical Proof
- "Our SDK uses deep-deterministic canonicalization to ensure receipt hashes never drift."
- "The settlement logic is fully on-chain in our Anchor program."
- "19/19 integration tests pass on LiteSVM."

## 1:45 - 2:00: Why Solana?
"Solana's throughput makes high-frequency machine payments viable. AgentChain Guard makes them safe. Built for the Frontier."
