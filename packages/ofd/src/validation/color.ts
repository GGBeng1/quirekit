import type { OFDValidationIssue } from "../document/types";
import type { OFDColor } from "../model/types";

/**
 * Validates one direct color value.
 *
 * @param color - Optional color.
 * @param pageIndex - Owning page index.
 * @param objectIndex - Stable object index.
 * @param issues - Mutable issue sink.
 */
export function validateOFDColor(
  color: OFDColor | undefined,
  pageIndex: number,
  objectIndex: number,
  issues: OFDValidationIssue[]
): void {
  if (!color) return;
  const values = [...color.value, color.alpha ?? 255];
  if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    issues.push({
      code: "invalid-color",
      message: `Page ${pageIndex} object ${objectIndex} has an invalid color.`,
      pageIndex,
      objectIndex
    });
  }
}
