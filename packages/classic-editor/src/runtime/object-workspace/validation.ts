import type { ClassicEditorActionDefinition } from "../../types";
import type {
  ClassicEditorObjectFreshness,
  ClassicEditorObjectTarget,
  ClassicEditorObjectWorkspaceContribution
} from "../../types/object-workspace";

/** @param contribution - Candidate contribution. @returns Nothing. */
export function validateObjectWorkspaceContribution(
  contribution: ClassicEditorObjectWorkspaceContribution
): void {
  if (contribution.id.trim().length === 0 || contribution.target.id.trim().length === 0) {
    throw new RangeError("Object workspace contribution and target ids must not be empty.");
  }
  const actions = new Set<ClassicEditorActionDefinition>();
  for (const entry of contribution.actions) {
    if (actions.has(entry.action)) throw new RangeError("Object actions must be unique objects.");
    actions.add(entry.action);
    if (entry.control === undefined) continue;
    if (entry.control.id.trim().length === 0) {
      throw new RangeError("Object control ids must not be empty.");
    }
    if (entry.control.kind !== "menu") continue;
    const menuActions = new Set<ClassicEditorActionDefinition>();
    for (const group of entry.control.groups) {
      if (group.id.trim().length === 0 || group.items.length === 0) {
        throw new RangeError("Object menu groups must have an id and at least one item.");
      }
      for (const item of group.items) {
        if (menuActions.has(item.action)) {
          throw new RangeError("Object menu actions must be unique objects.");
        }
        menuActions.add(item.action);
      }
    }
  }
  for (const section of contribution.inspector?.sections ?? []) {
    const sectionActions = new Set<ClassicEditorActionDefinition>();
    for (const action of section.actions ?? []) {
      if (sectionActions.has(action)) {
        throw new RangeError("Inspector section actions must be unique objects.");
      }
      sectionActions.add(action);
    }
  }
}

/**
 * Checks direct object identity across quick actions and optional Inspector field actions.
 *
 * @param contribution - Active exact object contribution.
 * @param action - Direct action object supplied by a presenter.
 * @returns Whether the owner retained this exact action object.
 */
export function isRetainedObjectAction(
  contribution: ClassicEditorObjectWorkspaceContribution,
  action: ClassicEditorActionDefinition
): boolean {
  return contribution.toolbarActions?.includes(action) === true || contribution.actions.some((entry) => (
    entry.action === action
    || (entry.control?.kind === "menu"
      && entry.control.groups.some(group => group.items.some(item => item.action === action)))
  ))
    || (contribution.inspector?.sections.some((section) => section.fields.some((field) => (
      field.commit === action || field.reset === action
    )) || section.actions?.includes(action) === true) ?? false);
}

/**
 * Compares a resolved object with the captured target identity.
 *
 * @param contribution - Captured contribution.
 * @param target - Owner-resolved target.
 * @returns Whether stable identity and opaque revision still match.
 */
export function haveSameObjectTarget(
  contribution: ClassicEditorObjectWorkspaceContribution,
  target: ClassicEditorObjectTarget
): boolean {
  const captured = contribution.target;
  return captured.id === target.id
    && captured.ownerId === target.ownerId
    && captured.revision === target.revision;
}

/** @param revision - Latest owner freshness revision. @returns Explicit mismatch freshness. */
export function createObjectTargetMismatchFreshness(
  revision: number
): ClassicEditorObjectFreshness {
  return Object.freeze({
    revision,
    status: "stale",
    reason: { en: "The original object target changed.", "zh-CN": "原对象目标已经变化。" }
  });
}

/** @param contribution - Active object contribution. @returns First ordered tab id. */
export function resolveFirstObjectInspectorTab(
  contribution: ClassicEditorObjectWorkspaceContribution
): string | null {
  return [...(contribution.inspector?.tabs ?? [])]
    .sort((left, right) => left.order - right.order)[0]?.id
    ?? null;
}
