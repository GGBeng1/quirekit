import type {
  QuireDocumentFontSet,
  QuireDocumentFontTheme
} from "./types";

/** Shared open fallbacks appended after each document-owned script family. */
const defaultDocumentFontFallbacks = Object.freeze([
  "Noto Sans SC",
  "ui-sans-serif",
  "system-ui",
  "sans-serif"
]);

/** Default document font set used by a fresh QuireKit document. */
const defaultDocumentFontSet: QuireDocumentFontSet = Object.freeze({
  latin: "Calibri",
  eastAsia: "Noto Serif SC",
  complexScript: "Calibri",
  fallbacks: defaultDocumentFontFallbacks
});

/** WPS-compatible font theme used when a new document has no source theme. */
export const quireDefaultDocumentFontTheme: QuireDocumentFontTheme = Object.freeze({
  body: defaultDocumentFontSet,
  heading: defaultDocumentFontSet
});

/**
 * Normalizes an untrusted document font set into trimmed, non-empty families.
 *
 * @param value - Candidate font-set value from JSON or file metadata.
 * @returns Normalized font set, or null when no usable family is present.
 */
export function normalizeQuireDocumentFontSet(
  value: unknown
): QuireDocumentFontSet | null {
  const record = readRecord(value);
  if (record === undefined) {
    return null;
  }
  const latin = readFamily(record.latin);
  const eastAsia = readFamily(record.eastAsia);
  const complexScript = readFamily(record.complexScript);
  const fallbacks = Array.isArray(record.fallbacks)
    ? [...new Set(record.fallbacks.map(readFamily).filter(isString))]
    : [];
  if (
    latin === undefined
    && eastAsia === undefined
    && complexScript === undefined
    && fallbacks.length === 0
  ) {
    return null;
  }
  return {
    ...(latin === undefined ? {} : { latin }),
    ...(eastAsia === undefined ? {} : { eastAsia }),
    ...(complexScript === undefined ? {} : { complexScript }),
    ...(fallbacks.length === 0 ? {} : { fallbacks })
  };
}

/**
 * Normalizes an untrusted document font theme for canonical storage.
 *
 * @param value - Candidate theme from document attrs or LitAST metadata.
 * @returns Normalized theme, or null when the required body role is empty.
 */
export function normalizeQuireDocumentFontTheme(
  value: unknown
): QuireDocumentFontTheme | null {
  const record = readRecord(value);
  const body = normalizeQuireDocumentFontSet(record?.body);
  if (body === null) {
    return null;
  }
  const heading = normalizeQuireDocumentFontSet(record?.heading);
  return {
    body,
    ...(heading === null ? {} : { heading })
  };
}

/**
 * Reads and trims one non-empty font family.
 *
 * @param value - Candidate family value.
 * @returns Trimmed family or undefined.
 */
function readFamily(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

/**
 * Narrows optional normalized strings after array mapping.
 *
 * @param value - Candidate normalized value.
 * @returns Whether the value is a string.
 */
function isString(value: string | undefined): value is string {
  return value !== undefined;
}

/**
 * Reads one non-array record.
 *
 * @param value - Candidate record.
 * @returns Record or undefined.
 */
function readRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : undefined;
}
