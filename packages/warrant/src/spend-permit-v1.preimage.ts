import { sha256 } from "@noble/hashes/sha2";
import { canonicalize } from "json-canonicalize";
import type { SpendPermitV1 } from "./spend-permit-v1.types.js";
import { validateSpendPermit } from "./spend-permit-v1.validate.js";

function bytesToHex(bytes: Uint8Array): `0x${string}` {
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * JCS (RFC 8785) of the validated permit. Signature bytes are not a field.
 * Failure state: throws Error("SPEND_PERMIT_INVALID:<reason>") if validation fails.
 * Callers that need a reason without an exception use validateSpendPermit.
 */
export function spendPermitPreimage(input: unknown): { permit: SpendPermitV1; jcs: string } {
  const result = validateSpendPermit(input);
  if (!result.ok) throw new Error(`SPEND_PERMIT_INVALID:${result.reason}`);
  return { permit: result.permit, jcs: canonicalize(result.permit) as string };
}

/**
 * Solana Ed25519 message: the raw 32-byte SHA-256 of the UTF-8 JCS preimage.
 * The executor must require the Ed25519 precompile instruction's message to be
 * exactly these 32 bytes, one signature, signer equal to issuerPubkey.
 * A signature over any other message in the same transaction is not this permit.
 */
export function solanaPermitDigest(input: unknown): `0x${string}` {
  const { jcs } = spendPermitPreimage(input);
  return bytesToHex(sha256(new TextEncoder().encode(jcs)));
}
