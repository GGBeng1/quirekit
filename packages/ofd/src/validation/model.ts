import type { OFDDocumentSnapshot } from "../document/state";
import type { OFDValidationIssue } from "../document/types";
import {
  validateOFDDocumentSettings,
  validateOFDMetadataDates,
  validateOFDResources
} from "./document";
import { validateOFDNavigation } from "./navigation";
import { validateOFDPage, validateOFDTemplatePage } from "./pages";
import { validateOFDCompositeGraphicUnits } from "./composite";
import { validateOFDActions } from "../action/validation";
import { validateOFDRegisteredPaintResources } from "../resources/validation";

/**
 * Validates a frozen standalone document model.
 *
 * @param snapshot - Frozen document snapshot.
 * @returns Complete validation issues.
 */
export function validateOFDDocument(
  snapshot: OFDDocumentSnapshot
): readonly OFDValidationIssue[] {
  const issues: OFDValidationIssue[] = [];
  if (snapshot.pages.length === 0) {
    issues.push({
      code: "document-empty",
      message: "An OFD document must contain at least one page."
    });
  }
  validateOFDMetadataDates(snapshot, issues);
  for (const page of snapshot.pages) validateOFDPage(page, snapshot, issues);
  for (const template of snapshot.templates) validateOFDTemplatePage(template, issues);
  validateOFDNavigation(snapshot, issues);
  validateOFDActions(snapshot, issues);
  validateOFDResources(snapshot, issues);
  validateOFDCompositeGraphicUnits(snapshot, issues);
  validateOFDRegisteredPaintResources(snapshot, issues);
  validateOFDDocumentSettings(snapshot, issues);
  return Object.freeze(issues);
}
