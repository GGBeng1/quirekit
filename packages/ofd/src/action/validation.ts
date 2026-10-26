import type { OFDDocumentSnapshot, OFDPageBlockChildSnapshot } from "../document/state";
import type { OFDValidationIssue } from "../document/types";
import type { OFDAction } from "./types";
import { isValidOFDestinationType } from "../validation/navigation";

/**
 * Validates every action target in a frozen document graph.
 *
 * @param snapshot - Frozen standalone document snapshot.
 * @param issues - Mutable validation issue sink.
 */
export function validateOFDActions(
  snapshot: OFDDocumentSnapshot,
  issues: OFDValidationIssue[]
): void {
  validateDocumentOpenActions(snapshot, issues);
  for (const page of snapshot.pages) {
    validateActionList(snapshot, page.actions, issues, `Page ${page.pageIndex}`);
    validateChildren(snapshot, page.layers.flatMap((layer) => layer.objects), issues);
    for (const annotation of page.annotations) {
      validateChildren(snapshot, annotation.appearance.children, issues);
    }
  }
  for (const template of snapshot.templates) {
    validateChildren(snapshot, template.layers.flatMap((layer) => layer.objects), issues);
  }
  for (const outline of snapshot.outlines) {
    validateOutline(snapshot, outline, issues);
  }
}

/**
 * Validates the restricted action subset owned by `Document/Actions`.
 *
 * @param snapshot - Frozen standalone document snapshot.
 * @param issues - Mutable validation issue sink.
 */
function validateDocumentOpenActions(
  snapshot: OFDDocumentSnapshot,
  issues: OFDValidationIssue[]
): void {
  for (const action of snapshot.documentOpenActions) {
    if (action.type !== "goto" && action.type !== "goto-bookmark") {
      issues.push({
        code: "invalid-action",
        message: "Document-open actions support only goto and goto-bookmark."
      });
      continue;
    }
    validateAction(snapshot, action, issues, "Document-open");
  }
}

/**
 * Validates actions recursively attached to one outline tree.
 *
 * @param snapshot - Frozen standalone document snapshot.
 * @param outline - Current outline node.
 * @param issues - Mutable validation issue sink.
 */
function validateOutline(
  snapshot: OFDDocumentSnapshot,
  outline: {
    readonly actions?: readonly OFDAction[];
    readonly children?: readonly OFDOutlineLike[];
  },
  issues: OFDValidationIssue[]
): void {
  validateActionList(snapshot, outline.actions ?? [], issues, "Outline");
  for (const child of outline.children ?? []) {
    validateOutline(snapshot, child, issues);
  }
}

/** One recursive outline shape used without coupling validation to public options. */
interface OFDOutlineLike {
  /** Optional actions attached to this outline node. */
  readonly actions?: readonly OFDAction[];
  /** Optional nested outline nodes. */
  readonly children?: readonly OFDOutlineLike[];
}

/**
 * Validates actions carried by recursively nested graphics.
 *
 * @param snapshot - Frozen standalone document snapshot.
 * @param children - Ordered graphic and page-block children.
 * @param issues - Mutable validation issue sink.
 */
function validateChildren(
  snapshot: OFDDocumentSnapshot,
  children: readonly OFDPageBlockChildSnapshot[],
  issues: OFDValidationIssue[]
): void {
  for (const child of children) {
    if (child.type === "page-block") {
      validateChildren(snapshot, child.children, issues);
      continue;
    }
    validateActionList(snapshot, child.options.actions ?? [], issues, "Graphic");
  }
}

/**
 * Validates one ordered action sequence against document-owned targets.
 *
 * @param snapshot - Frozen standalone document snapshot.
 * @param actions - Actions to validate in execution order.
 * @param issues - Mutable validation issue sink.
 * @param owner - Human-readable action owner for diagnostics.
 */
function validateActionList(
  snapshot: OFDDocumentSnapshot,
  actions: readonly OFDAction[],
  issues: OFDValidationIssue[],
  owner: string
): void {
  for (const action of actions) validateAction(snapshot, action, issues, owner);
}

/**
 * Validates a typed target and reports ownership or value failures.
 *
 * @param snapshot - Frozen standalone document snapshot.
 * @param action - One action target.
 * @param issues - Mutable validation issue sink.
 * @param owner - Human-readable action owner for diagnostics.
 */
function validateAction(
  snapshot: OFDDocumentSnapshot,
  action: OFDAction,
  issues: OFDValidationIssue[],
  owner: string
): void {
  if (action.type === "goto") {
    const owned = action.destination.page.documentIdentity === snapshot.documentIdentity
      && snapshot.pages.some((page) =>
        page.pageIdentity === action.destination.page.pageIdentity
      );
    const zoom = action.destination.zoom;
    const coordinates = [
      action.destination.left,
      action.destination.right,
      action.destination.top,
      action.destination.bottom
    ];
    const invalidCoordinates = coordinates.some((value) =>
      value !== undefined && !Number.isFinite(value)
    );
    if (!owned || invalidCoordinates || !isValidOFDestinationType(action.destination.type)
      || (zoom !== undefined
      && (!Number.isFinite(zoom) || zoom < 0.1 || zoom > 64))) {
      issues.push({
        code: owned ? "invalid-destination" : "foreign-page",
        message: owned
          ? `${owner} action has an invalid destination.`
          : `${owner} action points to a foreign page.`
      });
    }
    return;
  }
  if (action.type === "goto-bookmark") {
    if (action.bookmark.trim().length === 0 || !snapshot.bookmarks.some((bookmark) =>
      bookmark.name === action.bookmark
    )) {
      issues.push({
        code: "invalid-action",
        message: `${owner} action references an unknown bookmark.`
      });
    }
    return;
  }
  if (action.type === "uri") {
    if (action.uri.trim().length === 0) {
      issues.push({ code: "invalid-action", message: `${owner} action requires a URI.` });
    }
    return;
  }
  if (action.type !== "goto-attachment") {
    issues.push({
      code: "invalid-action",
      message: `${owner} action has an unsupported type.`
    });
    return;
  }
  const owned = action.attachment.documentIdentity === snapshot.documentIdentity
    && snapshot.attachments.includes(action.attachment);
  if (!owned) {
    issues.push({
      code: "foreign-resource",
      message: `${owner} action references a foreign attachment.`
    });
  }
}
