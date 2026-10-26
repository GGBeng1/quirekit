import { isWordStyleTextProperties } from "./text/validation";
import type {
  WordNamedParagraphStyle,
  WordNamedCharacterStyle,
  WordParagraphStyleRegistry
} from "./types";

/**
 * Checks whether unknown data is a usable document paragraph style registry.
 *
 * The admission check intentionally validates identity and inheritance fields
 * while leaving detailed imported property normalization to the codecs.
 *
 * @param value - Candidate document attribute.
 * @returns Whether the registry has safe stable identities and style records.
 */
export function isWordParagraphStyleRegistry(
  value: unknown
): value is WordParagraphStyleRegistry {
  if (!isRecord(value) || !isNonEmptyString(value.defaultParagraphStyleId)) {
    return false;
  }
  if (!isRecord(value.styles)) return false;
  if (value.paragraphDefaults !== undefined && !isRecord(value.paragraphDefaults)) return false;
  if (value.textDefaults !== undefined && !isWordStyleTextProperties(value.textDefaults)) return false;
  if (value.textPropertiesVersion !== undefined && value.textPropertiesVersion !== 1) return false;
  if (value.characterStyles !== undefined) {
    if (!isRecord(value.characterStyles)) return false;
    if (!Object.entries(value.characterStyles).every(([id, style]) => isWordNamedCharacterStyle(style) && style.id === id && !Object.hasOwn(value.styles as object, id))) return false;
    const defaults = Object.values(value.characterStyles).filter(style => (style as WordNamedCharacterStyle).default) as WordNamedCharacterStyle[];
    if (defaults.length > 1 || (value.defaultCharacterStyleId != null && defaults[0]?.id !== value.defaultCharacterStyleId)) return false;
  } else if (value.defaultCharacterStyleId != null) return false;
  const styles = Object.entries(value.styles);
  if (
    styles.length === 0
    || !styles.every(([styleId, style]) =>
      isWordNamedParagraphStyle(style) && style.id === styleId)
  ) {
    return false;
  }
  const defaultStyle = value.styles[value.defaultParagraphStyleId];
  if (!isWordNamedParagraphStyle(defaultStyle) || !defaultStyle.default) {
    return false;
  }
  return styles.filter(([, style]) =>
    isWordNamedParagraphStyle(style) && style.default).length === 1;
}

/**
 * Checks one candidate named paragraph style.
 *
 * @param value - Candidate style definition.
 * @returns Whether the required identity, role, and property fields are valid.
 */
export function isWordNamedParagraphStyle(
  value: unknown
): value is WordNamedParagraphStyle {
  if (!isRecord(value) || !isNonEmptyString(value.id)) return false;
  if (!isNonEmptyString(value.name) || !isStyleRole(value.role)) return false;
  if (
    value.headingLevel !== null
    && (!Number.isInteger(value.headingLevel)
      || Number(value.headingLevel) < 1
      || Number(value.headingLevel) > 9)
  ) return false;
  if (!isNullableString(value.basedOn)
    || !isNullableString(value.next)
    || !isNullableString(value.link)) return false;
  if (!isBoolean(value.default)
    || !isBoolean(value.quickFormat)
    || !isBoolean(value.hidden)
    || !isBoolean(value.semiHidden)
    || !isBoolean(value.unhideWhenUsed)
    || !isBoolean(value.locked)) return false;
  if (
    value.uiPriority !== null
    && (!Number.isInteger(value.uiPriority) || Number(value.uiPriority) < 0)
  ) return false;
  return isRecord(value.paragraph)
    && isWordStyleTextProperties(value.text)
    && (value.preservation === null || isRecord(value.preservation))
    && isOptionalStyleNumbering(value.numbering);
}

/** @param value - Candidate character definition. @returns Whether identity, metadata and text deltas are valid. */
export function isWordNamedCharacterStyle(value: unknown): value is WordNamedCharacterStyle {
  if (!isRecord(value)) return false;
  return value.kind === "character" && !Object.hasOwn(value, "paragraph")
    && !Object.hasOwn(value, "next") && !Object.hasOwn(value, "numbering")
    && isWordNamedParagraphStyle({ ...value, role: "custom", headingLevel: null, next: null, paragraph: {} });
}

/**
 * Checks one optional style numbering reference.
 *
 * @param value - Candidate `numbering` field.
 * @returns Whether the field is absent or a valid reference.
 */
function isOptionalStyleNumbering(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (!isRecord(value)) return false;
  const level = value.level;
  return (value.numId === null || isNonEmptyString(value.numId))
    && (level === null || (Number.isInteger(level) && Number(level) >= 0 && Number(level) <= 8));
}

/**
 * Checks one style role string.
 *
 * @param value - Candidate role.
 * @returns Whether the role belongs to the canonical value space.
 */
function isStyleRole(
  value: unknown
): value is WordNamedParagraphStyle["role"] {
  return value === "body"
    || value === "title"
    || value === "subtitle"
    || value === "heading"
    || value === "custom";
}

/**
 * Checks one nullable string reference.
 *
 * @param value - Candidate reference.
 * @returns Whether the value is null or a non-empty string.
 */
function isNullableString(value: unknown): value is string | null {
  return value === null || isNonEmptyString(value);
}

/**
 * Checks one non-empty string.
 *
 * @param value - Candidate string.
 * @returns Whether the value is a non-empty string.
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Checks one boolean.
 *
 * @param value - Candidate boolean.
 * @returns Whether the value is a boolean.
 */
function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/**
 * Checks one non-null object record.
 *
 * @param value - Candidate record.
 * @returns Whether the value is an object record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
