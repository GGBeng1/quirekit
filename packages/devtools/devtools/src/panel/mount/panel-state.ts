import { collectJsonContainerPaths } from "../json";
import {
  readEntryId,
  readJsonPath
} from "../interaction";
import { readDocumentJson } from "../snapshot";
import type { QuireDevtools } from "../../types";

/**
 * Toggles an expanded interaction id from an action target.
 *
 * @param expandedIds - Mutable expanded id set.
 * @param target - Original event target.
 */
export function toggleExpandedInteraction(
  expandedIds: Set<number>,
  target: EventTarget | null
): void {
  toggleExpandedEntryId(expandedIds, target);
}

/**
 * Toggles an expanded timeline entry id from an action target.
 *
 * @param expandedIds - Mutable expanded id set.
 * @param target - Original event target.
 */
export function toggleExpandedTimelineEntry(
  expandedIds: Set<number>,
  target: EventTarget | null
): void {
  toggleExpandedEntryId(expandedIds, target);
}

/**
 * Toggles an expanded entry id from an action target.
 *
 * @param expandedIds - Mutable expanded id set.
 * @param target - Original event target.
 */
function toggleExpandedEntryId(
  expandedIds: Set<number>,
  target: EventTarget | null
): void {
  const entryId = readEntryId(target);

  if (entryId === undefined) {
    return;
  }

  if (expandedIds.has(entryId)) {
    expandedIds.delete(entryId);
  } else {
    expandedIds.add(entryId);
  }
}

/**
 * Toggles a JSON expanded path from an action target.
 *
 * @param expandedPaths - Mutable expanded path set.
 * @param target - Original event target.
 */
export function toggleJsonExpandedPath(
  expandedPaths: Set<string>,
  target: EventTarget | null
): void {
  const path = readJsonPath(target);

  if (!path) {
    return;
  }

  if (expandedPaths.has(path)) {
    expandedPaths.delete(path);
  } else {
    expandedPaths.add(path);
  }
}

/**
 * Collects all JSON container paths from the current document.
 *
 * @param devtools - Devtools instance to read.
 * @returns Expanded path set.
 */
export function collectAllJsonExpandedPaths(
  devtools: Pick<QuireDevtools, "getSnapshot">
): Set<string> {
  return new Set(collectJsonContainerPaths(readDocumentJson(devtools)));
}
