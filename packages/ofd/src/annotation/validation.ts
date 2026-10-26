import type { OFDPageBlockChildSnapshot } from "../document/state";
import type { OFDValidationIssue } from "../document/types";
import type { OFDAnnotationSnapshot } from "./state";

const annotationTypes = new Set([
  "Link",
  "Path",
  "Highlight",
  "Stamp",
  "Watermark"
]);

/** Callback that validates appearance graphics in the existing page ID space. */
export type OFDAnnotationChildValidator = (
  children: readonly OFDPageBlockChildSnapshot[],
  pageIndex: number,
  objectIndex: number,
  issues: OFDValidationIssue[]
) => number;

/**
 * Validates page-local annotation properties and delegates appearance graphics.
 *
 * @param annotations - Ordered annotations on one physical page.
 * @param pageIndex - Stable physical page index.
 * @param objectIndex - Next graphic-object index after ordinary page content.
 * @param issues - Mutable validation issue sink.
 * @param validateChildren - Existing recursive page-block validator.
 */
export function validateOFDAnnotations(
  annotations: readonly OFDAnnotationSnapshot[],
  pageIndex: number,
  objectIndex: number,
  issues: OFDValidationIssue[],
  validateChildren: OFDAnnotationChildValidator
): void {
  let nextObjectIndex = objectIndex;
  for (const annotation of annotations) {
    const { boundary } = annotation.appearance;
    if (!annotationTypes.has(annotation.options.type)) {
      issues.push({
        code: "invalid-annotation",
        message: `Page ${pageIndex} annotation has an unknown Type.`,
        pageIndex
      });
    }
    if (!isValidBoundary(boundary)) {
      issues.push({
        code: "invalid-annotation",
        message: `Page ${pageIndex} annotation has an invalid appearance boundary.`,
        pageIndex
      });
    }
    if (annotation.options.creator.trim().length === 0) {
      issues.push({
        code: "invalid-annotation",
        message: `Page ${pageIndex} annotation requires a non-empty creator.`,
        pageIndex
      });
    }
    if (!isValidOFDDate(annotation.options.lastModDate)) {
      issues.push({
        code: "invalid-date",
        message: `Page ${pageIndex} annotation has an invalid LastModDate.`,
        pageIndex
      });
    }
    for (const name of Object.keys(annotation.options.parameters ?? {})) {
      if (name.trim().length === 0) {
        issues.push({
          code: "invalid-annotation",
          message: `Page ${pageIndex} annotation has an empty parameter name.`,
          pageIndex
        });
      }
    }
    nextObjectIndex = validateChildren(
      annotation.appearance.children,
      pageIndex,
      nextObjectIndex,
      issues
    );
  }
}

/**
 * Tests one strict calendar date used by the OFD `LastModDate` attribute.
 *
 * @param value - Candidate `YYYY-MM-DD` date.
 * @returns Whether the value identifies one real calendar day.
 */
function isValidOFDDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

/**
 * Tests whether a standard appearance boundary is finite and non-empty.
 *
 * @param boundary - Candidate appearance boundary.
 * @returns Whether the boundary is valid.
 */
function isValidBoundary(boundary: {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}): boolean {
  return Number.isFinite(boundary.x)
    && Number.isFinite(boundary.y)
    && Number.isFinite(boundary.width)
    && Number.isFinite(boundary.height)
    && boundary.width > 0
    && boundary.height > 0;
}
