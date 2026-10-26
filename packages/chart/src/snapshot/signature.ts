import type { ChartSpec } from "../model/types";

const signatures = new WeakMap<ChartSpec, string>();

/**
 * Computes the content signature that a persisted replacement image must carry.
 *
 * Keys are sorted before hashing so storage or collaboration that reorders
 * object keys keeps the signature; revision and extent are part of the spec,
 * so every content or size change invalidates older images.
 *
 * @param spec - Validated immutable chart spec.
 * @returns `chart-spec:v1:` followed by a 64-bit hex digest.
 */
export function createChartSpecSignature(spec: ChartSpec): string {
  let signature = signatures.get(spec);
  if (signature === undefined) {
    signature = `chart-spec:v1:${hash64(stableStringify(spec))}`;
    signatures.set(spec, signature);
  }
  return signature;
}

/**
 * Serializes JSON-safe data with object keys in code-unit order.
 *
 * @param value - JSON-safe value.
 * @returns Canonical JSON text.
 */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().filter((key) => record[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Hashes UTF-16 code units with two 32-bit FNV-1a lanes of different offset bases.
 *
 * @param text - Text to hash.
 * @returns Sixteen lowercase hex digits.
 */
function hash64(text: string): string {
  let high = 0x811c9dc5, low = 0x050c5d1f;
  for (let index = 0; index < text.length; index += 1) {
    const unit = text.charCodeAt(index);
    high = Math.imul(high ^ unit, 0x01000193);
    low = Math.imul(low ^ unit, 0x01000193);
  }
  return (high >>> 0).toString(16).padStart(8, "0") + (low >>> 0).toString(16).padStart(8, "0");
}
