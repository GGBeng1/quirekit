import { createEditor } from "@quirekit/core";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import type { Canvas2DRenderTarget } from "@quirekit/renderer";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { createQuireView } from ".";

const fixedMeasurer: QuireTextMeasurer = {
  measureText: (text) => ({ width: Array.from(text).length * 10 })
};

describe("mounted IME text style", () => {
  it("renders the composition preedit at the heading's resolved size", () => {
    const editor = createEditor({ extensions: [StarterKit.configure({ undoRedo: false })] });
    const schema = editor.state.schema;

    editor.setContent(
      schema.nodes.doc!.create(null, schema.nodes.heading!.create({ level: 1 }, schema.text("Hi")))
    );
    editor.commands.setTextSelection(3);

    const view = createQuireView({ editor });
    const result = view.render({
      viewportRect: { x: 0, y: 0, width: 400, height: 200 },
      target: createNoopCanvasTarget(),
      textMeasurer: fixedMeasurer,
      displayListStyles: {
        font: "16px sans-serif",
        textBaselineOffset: 18
      },
      imePreedit: { range: { from: 3, to: 3 }, text: "ni" }
    });

    const layoutFragments = result.layoutSnapshot.root.children?.[0]?.textFragments ?? [];
    const preedit = result.contentDisplayList.commands.find(
      (command) => command.kind === "text" && command.text === "ni"
    );
    const preeditBackground = result.contentDisplayList.commands.find(
      (command) => command.id.endsWith(":ime-preedit-background")
    );
    expect(
      layoutFragments.some((fragment) => fragment.marks?.includes("ime-preedit"))
    ).toBe(false);
    expect(preedit).toMatchObject({ text: "ni", font: "bold 32px sans-serif" });
    expect(preeditBackground).toMatchObject({
      kind: "fill-rect",
      layer: "content",
      range: { from: 3, to: 5 }
    });
  });
});

/**
 * Creates a no-op canvas target for render-result tests that inspect commands.
 *
 * @returns Canvas render target that accepts paint calls without recording them.
 */
function createNoopCanvasTarget(): Canvas2DRenderTarget {
  return {
    fillStyle: "",
    font: "",
    clearRect: () => {},
    fillRect: () => {},
    fillText: () => {}
  };
}
