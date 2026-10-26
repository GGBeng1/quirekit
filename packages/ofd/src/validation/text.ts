import type { OFDValidationIssue } from "../document/types";
import type {
  OFDGraphicObjectState,
  OFDTextCode
} from "../model/types";
import { validateOFDColor } from "./color";
import { hasFiniteOFDNumbers, isOFDPositiveFinite } from "./numbers";

/**
 * Validates text placement, size, paint, and coordinate values.
 *
 * @param object - Text graphic object.
 * @param pageIndex - Owning page index.
 * @param objectIndex - Stable object index.
 * @param issues - Mutable issue sink.
 */
export function validateOFDText(
  object: Extract<OFDGraphicObjectState, { type: "text" }>,
  pageIndex: number,
  objectIndex: number,
  issues: OFDValidationIssue[]
): void {
  const {
    codes,
    fillColor,
    glyphTransforms,
    size,
    strokeColor
  } = object.options;
  const concatenated = codes.map((code) => code.text).join("");
  if (concatenated !== object.text || codes.length === 0) {
    issues.push({
      code: "invalid-text-placement",
      message: `Page ${pageIndex} object ${objectIndex} TextCode content does not match.`,
      pageIndex,
      objectIndex
    });
  }
  for (const transform of glyphTransforms ?? []) {
    if (
      !Number.isInteger(transform.codePosition)
      || transform.codePosition < 0
      || !Number.isInteger(transform.codeCount)
      || transform.codeCount < 1
      || transform.codePosition + transform.codeCount > [...object.text].length
      || transform.glyphs.length < 1
      || transform.glyphs.some((glyph) =>
        !Number.isInteger(glyph) || glyph < 0
      )
    ) {
      issues.push({
        code: "invalid-text-placement",
        message: `Page ${pageIndex} object ${objectIndex} has an invalid CGTransform.`,
        pageIndex,
        objectIndex
      });
    }
  }
  if (!isOFDPositiveFinite(size)) {
    issues.push({
      code: "invalid-number",
      message: `Page ${pageIndex} object ${objectIndex} has an invalid FontSize.`,
      pageIndex,
      objectIndex
    });
  }
  for (const code of codes) validateOFDTextCode(code, pageIndex, objectIndex, issues);
  validateOFDColor(fillColor, pageIndex, objectIndex, issues);
  validateOFDColor(strokeColor, pageIndex, objectIndex, issues);
}

/**
 * Validates one TextCode's coordinate and delta invariants.
 *
 * @param code - TextCode placement value.
 * @param pageIndex - Owning page index.
 * @param objectIndex - Stable object index.
 * @param issues - Mutable issue sink.
 */
function validateOFDTextCode(
  code: OFDTextCode,
  pageIndex: number,
  objectIndex: number,
  issues: OFDValidationIssue[]
): void {
  const { deltaX, deltaY, text, x, y } = code;
  const count = [...text].length;
  if (!hasFiniteOFDNumbers([x, y])
    || (deltaX !== undefined && !hasFiniteOFDNumbers(deltaX))
    || (deltaY !== undefined && !hasFiniteOFDNumbers(deltaY))) {
    issues.push({
      code: "invalid-text-placement",
      message: `Page ${pageIndex} object ${objectIndex} has invalid TextCode coordinates.`,
      pageIndex,
      objectIndex
    });
  }
  if (count > 1 && deltaX === undefined && deltaY === undefined) {
    issues.push({
      code: "invalid-text-placement",
      message: `Page ${pageIndex} object ${objectIndex} needs explicit DeltaX or DeltaY.`,
      pageIndex,
      objectIndex
    });
  }
  if ((deltaX && deltaX.length !== count - 1)
    || (deltaY && deltaY.length !== count - 1)) {
    issues.push({
      code: "invalid-text-placement",
      message: `Page ${pageIndex} object ${objectIndex} has a misaligned TextCode delta.`,
      pageIndex,
      objectIndex
    });
  }
}
