import type { QuireResolvedDecorationStyle } from "../types";

/**
 * Merges a theme style into an existing resolved style.
 *
 * @param base - Existing style.
 * @param next - Theme style to merge.
 * @returns Merged style.
 */
export function mergeResolvedDecorationStyle(
  base: QuireResolvedDecorationStyle,
  next: Partial<QuireResolvedDecorationStyle> | undefined
): QuireResolvedDecorationStyle {
  if (!next) {
    return base;
  }

  return {
    ...base,
    ...next,
    ...(base.textDecoration === undefined && next.textDecoration === undefined
      ? {}
      : {
          textDecoration: [
            ...(base.textDecoration ?? []),
            ...(next.textDecoration ?? [])
          ]
        }),
    ...(base.fontHints === undefined && next.fontHints === undefined
      ? {}
      : {
          fontHints: {
            ...(base.fontHints ?? {}),
            ...(next.fontHints ?? {})
          }
        })
  };
}
