import type {
  QuireRenderParityArea,
  QuireRenderParityGap
} from "./types";

const parityGeometryPrecision = 1e-9;

/** Mutable context shared while one parity area is normalized. */
interface QuireRenderParitySerializationContext {
  /** Area receiving serialization gaps. */
  readonly area: QuireRenderParityArea;
  /** Collected explicit serialization gaps. */
  readonly gaps: QuireRenderParityGap[];
  /** Objects currently being traversed for cycle detection. */
  readonly ancestors: Set<object>;
}

/** Result of canonical parity serialization. */
export interface QuireRenderParitySerializationResult {
  /** Canonical JSON payload. */
  readonly value: string;
  /** Explicit gaps found while normalizing the payload. */
  readonly gaps: readonly QuireRenderParityGap[];
}

/**
 * Serializes renderer-neutral facts with deterministic object-key ordering.
 *
 * @param area - Parity area owning the facts.
 * @param value - Facts to normalize.
 * @returns Canonical JSON plus explicit unsupported-value gaps.
 */
export function serializeQuireRenderParityFacts(
  area: QuireRenderParityArea,
  value: unknown
): QuireRenderParitySerializationResult {
  const gaps: QuireRenderParityGap[] = [];
  const normalized = normalizeParityValue(value, "$", {
    area,
    gaps,
    ancestors: new Set<object>()
  });

  return {
    value: JSON.stringify(normalized),
    gaps
  };
}

/**
 * Normalizes one value into deterministic JSON-compatible data.
 *
 * @param value - Current value.
 * @param path - Stable diagnostic path.
 * @param context - Serialization state and gap collector.
 * @returns JSON-compatible normalized value.
 */
function normalizeParityValue(
  value: unknown,
  path: string,
  context: QuireRenderParitySerializationContext
): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? normalizeParityNumber(value) : String(value);
  }
  if (value === undefined) {
    return { $undefined: true };
  }
  if (typeof value === "bigint") {
    return { $bigint: value.toString() };
  }
  if (typeof value === "function" || typeof value === "symbol") {
    appendSerializationGap(path, typeof value, context);
    return { $unsupported: typeof value };
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) => normalizeParityValue(
      entry,
      `${path}[${index}]`,
      context
    ));
  }
  if (ArrayBuffer.isView(value)) {
    return Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
  }
  if (typeof value !== "object") {
    appendSerializationGap(path, typeof value, context);
    return { $unsupported: typeof value };
  }
  if (context.ancestors.has(value)) {
    appendSerializationGap(path, "cyclic object", context);
    return { $unsupported: "cycle" };
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    const name = value.constructor?.name ?? "object";
    appendSerializationGap(path, name, context);
    return { $unsupported: name };
  }

  context.ancestors.add(value);
  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    normalized[key] = normalizeParityValue(
      (value as Record<string, unknown>)[key],
      `${path}.${key}`,
      context
    );
  }
  context.ancestors.delete(value);
  return normalized;
}

/**
 * Removes arithmetic noise below the parity diagnostic's CSS-pixel precision.
 *
 * This is intentionally much smaller than one device-independent pixel. It
 * canonicalizes equivalent affine arithmetic while preserving visible geometry
 * differences as hard mismatches.
 *
 * @param value - Finite renderer-neutral numeric fact.
 * @returns Number rounded to the canonical parity precision.
 */
function normalizeParityNumber(value: number): number {
  return Math.round(value / parityGeometryPrecision) * parityGeometryPrecision;
}

/**
 * Records an unsupported serialization fact.
 *
 * @param path - Stable path to the unsupported value.
 * @param kind - Runtime value category.
 * @param context - Gap collector receiving the diagnostic.
 */
function appendSerializationGap(
  path: string,
  kind: string,
  context: QuireRenderParitySerializationContext
): void {
  context.gaps.push({
    code: "non-serializable-fact",
    area: context.area,
    path,
    message: `Parity facts at ${path} contain unsupported ${kind}.`
  });
}
