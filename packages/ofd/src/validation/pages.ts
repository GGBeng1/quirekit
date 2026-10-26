import { validateOFDAnnotations } from "../annotation/validation";
import type {
  OFDDocumentSnapshot,
  OFDPageSnapshot,
  OFDTemplatePageSnapshot
} from "../document/state";
import type { OFDValidationIssue } from "../document/types";
import { validateOFDPageBlockChildren } from "./graphics";
import { isOFDPositiveFinite } from "./numbers";

/**
 * Validates one physical page, its annotations, templates, and graphics.
 *
 * @param page - Frozen page snapshot.
 * @param snapshot - Owning document snapshot.
 * @param issues - Mutable issue sink.
 */
export function validateOFDPage(
  page: OFDPageSnapshot,
  snapshot: OFDDocumentSnapshot,
  issues: OFDValidationIssue[]
): void {
  if (!isOFDPositiveFinite(page.options.width)
    || !isOFDPositiveFinite(page.options.height)) {
    issues.push({
      code: "invalid-geometry",
      message: `Page ${page.pageIndex} has invalid dimensions.`,
      pageIndex: page.pageIndex
    });
  }
  const nextObjectIndex = validateOFDPageBlockChildren(
    page.layers.flatMap((layer) => layer.objects),
    page.pageIndex,
    0,
    issues
  );
  validateOFDAnnotations(
    page.annotations,
    page.pageIndex,
    nextObjectIndex,
    issues,
    validateOFDPageBlockChildren
  );
  validateOFDTemplateReferences(page, snapshot, issues);
}

/**
 * Validates one reusable template page and its graphic content.
 *
 * @param template - Frozen template-page snapshot.
 * @param issues - Mutable issue sink.
 */
export function validateOFDTemplatePage(
  template: OFDTemplatePageSnapshot,
  issues: OFDValidationIssue[]
): void {
  if (!isOFDPositiveFinite(template.options.width)
    || !isOFDPositiveFinite(template.options.height)) {
    issues.push({
      code: "invalid-geometry",
      message: `Template ${template.templateIndex} has invalid dimensions.`,
      pageIndex: template.templateIndex
    });
  }
  if (template.options.zOrder !== undefined
    && !["Background", "Foreground"].includes(template.options.zOrder)) {
    issues.push({
      code: "invalid-document-metadata",
      message: `Template ${template.templateIndex} has an invalid ZOrder.`,
      pageIndex: template.templateIndex
    });
  }
  validateOFDPageBlockChildren(
    template.layers.flatMap((layer) => layer.objects),
    template.templateIndex,
    0,
    issues
  );
}

/**
 * Validates one page's references to document-owned template pages.
 *
 * @param page - Frozen ordinary page snapshot.
 * @param snapshot - Owning document snapshot.
 * @param issues - Mutable issue sink.
 */
function validateOFDTemplateReferences(
  page: OFDPageSnapshot,
  snapshot: OFDDocumentSnapshot,
  issues: OFDValidationIssue[]
): void {
  for (const reference of page.templates) {
    const exists = reference.documentIdentity === snapshot.documentIdentity
      && snapshot.templates.some((template) =>
        template.templateIdentity === reference.templateIdentity
      );
    if (!exists) {
      issues.push({
        code: "foreign-template",
        message: `Page ${page.pageIndex} references a foreign OFD template.`,
        pageIndex: page.pageIndex
      });
    }
    if (reference.options.zOrder !== undefined
      && !["Background", "Foreground"].includes(reference.options.zOrder)) {
      issues.push({
        code: "invalid-document-metadata",
        message: `Page ${page.pageIndex} has an invalid template ZOrder.`,
        pageIndex: page.pageIndex
      });
    }
  }
}
