import type { QuireClipboardResource, QuireEditor } from "@quirekit/core";
import { Slice } from "@quirekit/pm";
import type {
  QuireInternalClipboardPayload,
  QuireInternalClipboardTransfer
} from "./types";

/** Private MIME type used to preserve QuireKit slices on the clipboard. */
export const canvasInternalClipboardMime = "application/x-quirekit-slice+json";

const internalClipboardType = "quirekit/slice";
const internalClipboardVersion = 1;
const internalClipboardSchema = "quirekit";

/**
 * Serializes a slice as the private QuireKit clipboard JSON payload.
 *
 * @param slice - Slice to serialize.
 * @param resources - Extension-owned resources referenced by the slice.
 * @returns JSON payload for the private clipboard MIME.
 */
export function serializeQuireInternalClipboardSlice(
  slice: Slice,
  resources: readonly QuireClipboardResource[] = []
): string {
  const normalizedResources = normalizeQuireClipboardResources(resources);
  const payload: QuireInternalClipboardPayload = {
    type: internalClipboardType,
    version: internalClipboardVersion,
    schema: internalClipboardSchema,
    slice: slice.toJSON(),
    ...(normalizedResources.length === 0
      ? {}
      : { resources: normalizedResources })
  };

  return JSON.stringify(payload);
}

/**
 * Parses a private QuireKit clipboard JSON payload.
 *
 * @param value - Clipboard MIME payload.
 * @param editor - Editor whose schema should own the parsed slice.
 * @returns Parsed slice, or null when the payload is absent or incompatible.
 */
export function parseQuireInternalClipboardSlice(
  value: string,
  editor: QuireEditor
): Slice | null {
  return parseQuireInternalClipboardPayload(value, editor)?.slice ?? null;
}

/**
 * Parses a private QuireKit clipboard transfer including extension resources.
 *
 * @param value - Clipboard MIME payload.
 * @param editor - Editor whose schema should own the parsed slice.
 * @returns Parsed transfer, or null when the payload is absent or incompatible.
 */
export function parseQuireInternalClipboardPayload(
  value: string,
  editor: QuireEditor
): QuireInternalClipboardTransfer | null {
  if (value.trim().length === 0) {
    return null;
  }

  try {
    const payload = JSON.parse(value) as Partial<QuireInternalClipboardPayload>;

    if (
      payload.type !== internalClipboardType ||
      payload.version !== internalClipboardVersion ||
      payload.schema !== internalClipboardSchema
    ) {
      return null;
    }

    return {
      slice: Slice.fromJSON(editor.state.schema, payload.slice),
      resources: normalizeQuireClipboardResources(payload.resources ?? [])
    };
  } catch {
    return null;
  }
}

/**
 * Filters, deduplicates, and clones JSON-safe clipboard resources.
 *
 * @param resources - Extension-owned resource candidates.
 * @returns Valid resources in first-occurrence order.
 */
export function normalizeQuireClipboardResources(
  resources: readonly QuireClipboardResource[]
): readonly QuireClipboardResource[] {
  const normalized: QuireClipboardResource[] = [];
  const seen = new Set<string>();
  for (const resource of resources) {
    if (!isValidResource(resource) || !isJsonSafe(resource.data, new Set())) {
      continue;
    }
    const identity = `${resource.namespace}\u0000${resource.version}\u0000${resource.key}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    normalized.push({
      namespace: resource.namespace,
      version: resource.version,
      key: resource.key,
      data: resource.data
    });
  }
  return normalized;
}

/**
 * Validates the stable clipboard resource envelope.
 *
 * @param value - Candidate resource.
 * @returns Whether its transport fields are valid.
 */
function isValidResource(value: unknown): value is QuireClipboardResource {
  return isRecord(value)
    && typeof value.namespace === "string"
    && value.namespace.length > 0
    && Number.isSafeInteger(value.version)
    && Number(value.version) > 0
    && typeof value.key === "string"
    && value.key.length > 0;
}

/**
 * Checks whether one resource payload can survive JSON serialization exactly.
 *
 * @param value - Candidate payload value.
 * @param ancestors - Objects on the active recursion path.
 * @returns Whether the value belongs to the JSON value space.
 */
function isJsonSafe(value: unknown, ancestors: Set<object>): boolean {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object") return false;
  if (ancestors.has(value)) return false;
  ancestors.add(value);
  const result = Array.isArray(value)
    ? value.every((item) => isJsonSafe(item, ancestors))
    : Object.getPrototypeOf(value) === Object.prototype
      && Object.entries(value).every(([, item]) => isJsonSafe(item, ancestors));
  ancestors.delete(value);
  return result;
}

/**
 * Checks whether a candidate is a non-array object.
 *
 * @param value - Candidate value.
 * @returns Whether record property access is safe.
 */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
