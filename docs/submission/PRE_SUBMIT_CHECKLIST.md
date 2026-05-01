# ✅ Pre-Submit Checklist: AgentChain Guard

Run this checklist 30 minutes before the Colosseum deadline.

## 🛠️ Code & Verification
- [ ] `make clean`
- [ ] `make test-all` (Ensure all 19 integration + 3 SDK tests pass)
- [ ] `pnpm build` (Ensure no TypeScript or build errors in dashboard/SDK)
- [ ] Check `.keys/` directory — ensure no real private keys are accidentally committed.
- [ ] Check `Anchor.toml` — ensure it points to `devnet`.

## 📋 Documentation
- [ ] `README.md` links correctly to all `docs/submission` files.
- [ ] `FRESH_CLONE_RUNBOOK.md` verified — can a teammate clone and run `pnpm install`?
- [ ] `CLAIM_MATRIX.md` matches the current code state.
- [ ] `SUBMISSION_FORM_ANSWERS.md` reviewed for typos and positioning.

## 🎥 Video
- [ ] Recorded according to `VIDEO_SHOT_LIST.md`.
- [ ] Length is < 120 seconds.
- [ ] Resolution is 1080p.
- [ ] Audio is clear.
- [ ] Link works (YouTube/Vimeo/Google Drive).

## 🛰️ Wallet & Devnet
- [ ] Deployer wallet has > 0.5 SOL on Devnet.
- [ ] Program is successfully deployed and verified on Devnet explorer.
- [ ] Minted a mock token for the demo (USDC).

## 🔗 Final Links
- [ ] GitHub Repo is public or judge-accessible.
- [ ] Devnet Program ID is correct in the form.
- [ ] Demo URL works (if hosted).
