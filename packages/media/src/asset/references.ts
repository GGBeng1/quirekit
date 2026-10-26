import { QuireMediaAssetValidationError } from "./errors";
import type {
  QuireAssetMediaReference,
  QuireExternalMediaReference,
  QuireMediaReference
} from "./types";

/** Prefix that distinguishes opaque media identity from a browser-fetchable URL. */
const quireMediaResourceKeyPrefix = "quirekit-media:";

/**
 * Creates one validated, JSON-safe asset reference.
 *
 * @param assetId - Stable host-defined asset identifier.
 * @returns A frozen canonical asset reference.
 */
export function createQuireAssetMediaReference(
  assetId: string
): QuireAssetMediaReference {
  assertCanonicalNonEmptyString(assetId, "asset id", "invalid-id");
  return Object.freeze({ kind: "asset", assetId });
}

/**
 * Creates one validated, JSON-safe external reference.
 *
 * @param href - Preserved external location controlled by host policy.
 * @returns A frozen canonical external reference.
 */
export function createQuireExternalMediaReference(
  href: string
): QuireExternalMediaReference {
  assertCanonicalNonEmptyString(
    href,
    "external media href",
    "invalid-reference"
  );
  return Object.freeze({ kind: "external", href });
}

/**
 * Parses an unknown value into one canonical media reference.
 *
 * @param value - Unknown JSON-like value.
 * @returns A frozen canonical reference, or undefined for invalid input.
 */
export function parseQuireMediaReference(
  value: unknown
): QuireMediaReference | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  try {
    if (value.kind === "asset" && typeof value.assetId === "string") {
      return createQuireAssetMediaReference(value.assetId);
    }
    if (value.kind === "external" && typeof value.href === "string") {
      return createQuireExternalMediaReference(value.href);
    }
  } catch (error) {
    if (error instanceof QuireMediaAssetValidationError) {
      return undefined;
    }
    throw error;
  }
  return undefined;
}

/**
 * Formats one media reference as an opaque renderer resource key.
 *
 * The returned value represents portable identity only. Render surfaces must
 * not treat it as a URL or assign it to `src`/`href`.
 *
 * @param reference - Canonical media reference to encode.
 * @returns Stable opaque resource key.
 */
export function formatQuireMediaResourceKey(
  reference: QuireMediaReference
): string {
  if (reference.kind === "asset") {
    return `${quireMediaResourceKeyPrefix}asset:${encodeURIComponent(reference.assetId)}`;
  }
  // Layout formats the same embedded data URLs every frame; encoding them is linear in their size.
  let key = encodedExternalKeys.get(reference.href);
  if (key === undefined) {
    key = `${quireMediaResourceKeyPrefix}external:${encodeURIComponent(reference.href)}`;
    encodedExternalLength += reference.href.length;
    for (const [href] of encodedExternalKeys) {
      if (encodedExternalLength <= maxEncodedExternalLength) break;
      encodedExternalKeys.delete(href);
      encodedExternalLength -= href.length;
    }
    encodedExternalKeys.set(reference.href, key);
  }
  return key;
}

/** Recently encoded external keys in insertion order. */
const encodedExternalKeys = new Map<string, string>();
/** Source characters represented by {@link encodedExternalKeys}. */
let encodedExternalLength = 0;
/** Character budget for retained encodings; embedded previews dominate it. */
const maxEncodedExternalLength = 4 * 1024 * 1024;

/**
 * Parses an opaque renderer resource key into one canonical media reference.
 *
 * @param key - Candidate resource key.
 * @returns Canonical reference, or undefined when the key is malformed.
 */
export function parseQuireMediaResourceKey(
  key: string
): QuireMediaReference | undefined {
  if (!key.startsWith(quireMediaResourceKeyPrefix)) {
    return undefined;
  }

  const payload = key.slice(quireMediaResourceKeyPrefix.length);
  const separator = payload.indexOf(":");
  if (separator < 0) {
    return undefined;
  }

  const kind = payload.slice(0, separator);
  try {
    const value = decodeURIComponent(payload.slice(separator + 1));
    return kind === "asset"
      ? createQuireAssetMediaReference(value)
      : kind === "external"
        ? createQuireExternalMediaReference(value)
        : undefined;
  } catch (error) {
    if (
      error instanceof URIError
      || error instanceof QuireMediaAssetValidationError
    ) {
      return undefined;
    }
    throw error;
  }
}

/**
 * Compares media references by their portable identity.
 *
 * @param left - First reference.
 * @param right - Second reference.
 * @returns True when both references identify the same portable source.
 */
export function areQuireMediaReferencesEqual(
  left: QuireMediaReference,
  right: QuireMediaReference
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  return left.kind === "asset"
    ? left.assetId === (right as QuireAssetMediaReference).assetId
    : left.href === (right as QuireExternalMediaReference).href;
}

/**
 * Requires a canonical non-empty string without silently changing identity.
 *
 * @param value - Candidate identifier or location.
 * @param label - Diagnostic field label.
 * @param code - Machine-readable validation failure.
 */
function assertCanonicalNonEmptyString(
  value: string,
  label: string,
  code: "invalid-id" | "invalid-reference"
): void {
  if (value.length === 0 || value.trim() !== value) {
    throw new QuireMediaAssetValidationError(
      code,
      `Expected ${label} to be a non-empty canonical string.`
    );
  }
}

/**
 * Narrows an unknown value to a string-keyed object.
 *
 * @param value - Unknown candidate.
 * @returns True when the value is a non-null object and not an array.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
