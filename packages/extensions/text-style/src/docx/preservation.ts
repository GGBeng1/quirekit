import {
  decodeLitAstPreservation,
  encodeLitAstPreservation
} from "@quirekit/lit-docx-contract";
import { readNonEmptyString, readRecord } from "./attributes";

const themeColorAttributes = [
  "themeColor",
  "themeShade",
  "themeTint"
] as const;

const themeFillAttributes = [
  "themeFill",
  "themeFillShade",
  "themeFillTint"
] as const;

const preservedLitAstAttributes = [
  "fontHint",
  "fontFamilyAsciiTheme",
  "fontFamilyHighAnsiTheme",
  "fontFamilyEastAsiaTheme",
  "fontFamilyComplexScriptTheme",
  ...themeColorAttributes,
  ...themeFillAttributes,
  "kern",
  "eastAsianLayout",
  "_rPrPreservation"
] as const;

/** Producer metadata retained on one canonical textStyle mark. */
export interface TextStylePreservation {
  /** Original non-editable attributes projected back during export. */
  readonly attributes: Readonly<Record<string, unknown>>;
  /** Original editable direct values used to detect replacement. */
  readonly editable: Readonly<Record<string, unknown>>;
}

/**
 * Stores producer metadata with the editable direct-value snapshot.
 *
 * @param source - Complete LitAST textStyle attributes.
 * @param target - Mutable canonical attribute fragment.
 */
export function preserveTextStyleAttributes(
  source: Readonly<Record<string, unknown>>,
  target: Record<string, unknown>
): void {
  const attributes = Object.fromEntries(
    preservedLitAstAttributes.flatMap((name) =>
      source[name] === undefined ? [] : [[name, source[name]]]
    )
  );
  if (Object.keys(attributes).length === 0) return;
  target.litAstTextStylePreservation = encodeLitAstPreservation({
    attributes,
    editable: {
      color: readNonEmptyString(source.color) ?? null,
      backgroundColor: readNonEmptyString(source.backgroundColor) ?? null
    }
  });
}

/**
 * Reads a validated textStyle preservation record.
 *
 * @param value - Encoded canonical preservation attribute.
 * @returns Producer metadata and editable snapshot, or undefined.
 */
export function readTextStylePreservation(
  value: unknown
): TextStylePreservation | undefined {
  const decoded = readRecord(decodeLitAstPreservation(value));
  const attributes = readRecord(decoded?.attributes);
  const editable = readRecord(decoded?.editable);
  return attributes === undefined || editable === undefined
    ? undefined
    : { attributes, editable };
}

/**
 * Removes stale theme references after an editable direct color changes.
 *
 * @param source - Current canonical textStyle attributes.
 * @param preservation - Original source metadata and direct-value snapshot.
 * @param target - Mutable LitAST attribute fragment.
 */
export function invalidateEditedThemeAttributes(
  source: Readonly<Record<string, unknown>>,
  preservation: TextStylePreservation | undefined,
  target: Record<string, unknown>
): void {
  if (preservation === undefined) return;
  const color = readNonEmptyString(source.color) ?? null;
  const originalColor = readNonEmptyString(preservation.editable.color) ?? null;
  if (color !== originalColor) {
    for (const name of themeColorAttributes) delete target[name];
  }
  const backgroundColor = readNonEmptyString(source.backgroundColor) ?? null;
  const originalBackground =
    readNonEmptyString(preservation.editable.backgroundColor) ?? null;
  if (backgroundColor !== originalBackground) {
    for (const name of themeFillAttributes) delete target[name];
  }
}
