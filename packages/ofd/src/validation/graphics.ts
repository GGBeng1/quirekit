import type { OFDPageBlockChildSnapshot } from "../document/state";
import type { OFDValidationIssue } from "../document/types";
import type { OFDGraphicObjectState } from "../model/types";
import { validateOFDGraphicCommon } from "./common";
import { validateOFDImage } from "./image";
import { validateOFDPathGraphic } from "./path";
import { isValidOFDBox } from "./numbers";
import { validateOFDText } from "./text";

/**
 * Validates graphic children recursively and returns the next object index.
 *
 * @param children - Ordered graphic or nested page-block children.
 * @param pageIndex - Owning page or template index.
 * @param objectIndex - Next stable graphic-object index.
 * @param issues - Mutable issue sink.
 * @returns Index after every descendant graphic object.
 */
export function validateOFDPageBlockChildren(
  children: readonly OFDPageBlockChildSnapshot[],
  pageIndex: number,
  objectIndex: number,
  issues: OFDValidationIssue[]
): number {
  let nextIndex = objectIndex;
  for (const child of children) {
    if (child.type === "page-block") {
      nextIndex = validateOFDPageBlockChildren(
        child.children,
        pageIndex,
        nextIndex,
        issues
      );
      continue;
    }
    validateOFDGraphic(child, pageIndex, nextIndex, issues);
    nextIndex += 1;
  }
  return nextIndex;
}

/**
 * Validates one graphic object's shared and type-specific fields.
 *
 * @param object - Graphic object.
 * @param pageIndex - Owning page index.
 * @param objectIndex - Stable object index.
 * @param issues - Mutable issue sink.
 */
function validateOFDGraphic(
  object: OFDGraphicObjectState,
  pageIndex: number,
  objectIndex: number,
  issues: OFDValidationIssue[]
): void {
  if (!isValidOFDBox(object.options.boundary)) {
    issues.push({
      code: "invalid-geometry",
      message: `Page ${pageIndex} object ${objectIndex} has an invalid boundary.`,
      pageIndex,
      objectIndex
    });
  }
  validateOFDGraphicCommon(object, pageIndex, objectIndex, issues);
  if (object.type === "text") {
    validateOFDText(object, pageIndex, objectIndex, issues);
  } else if (object.type === "path") {
    validateOFDPathGraphic(object, pageIndex, objectIndex, issues);
  } else if (object.type === "image") {
    validateOFDImage(object, pageIndex, objectIndex, issues);
  }
}
