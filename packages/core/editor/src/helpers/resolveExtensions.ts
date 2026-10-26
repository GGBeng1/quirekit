import type { QuireAnyExtension } from "../types";
import { findDuplicates } from "../utilities/findDuplicates";
import { flattenExtensions } from "./flattenExtensions";
import { sortExtensions } from "./sortExtensions";

/**
 * Flattens and sorts Tiptap-compatible extensions while warning about
 * duplicate extension names.
 *
 * @param extensions - Top-level extensions to resolve.
 * @returns Flattened and priority-sorted extension list.
 */
export function resolveExtensions(
  extensions: readonly QuireAnyExtension[]
): readonly QuireAnyExtension[] {
  const resolvedExtensions = sortExtensions(flattenExtensions(extensions));
  const duplicatedNames = findDuplicates(
    resolvedExtensions.map((extension) => extension.name)
  );

  if (duplicatedNames.length > 0) {
    console.warn(
      `[quirekit warn]: Duplicate extension names found: [${duplicatedNames
        .map((name) => `'${name}'`)
        .join(", ")}]. This can lead to issues.`
    );
  }

  return resolvedExtensions;
}
