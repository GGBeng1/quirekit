import type { OFDSfntType } from "./types";

/**
 * Copies caller-owned font bytes into an immutable working value.
 *
 * @param data - Candidate font bytes.
 * @returns Independent byte array.
 */
export function copyFontBytes(
  data: Uint8Array | ArrayBuffer
): Uint8Array {
  return data instanceof Uint8Array
    ? new Uint8Array(data)
    : new Uint8Array(data.slice(0));
}

/**
 * Detects the complete sfnt containers accepted by the writer.
 *
 * @param data - Complete source bytes.
 * @returns Standalone outline flavor, or undefined.
 */
export function detectSfntType(
  data: Uint8Array
): OFDSfntType | undefined {
  if (matchesSignature(data, [0x00, 0x01, 0x00, 0x00])) return "ttf";
  if (matchesSignature(data, [0x4f, 0x54, 0x54, 0x4f])) return "otf";
  return undefined;
}

/**
 * Validates, deduplicates, and sorts requested Unicode scalar values.
 *
 * @param values - Caller-owned scalar iterable.
 * @returns Stable numeric code-point array.
 */
export function normalizeCodePoints(values: Iterable<number>): number[] {
  const unique = new Set<number>();
  for (const value of values) {
    if (!Number.isInteger(value)
      || value < 0
      || value > 0x10ffff
      || (value >= 0xd800 && value <= 0xdfff)) {
      throw new TypeError(
        `OFD font subset code point ${String(value)} is not a Unicode scalar value.`
      );
    }
    unique.add(value);
  }
  if (unique.size === 0) {
    throw new TypeError("OFD font subsetting requires at least one code point.");
  }
  return [...unique].sort((left, right) => left - right);
}

/**
 * Rejects duplicate or out-of-range top-level sfnt table records.
 *
 * A unique, bounded directory is the minimum structural evidence required
 * before a more tolerant font parser reopens the result.
 *
 * @param data - Encoded standalone sfnt bytes.
 */
export function validateSfntTableDirectory(data: Uint8Array): void {
  if (data.byteLength < 12) {
    throw new TypeError("The OFD font subset has a truncated table directory.");
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const count = view.getUint16(4, false);
  const directoryEnd = 12 + count * 16;
  if (directoryEnd > data.byteLength) {
    throw new TypeError("The OFD font subset has a truncated table directory.");
  }
  const tags = new Set<string>();
  for (let index = 0; index < count; index += 1) {
    const recordOffset = 12 + index * 16;
    const tag = readSfntTag(data, recordOffset);
    if (tags.has(tag)) {
      throw new TypeError(
        `The OFD font subset contains duplicate ${tag} tables.`
      );
    }
    tags.add(tag);
    const tableOffset = view.getUint32(recordOffset + 8, false);
    const tableLength = view.getUint32(recordOffset + 12, false);
    if (tableOffset > data.byteLength
      || tableLength > data.byteLength - tableOffset) {
      throw new TypeError(
        `The OFD font subset ${tag} table exceeds the font bytes.`
      );
    }
  }
}

/**
 * Matches one leading byte signature.
 *
 * @param data - Candidate bytes.
 * @param signature - Required leading bytes.
 * @returns Whether every signature byte matches.
 */
function matchesSignature(
  data: Uint8Array,
  signature: readonly number[]
): boolean {
  return signature.every((value, index) => data[index] === value);
}

/**
 * Reads one four-byte sfnt table tag.
 *
 * @param data - Complete font bytes.
 * @param offset - Table-record offset.
 * @returns Four-character table tag.
 */
function readSfntTag(data: Uint8Array, offset: number): string {
  return String.fromCharCode(
    data[offset]!,
    data[offset + 1]!,
    data[offset + 2]!,
    data[offset + 3]!
  );
}
