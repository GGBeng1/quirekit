import type { OFDDocumentSnapshot, OFDPageBlockChildSnapshot } from "../document/state";
import type { OFDValidationIssue } from "../document/types";
import { isOwnedOFDDrawParam, validateOFDRegisteredPaintDefinitions } from "./paint-validation";

/**
 * Validates paint resources and their graphic references across the document.
 *
 * @param snapshot - Frozen standalone document snapshot.
 * @param issues - Mutable validation issue sink.
 */
export function validateOFDRegisteredPaintResources(
  snapshot: OFDDocumentSnapshot,
  issues: OFDValidationIssue[]
): void {
  validateOFDRegisteredPaintDefinitions(snapshot, issues);
  for (const page of snapshot.pages) {
    validateGraphicDrawParams(snapshot, page.layers.flatMap((layer) => layer.objects), issues);
    for (const annotation of page.annotations) {
      validateGraphicDrawParams(snapshot, annotation.appearance.children, issues);
    }
  }
  for (const template of snapshot.templates) {
    validateGraphicDrawParams(snapshot, template.layers.flatMap((layer) => layer.objects), issues);
  }
}

/**
 * Validates drawing-parameter handles attached to recursively nested graphics.
 *
 * @param snapshot - Frozen standalone document snapshot.
 * @param children - Ordered graphic and page-block children.
 * @param issues - Mutable validation issue sink.
 */
function validateGraphicDrawParams(
  snapshot: OFDDocumentSnapshot,
  children: readonly OFDPageBlockChildSnapshot[],
  issues: OFDValidationIssue[]
): void {
  for (const child of children) {
    if (child.type === "page-block") {
      validateGraphicDrawParams(snapshot, child.children, issues);
      continue;
    }
    if (child.options.drawParam && !isOwnedOFDDrawParam(snapshot, child.options.drawParam)) {
      issues.push({ code: "foreign-resource", message: "OFD graphic references a foreign DrawParam." });
    }
  }
}
