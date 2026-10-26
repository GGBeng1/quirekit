import type { QuireMarkCanvasStyle, QuireMarkCanvasStyleResolver, QuireNodeCanvasTextStyle } from "@quirekit/core";
import type { Mark } from "@quirekit/pm";

/**
 * Resolves each occurrence once, moving semantic style marks below all direct formatting.
 * @param marks - Source marks, whose schema order is not a style priority.
 * @param resolve - Captured extension resolver.
 * @param nodeStyle - Base textblock properties.
 * @returns Base style and cached direct-mark resolver for the existing typography pipeline.
 */
export function prepareInlineStyleCascade(marks: readonly Mark[], resolve: QuireMarkCanvasStyleResolver | undefined, nodeStyle: QuireNodeCanvasTextStyle | null | undefined) {
  let inherited = nodeStyle;
  let hasSemanticStyle = false;
  const direct: Mark[] = [], styles = new Map<Mark, QuireMarkCanvasStyle | null>();
  for (const mark of marks) {
    const style = resolve?.(mark) ?? null;
    if (style?.cascade === "inherited") { inherited = { ...inherited, ...style }; hasSemanticStyle = true; }
    else { direct.push(mark); styles.set(mark, style); }
  }
  if (!hasSemanticStyle && nodeStyle?.defaultInlineStyle) inherited = { ...inherited, ...nodeStyle.defaultInlineStyle };
  return { inherited, direct, resolve: ((mark) => styles.get(mark) ?? null) as QuireMarkCanvasStyleResolver };
}
