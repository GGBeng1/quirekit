import type { OFDDocumentSnapshot } from "../document/state";
import type {
  OFDDestination,
  OFDOutlineOptions,
  OFDValidationIssue
} from "../document/types";

const minimumOFDZoom = 0.1;
const maximumOFDZoom = 64;

/**
 * Validates bookmarks and recursively nested outline destinations.
 *
 * @param snapshot - Owning document snapshot.
 * @param issues - Mutable issue sink.
 */
export function validateOFDNavigation(
  snapshot: OFDDocumentSnapshot,
  issues: OFDValidationIssue[]
): void {
  for (const bookmark of snapshot.bookmarks) {
    validateOFDDestination(snapshot, bookmark.destination, issues);
  }
  for (const outline of snapshot.outlines) {
    validateOFDOutline(snapshot, outline, issues);
  }
}

/**
 * Tests whether a zoom value lies in the portable OFD viewer range.
 *
 * @param zoom - Candidate zoom scale.
 * @returns Whether the zoom is finite and in range.
 */
export function isValidOFDZoom(zoom: number): boolean {
  return Number.isFinite(zoom) && zoom >= minimumOFDZoom && zoom <= maximumOFDZoom;
}

/**
 * Tests whether one destination type is defined by the OFD destination schema.
 *
 * @param type - Candidate destination type.
 * @returns Whether the type is a supported standard destination token.
 */
export function isValidOFDestinationType(type: string | undefined): boolean {
  return type === undefined || ["XYZ", "Fit", "FitH", "FitV", "FitR"].includes(type);
}

/**
 * Validates one owned-page destination and its target coordinates.
 *
 * @param snapshot - Owning document snapshot.
 * @param destination - Destination to validate.
 * @param issues - Mutable issue sink.
 */
function validateOFDDestination(
  snapshot: OFDDocumentSnapshot,
  destination: OFDDestination,
  issues: OFDValidationIssue[]
): void {
  const owned = destination.page.documentIdentity === snapshot.documentIdentity
    && snapshot.pages.some((page) =>
      page.pageIdentity === destination.page.pageIdentity
    );
  if (!owned) {
    issues.push({
      code: "foreign-page",
      message: "An OFD destination points to a foreign page."
    });
    return;
  }
  if (!isValidOFDestinationType(destination.type)) {
    issues.push({
      code: "invalid-destination",
      message: "An OFD destination has an invalid type."
    });
  }
  if (![destination.left, destination.right, destination.top, destination.bottom]
    .every((value) => value === undefined || Number.isFinite(value))) {
    issues.push({
      code: "invalid-destination",
      message: "An OFD destination has invalid target coordinates."
    });
  }
  if (destination.zoom !== undefined && !isValidOFDZoom(destination.zoom)) {
    issues.push({
      code: "invalid-destination",
      message: "An OFD destination has an invalid zoom."
    });
  }
}

/**
 * Validates one outline node and recursively checks its child destinations.
 *
 * @param snapshot - Owning document snapshot.
 * @param outline - Outline node.
 * @param issues - Mutable issue sink.
 */
function validateOFDOutline(
  snapshot: OFDDocumentSnapshot,
  outline: OFDOutlineOptions,
  issues: OFDValidationIssue[]
): void {
  if (outline.destination) validateOFDDestination(snapshot, outline.destination, issues);
  for (const child of outline.children ?? []) {
    validateOFDOutline(snapshot, child, issues);
  }
}
