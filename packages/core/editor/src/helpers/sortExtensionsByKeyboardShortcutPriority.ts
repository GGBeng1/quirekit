import type { QuireAnyExtension } from "../types";

/** Default execution priority used by extensions without an explicit value. */
const DEFAULT_EXTENSION_PRIORITY = 100;

/**
 * Orders extensions for keyboard shortcut dispatch only.
 *
 * Equal shortcut priorities retain the already-resolved extension order. This
 * keeps the override local to key handling and preserves schema, plugin,
 * command, and lifecycle ordering.
 *
 * @param extensions - Resolved extensions in their ordinary execution order.
 * @returns Extensions ordered for keyboard shortcut dispatch.
 */
export function sortExtensionsByKeyboardShortcutPriority(
  extensions: readonly QuireAnyExtension[]
): readonly QuireAnyExtension[] {
  return extensions
    .map((extension, declarationOrder) => ({
      declarationOrder,
      extension,
      priority:
        extension.keyboardShortcutPriority
        ?? extension.priority
        ?? DEFAULT_EXTENSION_PRIORITY
    }))
    .sort(
      (left, right) =>
        right.priority - left.priority
        || left.declarationOrder - right.declarationOrder
    )
    .map(({ extension }) => extension);
}
