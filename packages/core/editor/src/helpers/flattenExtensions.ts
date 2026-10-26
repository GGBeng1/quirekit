import type { QuireAnyExtension } from "../types";

/**
 * Expands extension trees into the declaration order expected by Tiptap-compatible
 * aggregate extensions.
 *
 * @param extensions - Top-level extensions provided by the caller.
 * @returns A flat extension list containing each parent before its children.
 */
export function flattenExtensions(
  extensions: readonly QuireAnyExtension[]
): readonly QuireAnyExtension[] {
  const flattened: QuireAnyExtension[] = [];

  for (const extension of extensions) {
    flattened.push(extension);
    flattened.push(...flattenExtensions(extension.extensions ?? []));
  }

  return flattened;
}
