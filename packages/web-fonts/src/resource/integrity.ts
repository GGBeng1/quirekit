import { QuireWebFontError } from "../types";

/**
 * Computes an SRI-shaped SHA-256 digest for font bytes.
 *
 * @param data - Complete font binary.
 * @returns Digest formatted as `sha256-<base64>`.
 */
export async function computeQuireWebFontSha256(data: ArrayBuffer): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle === undefined) {
    throw new QuireWebFontError(
      "unsupported",
      "Web font integrity requires the Web Crypto subtle API"
    );
  }
  const digest = await subtle.digest("SHA-256", data);
  return `sha256-${encodeBase64(new Uint8Array(digest))}`;
}

/**
 * Verifies an expected SHA-256 digest.
 *
 * @param data - Complete font binary.
 * @param expected - Expected SRI-shaped SHA-256 value.
 * @returns Observed digest when it matches.
 */
export async function verifyQuireWebFontIntegrity(
  data: ArrayBuffer,
  expected: string
): Promise<string> {
  if (!/^sha256-[A-Za-z0-9+/]+={0,2}$/.test(expected)) {
    throw new QuireWebFontError("integrity", `Invalid web font integrity value "${expected}"`);
  }
  const observed = await computeQuireWebFontSha256(data);
  if (observed !== expected) {
    throw new QuireWebFontError("integrity", "Downloaded web font failed SHA-256 validation");
  }
  return observed;
}

/**
 * Encodes bytes as base64 without a Node-only runtime dependency.
 *
 * @param bytes - Digest bytes.
 * @returns Base64 text.
 */
function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
