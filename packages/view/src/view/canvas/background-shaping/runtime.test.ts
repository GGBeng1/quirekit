import { createEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { createQuireView } from "../../facade";
import { createCanvasBackgroundShapingRuntime } from "./runtime";

describe("Canvas background shaping runtime", () => {
  it("warms accepted textblock shapes and reuses them on the next job", async () => {
    const editor = createEditor({ extensions: [StarterKit] });
    const schema = editor.state.schema;
    editor.setContent(schema.nodes.doc!.create(null, [
      schema.nodes.paragraph!.create(null, schema.text("first paragraph")),
      schema.nodes.paragraph!.create(null, schema.text("second paragraph"))
    ]));
    const revision = { stateVersion: 1, layoutEpoch: 1 };
    const runtime = createCanvasBackgroundShapingRuntime({
      editor,
      view: createQuireView({ editor }),
      textMeasurer: {
        measureText: (text) => ({ width: Array.from(text).length * 10 })
      },
      readCurrentRevision: () => revision,
      runtimeId: "canvas:test"
    });
    const request = {
      fromIndex: 0,
      toIndex: 2,
      revision,
      width: 100,
      font: "16px sans-serif",
      lineHeight: 24,
      textBaselineOffset: 18,
      lineBreakMode: "word" as const
    };

    await expect(runtime.shape(request)).resolves.toMatchObject({
      accepted: true,
      attachedBlockCount: 2,
      cachedBlockCount: 0
    });
    await expect(runtime.shape(request)).resolves.toMatchObject({
      accepted: true,
      attachedBlockCount: 0,
      cachedBlockCount: 2
    });
    expect(runtime.snapshot()).toMatchObject({ accepted: 1 });
  });

  it("rejects output after the mounted revision advances", async () => {
    const editor = createEditor({ extensions: [StarterKit] });
    const schema = editor.state.schema;
    editor.setContent(schema.nodes.doc!.create(null, [
      schema.nodes.paragraph!.create(null, schema.text("stale paragraph"))
    ]));
    let revision = { stateVersion: 1, layoutEpoch: 1 };
    const runtime = createCanvasBackgroundShapingRuntime({
      editor,
      view: createQuireView({ editor }),
      textMeasurer: {
        measureText: (text) => ({ width: text.length * 10 })
      },
      readCurrentRevision: () => revision,
      runtimeId: "canvas:stale"
    });

    const completion = runtime.shape({
      fromIndex: 0,
      toIndex: 1,
      revision: { stateVersion: 1, layoutEpoch: 1 },
      width: 100,
      font: "16px sans-serif",
      lineHeight: 24,
      textBaselineOffset: 18,
      lineBreakMode: "word"
    });
    revision = { stateVersion: 2, layoutEpoch: 2 };

    await expect(completion).resolves.toMatchObject({
      accepted: false,
      reason: "stale-state"
    });
  });
});
