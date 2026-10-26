import { doesQuireRectIntersectAny } from "@quirekit/renderer";
import type { QuireLayoutNode } from "../layout";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireDecorationLaneOptions, QuireInvisibleCharacterVisual } from "./types";

/**
 * Projects nonprinting hints from visible accepted fragments, without measuring
 * text or traversing the whole document. Source offsets and caret coordinates
 * remain authoritative even when painted text has collapsed spaces or BiDi runs.
 * @param options - Accepted snapshot and view-only visibility/theme configuration.
 * @returns Annotation visuals, empty for hidden hints and export collection.
 */
export function collectInvisibleCharacterVisuals(options: QuireDecorationLaneOptions): readonly QuireInvisibleCharacterVisual[] {
  const config = options.invisibleCharacters;
  if (!config || options.scope === "persistent-content"
    || !(typeof config.visible === "function" ? config.visible() : config.visible)) return [];
  const result: QuireInvisibleCharacterVisual[] = [];
  const seen = new Set<string>();
  const doc = options.snapshot.state.pm.doc;

  /** @param node - Accepted layout occurrence, possibly clipped to one page. */
  function visit(node: QuireLayoutNode): void {
    if (options.clipRects?.length && !doesQuireRectIntersectAny(node.rect, options.clipRects)) return;
    for (const fragment of node.textFragments ?? []) {
      if (fragment.hiddenText === "collapsed") continue;
      if (options.clipRects?.length && !doesQuireRectIntersectAny(
        { ...fragment.rect, width: Math.max(1, fragment.rect.width) }, options.clipRects)) continue;
      const from = Math.max(0, fragment.range.from);
      const to = Math.min(doc.content.size, fragment.range.to);
      if (from > to) continue;
      doc.nodesBetween(from, to, (source, pos) => {
        if (source.isText) {
          const start = Math.max(from, pos);
          const end = Math.min(to, pos + source.nodeSize);
          const text = source.text!.slice(start - pos, end - pos);
          for (let index = 0; index < text.length; index += 1) {
            const glyph = text[index] === " " ? "·" : text[index] === "\t" ? "→" : text[index] === "\n" ? "↵" : null;
            if (glyph) append(node, fragment, start + index, glyph, false);
          }
        } else if (source.type.spec.quireInlineBreak === "page") {
          append(node, fragment, pos, config!.pageBreakLabel ?? "Page break", true);
        } else if (source.type.spec.quireInlineBreak === "column") {
          append(node, fragment, pos, config!.columnBreakLabel ?? "Column break", true);
        } else if (source.type.spec.linebreakReplacement === true) {
          append(node, fragment, pos, "↵", false);
        }
      });
      // Newline ink is absent from renderer runs. The outgoing line's final
      // caret still identifies its source atom, while paragraph-end is a gap.
      const next = doc.nodeAt(to);
      if (next?.type.spec.linebreakReplacement === true) append(node, fragment, to, "↵", false);
      const resolved = doc.resolve(to);
      if (resolved.parent.isTextblock && resolved.parentOffset === resolved.parent.content.size) {
        append(node, fragment, to, "¶", false);
      }
    }
    for (const child of node.children ?? []) visit(child);
  }

  /** @param node - Owning occurrence. @param fragment - Caret authority. @param pos - Source position. @param text - Hint glyph. @param pageBreak - Whether to draw a boundary line. */
  function append(node: QuireLayoutNode, fragment: QuireTextFragment, pos: number, text: string, pageBreak: boolean): void {
    const caret = fragment.caretStops.find(stop => stop.position.pos === pos);
    if (!caret) return;
    const id = `invisible:${node.id}:${pos}:${text}`;
    if (seen.has(id)) return;
    seen.add(id);
    const x = fragment.rect.x + caret.localX;
    const size = Number.parseFloat(/([\d.]+)px/.exec(fragment.font)?.[1] ?? "16");
    // Hints annotate source geometry; they must not inherit heading emphasis
    // or change the source's advances, line height, or paragraph-end position.
    const hintSize = pageBreak ? Math.min(size, 12) : Math.min(16, Math.max(9, size * 0.8));
    const next = fragment.caretStops.find(stop => stop.position.pos === pos + 1);
    const advance = next ? next.localX - caret.localX : 0;
    const glyphWidth = hintSize * 0.55;
    const lineRect = node.inlineLayoutRect ?? node.rect;
    const width = pageBreak ? Math.max(glyphWidth, lineRect.x + lineRect.width - x) : glyphWidth;
    result.push({ decorationId: id, range: { from: pos, to: pos },
      rect: { x: x + (text === "·" ? (advance - glyphWidth) / 2 : 0), y: fragment.rect.y,
        width, height: fragment.lineHeight }, baseline: fragment.baseline,
      text: pageBreak && width < 60 ? "↡" : text, pageBreak,
      font: `normal 400 ${hintSize}px sans-serif`,
      color: config!.color, opacity: config!.opacity ?? 1 });
  }

  for (const node of options.snapshot.root.children ?? []) visit(node);
  return result;
}
