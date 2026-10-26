import { createEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { buildQuireLayoutSnapshot } from "..";
import { CanvasBlockShapeCache } from "../../layout/cache";
import { buildQuireDisplayList } from "../../display-list";

describe('native underline cache and layout', () => {
  it('changes color and pattern without changing text geometry or reusing stale fragments', () => {
    const editor = createEditor({ extensions: [StarterKit], content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'AB CD' }] }] } });
    const cache = new CanvasBlockShapeCache();
    /** @returns Current layout with a retained shape cache. */
    function snapshot() { return buildQuireLayoutSnapshot({ state: editor.state, viewportRect: { x: 0, y: 0, width: 300, height: 200 },
      blockShapeCache: cache, font: '18px serif', textBaselineOffset: 18, textMeasurer: { measureText: text => ({ width: text.length * 10 }) } }); }
    const plain = snapshot().root.children![0]!.textFragments![0]!;
    editor.commands.setTextSelection({ from: 1, to: 6 });
    for (const [style, color, count, kind] of [['double', '#123456', 2, 'line'], ['wave', '#654321', 1, 'path'], ['none', '#123456', 0, 'line']] as const) {
      editor.commands.setUnderline({ underlineType: style, color });
      const result = snapshot();
      const fragment = result.root.children![0]!.textFragments![0]!;
      expect(editor.getAttributes("underline")).toMatchObject({ underlineType: style, color });
      if (style !== "none") expect(fragment.underline).toEqual({ style, color });
      expect(fragment.rect).toEqual(plain.rect);
      expect(fragment.caretStops).toEqual(plain.caretStops);
      expect(fragment.baseline).toBe(plain.baseline);
      const commands = buildQuireDisplayList({ snapshot: result }).commands.filter(c => c.id.includes(':underline-'));
      expect(commands).toHaveLength(count);
      expect(commands.every(c => (c.kind === 'line' || c.kind === 'path') && c.kind === kind && c.strokeStyle === color)).toBe(true);
    }
    editor.destroy();
  });
});
