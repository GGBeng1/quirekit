const encodedKind = "__quirekitLitAstEncodedKind";

/** JSON value used for durable LitAST source preservation. */
export type LitAstEncodedValue =
  | null
  | boolean
  | number
  | string
  | readonly LitAstEncodedValue[]
  | { readonly [name: string]: LitAstEncodedValue };

/**
 * Checks whether a source value can survive JSON serialization.
 *
 * @param value - Candidate preservation value.
 * @returns Whether JSON serialization succeeds without erasing the root value.
 */
export function isLitAstJsonSafe(value: unknown): boolean {
  try {
    return JSON.stringify(value) !== undefined;
  } catch {
    return false;
  }
}

/**
 * Encodes Maps, typed byte arrays, arrays, and records into durable JSON.
 *
 * @param value - LitAST source value.
 * @returns JSON-safe encoded value.
 */
export function encodeLitAstPreservation(value: unknown): LitAstEncodedValue {
  return encodeValue(value, new Set<object>(), "$root");
}

/**
 * Creates encoded node-level preservation for attrs, raw XML, and metadata.
 *
 * @param node - Structural LitAST node to preserve.
 * @returns Encoded source details stored on a host model.
 */
export function createLitAstNodePreservation(node: {
  readonly attrs?: Readonly<Record<string, unknown>> | undefined;
  readonly rawXml?: string | undefined;
  readonly meta?: Readonly<Record<string, unknown>> | undefined;
}): LitAstEncodedValue {
  return encodeLitAstPreservation({
    ...(node.attrs === undefined ? {} : { attrs: node.attrs }),
    ...(node.rawXml === undefined ? {} : { rawXml: node.rawXml }),
    ...(node.meta === undefined ? {} : { meta: node.meta })
  });
}

/**
 * Restores one encoded node-preservation record.
 *
 * @param value - Encoded host-model attribute.
 * @returns Decoded source record or an empty record.
 */
export function readLitAstNodePreservation(
  value: unknown
): Readonly<Record<string, unknown>> {
  const decoded = decodeLitAstPreservation(value);
  return isRecord(decoded) ? decoded : {};
}

/**
 * Decodes a value produced by `encodeLitAstPreservation`.
 *
 * @param value - Encoded source value.
 * @returns Reconstructed Maps, byte arrays, arrays, and records.
 */
export function decodeLitAstPreservation(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decodeLitAstPreservation);
  if (!isRecord(value)) return value;
  if (value[encodedKind] === "map" && Array.isArray(value.entries)) {
    return new Map(value.entries.map((entry) => {
      if (!Array.isArray(entry) || entry.length !== 2) {
        throw new TypeError("Invalid encoded LitAST map entry.");
      }
      return [decodeLitAstPreservation(entry[0]), decodeLitAstPreservation(entry[1])];
    }));
  }
  if (value[encodedKind] === "uint8array" && Array.isArray(value.data)) {
    return Uint8Array.from(value.data.map((item) => Number(item)));
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, decodeLitAstPreservation(child)])
  );
}

/**
 * Recursively encodes one source value while rejecting cycles and unsupported data.
 *
 * @param value - Current source value.
 * @param ancestors - Active object ancestry used for cycle detection.
 * @param path - Diagnostic property path.
 * @returns JSON-safe encoded value.
 */
function encodeValue(
  value: unknown,
  ancestors: Set<object>,
  path: string
): LitAstEncodedValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`Non-finite LitAST value at ${path}.`);
    return value;
  }
  if (value === undefined) return null;
  if (typeof value !== "object") {
    throw new TypeError(`Unsupported LitAST preservation value at ${path}.`);
  }
  if (ancestors.has(value)) throw new TypeError(`Cyclic LitAST preservation value at ${path}.`);
  ancestors.add(value);
  try {
    if (value instanceof Uint8Array) {
      return { [encodedKind]: "uint8array", data: [...value] };
    }
    if (value instanceof Map) {
      return {
        [encodedKind]: "map",
        entries: [...value.entries()].map(([key, child], index) => [
          encodeValue(key, ancestors, `${path}.entries[${index}].key`),
          encodeValue(child, ancestors, `${path}.entries[${index}].value`)
        ])
      };
    }
    if (Array.isArray(value)) {
      return value.map((child, index) => encodeValue(child, ancestors, `${path}[${index}]`));
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        encodeValue(child, ancestors, `${path}.${key}`)
      ])
    );
  } finally {
    ancestors.delete(value);
  }
}

/**
 * Checks a non-array object before reading preservation fields.
 *
 * @param value - Candidate object.
 * @returns Whether the value is a record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
