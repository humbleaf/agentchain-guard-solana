import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hashTypedData } from "viem";
import {
  solanaPermitDigest,
  spendPermitPreimage,
  validateSpendPermit,
  SOLANA_DEVNET_USDC_MINT,
  BASE_SEPOLIA_USDC,
  type SpendPermitV1,
} from "../src/index.js";

const dir = fileURLToPath(new URL(".", import.meta.url));
const vectorsPath = resolve(dir, "parity/permit/spend-permit-v1-vectors.json");

const PROGRAM = "HutGfrkJTsaGMC4bs7X2EFsbbP8LaTEDkWsEBM86RGHz";
const VAULT = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const AGENT = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const RECIPIENT = "11111111111111111111111111111111";
const ISSUER = "SysvarC1ock11111111111111111111111111111111";
const HASH = `0x${"ab".repeat(32)}` as const;

function solanaPermit(overrides: Partial<SpendPermitV1> = {}): SpendPermitV1 {
  return {
    permitVersion: "spend-permit-v1",
    signingDomain: "spend-permit-v1",
    canonicalization: "jcs-rfc8785-v1",
    chain: "solana-devnet",
    executor: PROGRAM,
    vault: VAULT,
    agent: AGENT,
    recipient: RECIPIENT,
    issuerPubkey: ISSUER,
    asset: SOLANA_DEVNET_USDC_MINT,
    assetDecimals: 6,
    amount: "40000000",
    permitId: "permit-40",
    operationId: "pay-40",
    replayNonce: "1",
    reservationId: "res-40",
    warrantHash: HASH,
    policyHash: HASH,
    approvalHash: null,
    issuerKeyId: "issuer-dev",
    issuerEpoch: 1,
    issuedAt: 1_760_000_000,
    expiresAt: 1_760_003_600,
    ...overrides,
  };
}

function basePermit(): SpendPermitV1 {
  return {
    ...solanaPermit(),
    chain: "base-sepolia",
    executor: "0x1111111111111111111111111111111111111111",
    vault: "0x2222222222222222222222222222222222222222",
    agent: "0x3333333333333333333333333333333333333333",
    recipient: "0x4444444444444444444444444444444444444444",
    issuerPubkey: "0x5555555555555555555555555555555555555555",
    asset: BASE_SEPOLIA_USDC,
    permitId: "permit-base-40",
    operationId: "pay-base-40",
  };
}

describe("spend-permit-v1 freeze", () => {
  it("rejects unknown version, evidence domain, float amount, and mainnet chain", () => {
    expect(validateSpendPermit({ permitVersion: "spend-permit-v9" }).ok).toBe(false);
    expect(validateSpendPermit({ ...solanaPermit(), signingDomain: "warrant-evidence-v1" as "spend-permit-v1" }).reason).toBe(
      "EVIDENCE_DOMAIN_REJECTED",
    );
    expect(validateSpendPermit({ ...solanaPermit(), amount: "40.0" }).reason).toBe("AMOUNT_NOT_ATOMIC");
    expect(validateSpendPermit({ ...solanaPermit(), chain: "base" as "solana-devnet" }).reason).toBe("CHAIN_NOT_ALLOWED");
    expect(validateSpendPermit({ ...solanaPermit(), asset: "So11111111111111111111111111111111111111112" }).reason).toBe(
      "ASSET_NOT_PINNED",
    );
    expect(validateSpendPermit({ ...basePermit(), chain: "solana-mainnet" as "solana-devnet" }).reason).toBe(
      "CHAIN_NOT_ALLOWED",
    );
  });

  it("matches the frozen Solana and Base digests", () => {
    const vectors = JSON.parse(readFileSync(vectorsPath, "utf8")) as {
      solana: { jcs: string; sha256: string };
      base: { jcs: string; sha256: string; eip712Predeploy: string };
    };
    const sol = spendPermitPreimage(solanaPermit());
    expect(sol.jcs).toBe(vectors.solana.jcs);
    expect(solanaPermitDigest(solanaPermit())).toBe(vectors.solana.sha256);

    const base = spendPermitPreimage(basePermit());
    expect(base.jcs).toBe(vectors.base.jcs);
    expect(solanaPermitDigest(basePermit())).toBe(vectors.base.sha256);

    const digest = hashTypedData({
      domain: {
        name: "Warrant Spend Permit",
        version: "1",
        chainId: 84532,
        verifyingContract: "0x0000000000000000000000000000000000000000",
      },
      types: {
        SpendPermit: [
          { name: "permitId", type: "string" },
          { name: "operationId", type: "string" },
          { name: "replayNonce", type: "string" },
          { name: "executor", type: "address" },
          { name: "vault", type: "address" },
          { name: "agent", type: "address" },
          { name: "recipient", type: "address" },
          { name: "issuer", type: "address" },
          { name: "asset", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "issuerEpoch", type: "uint32" },
          { name: "issuedAt", type: "uint64" },
          { name: "expiresAt", type: "uint64" },
          { name: "warrantHash", type: "bytes32" },
          { name: "policyHash", type: "bytes32" },
          { name: "approvalHash", type: "bytes32" },
        ],
      },
      primaryType: "SpendPermit",
      message: {
        permitId: base.permit.permitId,
        operationId: base.permit.operationId,
        replayNonce: base.permit.replayNonce,
        executor: base.permit.executor as `0x${string}`,
        vault: base.permit.vault as `0x${string}`,
        agent: base.permit.agent as `0x${string}`,
        recipient: base.permit.recipient as `0x${string}`,
        issuer: base.permit.issuerPubkey as `0x${string}`,
        asset: base.permit.asset as `0x${string}`,
        amount: BigInt(base.permit.amount),
        issuerEpoch: base.permit.issuerEpoch,
        issuedAt: BigInt(base.permit.issuedAt),
        expiresAt: BigInt(base.permit.expiresAt),
        warrantHash: base.permit.warrantHash as `0x${string}`,
        policyHash: base.permit.policyHash as `0x${string}`,
        approvalHash: `0x${"00".repeat(32)}` as `0x${string}`,
      },
    });
    expect(digest).toBe(vectors.base.eip712Predeploy);
  });

  it("changes the digest when the recipient or amount changes", () => {
    const original = solanaPermitDigest(solanaPermit());
    expect(solanaPermitDigest(solanaPermit({ recipient: VAULT }))).not.toBe(original);
    expect(solanaPermitDigest(solanaPermit({ amount: "40000001" }))).not.toBe(original);
    expect(solanaPermitDigest(solanaPermit({ issuerEpoch: 2 }))).not.toBe(original);
  });
});
