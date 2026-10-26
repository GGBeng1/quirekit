import type { QuireAnyExtension } from "../types";

/** Groups resolved extensions by authoring family. */
export interface QuireSplitExtensions {
  /** Behavior-only extensions. */
  readonly baseExtensions: readonly QuireAnyExtension[];
  /** Node-owning extensions. */
  readonly nodeExtensions: readonly QuireAnyExtension[];
  /** Mark-owning extensions. */
  readonly markExtensions: readonly QuireAnyExtension[];
}

/**
 * Splits resolved extensions by authoring family.
 *
 * @param extensions - Extensions to split.
 * @returns Extensions grouped into base, node, and mark families.
 */
export function splitExtensions(
  extensions: readonly QuireAnyExtension[]
): QuireSplitExtensions {
  return {
    baseExtensions: extensions.filter((extension) => extension.type === "extension"),
    nodeExtensions: extensions.filter((extension) => extension.type === "node"),
    markExtensions: extensions.filter((extension) => extension.type === "mark")
  };
}
