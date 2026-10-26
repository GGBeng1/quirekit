import {
  formatJsonSearchText,
  getJsonEntries,
  isContainer
} from "./shared";

/**
 * Collects JSON container paths that should be open by default.
 *
 * @param value - JSON value to inspect.
 * @param maxDepth - Maximum depth to expand.
 * @returns Expanded container paths.
 */
export function collectDefaultJsonExpandedPaths(
  value: unknown,
  maxDepth = 4
): readonly string[] {
  const paths: string[] = [];
  collectContainerPaths(value, "$", 0, maxDepth, paths);
  return paths;
}

/**
 * Collects every object or array path in a JSON value.
 *
 * @param value - JSON value to inspect.
 * @returns All expandable container paths.
 */
export function collectJsonContainerPaths(value: unknown): readonly string[] {
  const paths: string[] = [];
  collectContainerPaths(value, "$", 0, Number.POSITIVE_INFINITY, paths);
  return paths;
}

/**
 * Collects paths that should be opened while searching.
 *
 * @param value - JSON value to inspect.
 * @param search - Search query.
 * @returns Container paths needed to reveal matching rows.
 */
export function collectJsonSearchExpandedPaths(
  value: unknown,
  search: string
): readonly string[] {
  const query = search.trim().toLowerCase();
  const paths = new Set<string>();

  if (!query) {
    return [];
  }

  collectSearchExpandedPaths(value, "$", "root", query, [], paths);
  return [...paths];
}

/**
 * Counts JSON tree rows that match a search query.
 *
 * @param value - JSON value to inspect.
 * @param search - Search query.
 * @returns Number of matching rows.
 */
export function countJsonMatches(value: unknown, search: string): number {
  const query = search.trim().toLowerCase();

  if (!query) {
    return 0;
  }

  return countMatches(value, "$", "root", query);
}

/**
 * Checks whether a row matches the search query.
 *
 * @param label - Row label.
 * @param value - Row value.
 * @param path - Row path.
 * @param query - Normalized search query.
 * @returns True when the row matches.
 */
export function matchesJsonQuery(
  label: string,
  value: unknown,
  path: string,
  query: string
): boolean {
  return formatJsonSearchText(label, value, path).toLowerCase().includes(query);
}

/**
 * Collects container paths recursively.
 *
 * @param value - Current value.
 * @param path - Current path.
 * @param depth - Current depth.
 * @param maxDepth - Maximum depth to collect.
 * @param paths - Output path list.
 */
function collectContainerPaths(
  value: unknown,
  path: string,
  depth: number,
  maxDepth: number,
  paths: string[]
): void {
  if (!isContainer(value) || depth > maxDepth) {
    return;
  }

  paths.push(path);
  for (const [key, child] of getJsonEntries(value)) {
    collectContainerPaths(child, `${path}.${key}`, depth + 1, maxDepth, paths);
  }
}

/**
 * Counts matching rows recursively.
 *
 * @param value - Current value.
 * @param path - Current path.
 * @param label - Current label.
 * @param query - Normalized search query.
 * @returns Match count.
 */
function countMatches(
  value: unknown,
  path: string,
  label: string,
  query: string
): number {
  const self = matchesJsonQuery(label, value, path, query) ? 1 : 0;

  if (!isContainer(value)) {
    return self;
  }

  return getJsonEntries(value).reduce((total, [key, child]) => {
    return total + countMatches(child, `${path}.${key}`, key, query);
  }, self);
}

/**
 * Collects container ancestors that reveal matching search rows.
 *
 * @param value - Current value.
 * @param path - Current path.
 * @param label - Current label.
 * @param query - Normalized query.
 * @param ancestors - Container ancestors of the current row.
 * @param paths - Output path set.
 */
function collectSearchExpandedPaths(
  value: unknown,
  path: string,
  label: string,
  query: string,
  ancestors: readonly string[],
  paths: Set<string>
): void {
  const container = isContainer(value);

  if (matchesJsonQuery(label, value, path, query)) {
    for (const ancestor of ancestors) {
      paths.add(ancestor);
    }
    if (container) {
      paths.add(path);
    }
  }

  if (!container) {
    return;
  }

  const nextAncestors = [...ancestors, path];
  for (const [key, child] of getJsonEntries(value)) {
    collectSearchExpandedPaths(child, `${path}.${key}`, key, query, nextAncestors, paths);
  }
}
