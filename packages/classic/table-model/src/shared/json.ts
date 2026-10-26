/**
 * Serializes JSON-shaped data with deterministic recursive key ordering.
 *
 * This is a comparison mechanism, not a persistence codec. Arrays retain
 * order, while object key order is normalized at every depth.
 *
 * @param value - Candidate JSON-shaped value.
 * @returns Deterministic structural text.
 */
export function serializeStableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(serializeStableJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Readonly<Record<string, unknown>>;
    return `{${Object.keys(record).sort().map(key => (
      `${JSON.stringify(key)}:${serializeStableJson(record[key])}`
    )).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/**
 * Compares two JSON-shaped values independently of object key order.
 *
 * @param left - First candidate value.
 * @param right - Second candidate value.
 * @returns Whether both values have identical recursive structure.
 */
export function equalStableJson(left: unknown, right: unknown): boolean {
  return serializeStableJson(left) === serializeStableJson(right);
}
