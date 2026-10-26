import type {
  OFDDocumentSnapshot,
  OFDPageBlockChildSnapshot
} from "../document/state";
import type { OFDValidationIssue } from "../document/types";
import { isOFDPositiveFinite } from "./numbers";

/**
 * Validates composite resource dimensions, thumbnails, and graphic references.
 *
 * @param snapshot - Frozen standalone document snapshot.
 * @param issues - Mutable issue sink.
 */
export function validateOFDCompositeGraphicUnits(
  snapshot: OFDDocumentSnapshot,
  issues: OFDValidationIssue[]
): void {
  for (const unit of snapshot.compositeGraphicUnits) {
    if (!isOFDPositiveFinite(unit.options.width)
      || !isOFDPositiveFinite(unit.options.height)) {
      issues.push({
        code: "invalid-geometry",
        message: "OFD CompositeGraphicUnit has invalid Width or Height."
      });
    }
    const thumbnail = unit.options.thumbnail;
    if (thumbnail && (thumbnail.documentIdentity !== snapshot.documentIdentity
      || !snapshot.images.includes(thumbnail))) {
      issues.push({
        code: "foreign-resource",
        message: "OFD CompositeGraphicUnit references a foreign thumbnail image."
      });
    }
    validateOFDCompositeReferences(snapshot, unit.layers.flatMap((layer) => layer.objects), issues);
  }
  for (const page of snapshot.pages) {
    validateOFDCompositeReferences(snapshot, page.layers.flatMap((layer) => layer.objects), issues);
    for (const annotation of page.annotations) {
      validateOFDCompositeReferences(snapshot, annotation.appearance.children, issues);
    }
  }
  for (const template of snapshot.templates) {
    validateOFDCompositeReferences(snapshot, template.layers.flatMap((layer) => layer.objects), issues);
  }
}

/**
 * Validates composite handles across one recursively nested graphic sequence.
 *
 * @param snapshot - Frozen standalone document snapshot.
 * @param children - Ordered graphic or page-block children.
 * @param issues - Mutable issue sink.
 */
function validateOFDCompositeReferences(
  snapshot: OFDDocumentSnapshot,
  children: readonly OFDPageBlockChildSnapshot[],
  issues: OFDValidationIssue[]
): void {
  for (const child of children) {
    if (child.type === "page-block") {
      validateOFDCompositeReferences(snapshot, child.children, issues);
      continue;
    }
    if (child.type === "composite" && (child.composite.documentIdentity
      !== snapshot.documentIdentity
      || !snapshot.compositeGraphicUnits.some((unit) => unit.source === child.composite))) {
      issues.push({
        code: "foreign-resource",
        message: "OFD graphic references a foreign CompositeGraphicUnit."
      });
    }
  }
}
