import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

/**
 * Creates a stable SHA-256 key for byte-backed OFD resources.
 *
 * @param data - Complete resource bytes.
 * @returns Lowercase hexadecimal SHA-256 digest.
 */
export function digestOFDBytes(data: Uint8Array): string {
  return bytesToHex(sha256(data));
}

/**
 * Creates a stable SHA-256 key for UTF-8 OFD model evidence.
 *
 * @param value - Deterministic model evidence.
 * @returns Lowercase hexadecimal SHA-256 digest.
 */
export function digestOFDText(value: string): string {
  return bytesToHex(sha256(utf8ToBytes(value)));
}
