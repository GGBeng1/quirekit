import type {
  QuireWebFontLicenseNotice
} from "../../types";
import type {
  QuireFontSourceText
} from "../types";

/**
 * Parses a required family license.
 *
 * @param value - Unknown license value.
 * @returns Valid immutable license notice.
 */
export function parseLicense(value: unknown): QuireWebFontLicenseNotice {
  const record = requireRecord(value, "license");
  const spdxId = optionalString(record.spdxId, "SPDX id");
  return Object.freeze({
    name: requireString(record.name, "license name"),
    url: requireHttpsUrl(record.url, undefined, "license URL"),
    ...(spdxId === undefined ? {} : { spdxId })
  });
}

/**
 * Parses JSON-safe localizable text.
 *
 * @param value - Unknown text value.
 * @param label - Diagnostic field label.
 * @returns Valid immutable localizable text.
 */
export function parseText(value: unknown, label: string): QuireFontSourceText {
  const record = requireRecord(value, label);
  const translations = record.translations === undefined
    ? undefined
    : Object.freeze(Object.fromEntries(Object.entries(requireRecord(
      record.translations,
      `${label} translations`
    )).map(([key, entry]) => [key, requireString(entry, `${label} translation`)])));
  return Object.freeze({
    default: requireString(record.default, label),
    ...(translations === undefined ? {} : { translations })
  });
}

/**
 * Requires one HTTPS URL, optionally relative to a trusted descriptor.
 *
 * @param value - Unknown URL value.
 * @param base - Optional trusted absolute base URL.
 * @param label - Diagnostic field label.
 * @returns Absolute HTTPS URL text.
 */
export function requireHttpsUrl(
  value: unknown,
  base: string | undefined,
  label: string
): string {
  const parsed = new URL(requireString(value, label), base);
  if (parsed.protocol !== "https:") throw new TypeError(`${label} must use HTTPS.`);
  parsed.username = "";
  parsed.password = "";
  return parsed.href;
}

/**
 * Requires a non-floating version token.
 *
 * @param value - Unknown version value.
 * @param label - Diagnostic field label.
 * @returns Exact version token.
 */
export function requireExactVersion(value: unknown, label: string): string {
  const result = requireString(value, label);
  if (/^(?:latest|next|\*|x)$/iu.test(result) || /[~^*]/u.test(result)) {
    throw new TypeError(`${label} must be exact rather than floating.`);
  }
  return result;
}

/**
 * Requires one string matching a policy pattern.
 *
 * @param value - Unknown string value.
 * @param label - Diagnostic field label.
 * @param pattern - Required policy pattern.
 * @returns Matching trimmed string.
 */
export function requireMatchingString(
  value: unknown,
  label: string,
  pattern: RegExp
): string {
  const result = requireString(value, label);
  if (!pattern.test(result)) throw new TypeError(`Invalid ${label}.`);
  return result;
}

/**
 * Requires one trimmed non-empty string.
 *
 * @param value - Unknown string value.
 * @param label - Diagnostic field label.
 * @returns Trimmed non-empty string.
 */
export function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`Missing ${label}.`);
  }
  return value.trim();
}

/**
 * Reads one optional string.
 *
 * @param value - Unknown optional value.
 * @param label - Diagnostic field label.
 * @returns Trimmed string or `undefined`.
 */
export function optionalString(value: unknown, label: string): string | undefined {
  return value === undefined ? undefined : requireString(value, label);
}

/**
 * Requires one array of non-empty strings.
 *
 * @param value - Unknown array value.
 * @param label - Diagnostic field label.
 * @returns Immutable string array.
 */
export function requireStringArray(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  return Object.freeze(value.map((entry) => requireString(entry, label)));
}

/**
 * Reads one optional non-negative integer.
 *
 * @param value - Unknown optional number.
 * @param label - Diagnostic field label.
 * @returns Valid integer or `undefined`.
 */
export function optionalNonNegativeInteger(
  value: unknown,
  label: string
): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new TypeError(`${label} must be a non-negative integer.`);
  }
  return value as number;
}

/**
 * Requires one non-array record.
 *
 * @param value - Unknown record value.
 * @param label - Diagnostic field label.
 * @returns Mutable validation record.
 */
export function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

/**
 * Removes undefined values from one descriptor record.
 *
 * @param value - Descriptor record containing optional values.
 * @returns Shallow record without undefined entries.
 */
export function definedEntries<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Partial<T>;
}
