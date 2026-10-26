import type { WordStyleTextProperties } from "./types";

/**
 * Rejects malformed modeled deltas while retaining unrecognized future fields in imported records.
 * @param value - Candidate style text delta.
 * @returns Whether known properties have safe canonical values.
 */
export function isWordStyleTextProperties(value: unknown): value is WordStyleTextProperties {
  if (!record(value)) return false;
  const scale = value.horizontalScale;
  if (scale !== undefined && (typeof scale !== "number" || !Number.isFinite(scale) || scale < 0.01 || scale > 6
    || Math.abs(scale * 100 - Math.round(scale * 100)) > 1e-8)) return false;
  for (const name of ["fontScale", "lineHeightScale", "glyphScale"]) {
    if (value[name] !== undefined && (typeof value[name] !== "number" || !Number.isFinite(value[name]) || value[name] <= 0)) return false;
  }
  for (const name of ["fontSize", "fontSizeComplexScript", "letterSpacing"]) {
    const metric = value[name];
    if (metric !== undefined && (typeof metric !== "string" || !/^-?(?:\d+(?:\.\d+)?|\.\d+)(pt|px)$/u.test(metric)
      || (name !== "letterSpacing" && Number.parseFloat(metric) <= 0))) return false;
  }
  const enums: Record<string, readonly string[]> = {
    fontHint: ["default", "eastAsia", "cs"],
    fontWeight: ["normal", "bold"], fontWeightComplexScript: ["normal", "bold"], fontStyle: ["normal", "italic"],
    fontStyleComplexScript: ["normal", "italic"], textTransform: ["none", "uppercase"], fontVariantCaps: ["normal", "small-caps"],
    verticalAlignment: ["baseline", "superscript", "subscript"], emphasisMark: ["none", "dot", "underDot", "circle", "comma"]
  };
  for (const [name, allowed] of Object.entries(enums)) if (value[name] !== undefined && !allowed.includes(value[name] as string)) return false;
  for (const name of ["hidden", "rightToLeft", "strike", "doubleStrike", "characterGrid"]) if (value[name] !== undefined && typeof value[name] !== "boolean") return false;
  for (const name of ["fontFamily", "fontFamilyLatin", "fontFamilyHighAnsi", "fontFamilyEastAsia", "fontFamilyComplexScript",
    "languageLatin", "languageEastAsia", "languageComplexScript", "highlight", "color", "backgroundColor"]) {
    if (value[name] !== undefined && (typeof value[name] !== "string" || !value[name].trim())) return false;
  }
  if (value.toggles !== undefined && (!record(value.toggles) || Object.values(value.toggles).some(flag => typeof flag !== "boolean"))) return false;
  if (value.fontReferences !== undefined && (!record(value.fontReferences) || Object.values(value.fontReferences).some(slot => typeof slot !== "string"))) return false;
  if (value.colorReference !== undefined && (!record(value.colorReference) || typeof value.colorReference.slot !== "string")) return false;
  if (value.underline !== undefined && (!record(value.underline) || typeof value.underline.style !== "string")) return false;
  return true;
}

/** @param value - Unknown input. @returns Whether it is an object record. */
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
