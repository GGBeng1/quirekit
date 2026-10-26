import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import type { LitAstNode } from '../core/contracts.js';
import type { DocxRoundTripMetadata, DocxRoundTripValue } from './types.js';

export const metadataKey = 'docxRoundTrip';
export const baselineKey = 'docxRoundTripBaseline';
export const optionalKey = 'docxRoundTripOptional';
export const namespace = 'urn:quirekit:docx:round-trip:1';
export const maxStoreBytes = 1_048_576;

/** @param value - UTF-8 or binary content. @returns Stable SHA-256 digest; not an authenticity signature. */
export function digest(value: string | Uint8Array): string {
  return bytesToHex(sha256(typeof value === 'string' ? new TextEncoder().encode(value) : value));
}

/** @param value - External or authored metadata. @returns A detached JSON value, rejecting executable and oversized values. */
export function validateMetadata(value: unknown): DocxRoundTripMetadata {
  if (!value || typeof value !== 'object' || !('version' in value) || !('data' in value)
    || !Number.isSafeInteger(value.version) || Number(value.version) < 1) throw new TypeError('Invalid round-trip metadata version.');
  let count = 0;
  /** @param input - Untrusted JSON candidate. @param depth - Bounded nesting. @returns Detached JSON data. */
  function visit(input: unknown, depth: number): DocxRoundTripValue {
    if (++count > 10_000 || depth > 32) throw new RangeError('Round-trip metadata exceeds its structure budget.');
    if (input === null || typeof input === 'string' || typeof input === 'boolean') return input;
    if (typeof input === 'number' && Number.isFinite(input)) return input;
    if (Array.isArray(input)) return input.map(item => visit(item, depth + 1));
    if (input && typeof input === 'object' && [Object.prototype, null].includes(Object.getPrototypeOf(input))) {
      return Object.fromEntries(Object.entries(input).map(([key, item]) => [key, visit(item, depth + 1)]));
    }
    throw new TypeError('Round-trip metadata must contain only JSON values.');
  }
  const result = { version: Number(value.version), data: visit(value.data, 0) };
  if (new TextEncoder().encode(JSON.stringify(result)).length > 65_536) throw new RangeError('Round-trip metadata exceeds 64 KiB.');
  return result;
}

/** @param node - Authored or parsed control. @returns Fingerprint used to invalidate subsequent in-memory edits. */
export function semanticBaseline(node: LitAstNode): string {
  return digest(JSON.stringify(node, (key, value) => key === metadataKey || key === baselineKey ? undefined : value));
}

/** @param node - Tagged fallback. @returns Valid metadata only while its parsed visible content remains unchanged. */
export function readRoundTripMetadata(node: LitAstNode): DocxRoundTripMetadata | undefined {
  const value = node.meta?.[metadataKey];
  if (value === undefined || node.type !== 'sdt') return undefined;
  if (node.meta?.[baselineKey] !== undefined && node.meta[baselineKey] !== semanticBaseline(node)) return undefined;
  try { return validateMetadata(value); } catch { return undefined; }
}
