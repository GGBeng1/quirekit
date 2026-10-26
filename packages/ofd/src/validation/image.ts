import type { OFDValidationIssue } from "../document/types";
import type { OFDGraphicObjectState } from "../model/types";
import { validateOFDColor } from "./color";
import {
  isOFDNonNegativeFinite,
  isOFDPositiveFinite,
  isValidOFDDashPattern
} from "./numbers";

/**
 * Validates the optional image border and its nested paint values.
 *
 * @param object - Image graphic object.
 * @param pageIndex - Owning page index.
 * @param objectIndex - Stable object index.
 * @param issues - Mutable issue sink.
 */
export function validateOFDImage(
  object: Extract<OFDGraphicObjectState, { type: "image" }>,
  pageIndex: number,
  objectIndex: number,
  issues: OFDValidationIssue[]
): void {
  const border = object.options.border;
  if (!border) return;
  if (!isOFDPositiveFinite(border.lineWidth)
    || (border.cornerRadius !== undefined && !isOFDNonNegativeFinite(border.cornerRadius))
    || (border.dashPattern !== undefined && !isValidOFDDashPattern(border.dashPattern))) {
    issues.push({
      code: "invalid-number",
      message: `Page ${pageIndex} object ${objectIndex} has an invalid image border.`,
      pageIndex,
      objectIndex
    });
  }
  validateOFDColor(border.color, pageIndex, objectIndex, issues);
}
