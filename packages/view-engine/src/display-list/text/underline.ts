import { createWavyTextDecorationCommand } from "./decoration-wave";
import type { QuireDisplayCommand, QuireDocumentRange } from "@quirekit/renderer";
import type { QuireTextFragment } from "@quirekit/layout/text";
import { parseQuireFontPixelSize } from "@quirekit/layout/shaping";
import { resolveFragmentSegment } from "./fragment/segment";

/**
 * Compiles native underline styles into backend-neutral line/path commands.
 * @param commands - Output display list.
 * @param id - Stable paint identity.
 * @param fragment - Source baseline and caret geometry.
 * @param range - Visible segment in document coordinates.
 * @param localX - Segment offset inside the fragment.
 * @param width - Segment advance.
 * @param color - Resolved glyph color for automatic underline color.
 */
export function appendNativeUnderline(commands: QuireDisplayCommand[], id: string,
  fragment: QuireTextFragment, range: QuireDocumentRange, localX: number, width: number, color: string): void {
  const style = fragment.underline?.style ?? "single";
  if (style === "none" || width <= 0) return;
  if (style === "words") {
    // Logical whitespace boundaries are projected through existing visual caret stops.
    // Never divide advances by UTF-16 length; RTL segments can run right to left.
    const text = fragment.text.slice(range.from - fragment.range.from, range.to - fragment.range.from);
    for (const match of text.matchAll(/\S+/gu)) {
      const part = { from: range.from + match.index, to: range.from + match.index + match[0].length };
      const segment = resolveFragmentSegment(fragment, part);
      appendNativeUnderline(commands, `${id}:word-${match.index}`, { ...fragment,
        underline: { ...fragment.underline, style: "single" } }, part, segment.localX, segment.width, color);
    }
    return;
  }
  const base = Math.max(1, (parseQuireFontPixelSize(fragment.font) ?? 16) / 18);
  const weight = /heavy|thick/iu.test(style) ? base * 2 : base;
  const x = fragment.rect.x + localX;
  const y = fragment.baseline + Math.max(2, weight * 2);
  const strokeStyle = fragment.underline?.color ?? color;
  const double = style === "double" || style === "wavyDouble";
  const wave = /wav/iu.test(style);
  const dash = underlineDash(style, base);
  for (let index = 0; index < (double ? 2 : 1); index++) {
    const lineY = y + index * base * (wave ? 4 : 3);
    const identity = `${id}:underline-${index}`;
    if (!wave) {
      commands.push({ id: identity, kind: "line", layer: "content", range,
        from: { x, y: lineY }, to: { x: x + width, y: lineY }, strokeStyle, lineWidth: weight,
        ...(dash ? { lineDash: dash } : {}) });
      continue;
    }
    commands.push(createWavyTextDecorationCommand(identity, range, x, x + width, lineY,
      { kind: "underline", color: strokeStyle, width: weight }, base * 1.5, base * 4, weight / 2));
  }
}

/** @param style - Standard pattern. @param unit - Normal line width. @returns Dash pattern or a solid stroke. */
function underlineDash(style: string, unit: number): readonly number[] | undefined {
  const pattern = /dotted/iu.test(style) ? [1, 2]
    : /dotdot|dotdotheavy/iu.test(style) ? [6, 2, 1, 2, 1, 2]
    : /dotdash|dashdot/iu.test(style) ? [6, 2, 1, 2]
    : /long/iu.test(style) ? [10, 3]
    : /dash/iu.test(style) ? [5, 3] : undefined;
  return pattern?.map(value => value * unit);
}
