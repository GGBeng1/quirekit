import type { OFDValidationIssue } from "../document/types";
import type { OFDGraphicObjectState } from "../model/types";
import { validateOFDPath } from "./path";
import { isValidOFDBox, isValidOFDMatrix } from "./numbers";

/**
 * Validates alpha, CTM, and clip fields shared by every graphic object.
 *
 * @param object - Graphic object.
 * @param pageIndex - Owning page index.
 * @param objectIndex - Stable object index.
 * @param issues - Mutable issue sink.
 */
export function validateOFDGraphicCommon(
  object: OFDGraphicObjectState,
  pageIndex: number,
  objectIndex: number,
  issues: OFDValidationIssue[]
): void {
  const { alpha, clips, ctm } = object.options;
  if (alpha !== undefined && (!Number.isInteger(alpha) || alpha < 0 || alpha > 255)) {
    issues.push({
      code: "invalid-number",
      message: `Page ${pageIndex} object ${objectIndex} has invalid alpha.`,
      pageIndex,
      objectIndex
    });
  }
  if (ctm !== undefined && !isValidOFDMatrix(ctm)) {
    issues.push({
      code: "invalid-number",
      message: `Page ${pageIndex} object ${objectIndex} has an invalid CTM.`,
      pageIndex,
      objectIndex
    });
  }
  for (const clip of clips ?? []) {
    if (!isValidOFDBox(clip.boundary)) {
      issues.push({
        code: "invalid-geometry",
        message: `Page ${pageIndex} object ${objectIndex} has an invalid clip.`,
        pageIndex,
        objectIndex
      });
    }
    validateOFDPath(clip.commands, pageIndex, objectIndex, issues);
  }
}
