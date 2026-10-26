import type { QuireKitActionMenuEntry } from "../../components/action-menu";
import type { ActionMenuGroup, ActionMenuLevel, ActionMenuLocation } from "./types";

/**
 * Validates and indexes live command ancestry without changing host order.
 * @param actions - Complete action directory.
 * @returns Locations keyed by globally unique action identity.
 */
export function indexActionMenu(actions: readonly QuireKitActionMenuEntry[]): ReadonlyMap<string, ActionMenuLocation> {
  const locations = new Map<string, ActionMenuLocation>();
  /** @param entries - Current ordered level. @param path - Ancestor identities. @param disabled - Inherited availability. */
  function visit(entries: readonly QuireKitActionMenuEntry[], path: readonly string[], disabled: boolean): void {
    for (const action of entries) {
      if (!action.value.trim()) throw new TypeError("ActionMenu values must be non-empty.");
      if (locations.has(action.value)) throw new TypeError("ActionMenu values must be unique across the directory.");
      const unavailable = disabled || action.disabled === true;
      locations.set(action.value, { action, path, disabled: unavailable });
      if (action.kind === "branch") visit(action.children, [...path, action.value], unavailable);
    }
  }
  visit(actions, [], false);
  return locations;
}

/**
 * Resolves the nearest available branch after host directory changes.
 * @param actions - Complete current directory.
 * @param requestedPath - Previously active branch identities.
 * @returns Current actions and the valid prefix, including empty branches.
 */
export function resolveActionMenuLevel(actions: readonly QuireKitActionMenuEntry[], requestedPath: readonly string[]): ActionMenuLevel {
  let entries = actions;
  let branch: QuireKitActionMenuEntry | undefined;
  const path: string[] = [];
  for (const value of requestedPath) {
    const item = entries.find(action => action.value === value);
    if (!item || item.kind !== "branch" || item.disabled) break;
    path.push(value); branch = item; entries = item.children;
  }
  return { path, branch, actions: entries };
}

/**
 * Groups only adjacent actions so named groups never reorder commands.
 * @param actions - Current ordered directory.
 * @returns Consecutive heading runs.
 */
export function groupActionMenu(actions: readonly QuireKitActionMenuEntry[]): readonly ActionMenuGroup[] {
  const groups: ActionMenuGroup[] = [];
  for (const action of actions) {
    const last = groups.at(-1);
    if (last && last.label === action.group) last.actions.push(action);
    else groups.push({ label: action.group, actions: [action] });
  }
  return groups;
}
