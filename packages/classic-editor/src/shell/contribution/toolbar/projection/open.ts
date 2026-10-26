import type { QuireKitToolbarEntry } from "@quirekit/ui";

/**
 * Treats an open controlled popup as a live presentation consumer even on an inactive tab.
 * @param entries - Last published feature entries, without evaluating a hidden getter.
 * @returns Whether a controlled popup still needs current presentation.
 */
export function hasExpandedClassicToolbarEntries(entries: readonly QuireKitToolbarEntry[]): boolean {
  return entries.some(entry => entry.expanded === true || (entry.children !== undefined && hasExpandedClassicToolbarEntries(entry.children)));
}

/**
 * Finds local popup paths still represented by current feature controls.
 * @param entries - Current public feature entries.
 * @param parent - Original feature-local ancestry.
 * @returns Paths eligible for local public popup state.
 */
export function collectClassicToolbarLocalPaths(entries: readonly QuireKitToolbarEntry[], parent: readonly string[] = []): ReadonlySet<string> {
  return new Set(entries.flatMap(entry => {
    const path = [...parent, entry.value];
    return [
      ...(entry.expanded === undefined ? [JSON.stringify(path)] : []),
      ...(entry.children === undefined ? [] : collectClassicToolbarLocalPaths(entry.children, path))
    ];
  }));
}
