const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Decode base58. Failure state: throws Error("BASE58") on bad alphabet or empty input. */
export function decodeBase58(input: string): Uint8Array {
  if (input.length === 0) throw new Error("BASE58");
  const bytes: number[] = [];
  for (const char of input) {
    let carry = ALPHABET.indexOf(char);
    if (carry < 0) throw new Error("BASE58");
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let k = 0; k < input.length && input[k] === "1"; k++) bytes.push(0);
  return Uint8Array.from(bytes.reverse());
}

export function isSolanaPubkey(value: string): boolean {
  try {
    return decodeBase58(value).length === 32;
  } catch {
    return false;
  }
}

const EVM = /^0x[0-9a-fA-F]{40}$/;

export function canonicalEvmAddress(value: string): string | null {
  if (!EVM.test(value)) return null;
  return value.toLowerCase();
}
