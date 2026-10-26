import type { Decoration } from "@quirekit/pm";

/**
 * Creates a stable decoration id.
 *
 * @param decoration - Decoration to identify.
 * @param index - Index used as fallback.
 * @returns Stable decoration id.
 */
export function createDecorationId(decoration: Decoration, index: number): string {
  const key = typeof decoration.spec?.key === "string"
    ? decoration.spec.key
    : undefined;

  return key ?? `decoration-${index}-${decoration.from}-${decoration.to}`;
}
