import type { QuireDisplayCommand } from "@quirekit/renderer";
import type { QuireInvisibleCharacterVisual } from "../../decorations";

/**
 * Paints a nonprinting hint in the annotation overlay shared by Canvas and SVG.
 * @param commands - Exact annotation owner command sink.
 * @param visual - Resolved source hint in document coordinates.
 */
export function appendInvisibleCharacterCommands(commands: QuireDisplayCommand[], visual: QuireInvisibleCharacterVisual): void {
  const { rect } = visual;
  const size = Number.parseFloat(/([\d.]+)px/.exec(visual.font)?.[1] ?? "12");
  const labelWidth = [...visual.text].reduce((width, char) => width + size * (char.charCodeAt(0) > 255 ? 1 : 0.55), 0);
  const x = visual.pageBreak ? rect.x + Math.max(0, (rect.width - labelWidth) / 2) : rect.x;
  if (visual.pageBreak && rect.width > labelWidth + 16) {
    const y = visual.baseline - size * 0.3;
    for (const [index, [left, right]] of [[rect.x, x - 4], [x + labelWidth + 4, rect.x + rect.width]].entries()) {
      commands.push({ id: `${visual.decorationId}:line:${index}`, kind: "line", layer: "overlay",
        from: { x: left!, y }, to: { x: right!, y }, strokeStyle: visual.color,
        lineWidth: 0.75, lineDash: [1, 2], range: visual.range, opacity: visual.opacity });
    }
  }
  commands.push({ id: visual.decorationId, kind: "text", layer: "overlay", range: visual.range,
    rect, text: visual.text, origin: { x, y: visual.baseline }, font: visual.font,
    fillStyle: visual.color, opacity: visual.opacity });
}
