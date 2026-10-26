import { describe, expect, it } from "vitest";
import { createQuireViewEngineRuntime } from "./runtime";
import { deriveQuireViewUpdatePatch } from "../invalidation";
import type { QuireViewEngineFrameBuildOptions } from "./types";
import { baseOptions, createFixtureEditor, setSelection } from "../../test-support/frame-layout-reuse";

const changedInputs: readonly [string, Partial<QuireViewEngineFrameBuildOptions>][] = [
  ["viewport origin", { viewportRect: { ...baseOptions.viewportRect, x: 10 } }],
  ["viewport width", { viewportRect: { ...baseOptions.viewportRect, width: 300 } }],
  ["font", { displayListStyles: { font: "18px serif" } }],
  ["baseline", { displayListStyles: { textBaselineOffset: 22 } }],
  ["widows", { widows: 3 }],
  ["orphans", { orphans: 3 }],
  ["hidden text", { hiddenTextViewMode: "formatting-inspection" }],
  ["list collision", { listMarkerCollision: "word-compatible" }],
  ["shape prefix", { maxBlocks: 1 }],
  ["shape extent", { maxShapedBlockExtent: 300 }]
];

describe.each(["selection", "image-paint"])("complete layout input evidence for %s", (reason) => {
  it.each(changedInputs)("rebuilds changed %s despite stable document identity", (_name, changed) => {
    const editor = createFixtureEditor();
    const runtime = createQuireViewEngineRuntime({ editor });
    runtime.buildFrame(baseOptions);
    setSelection(editor, 2);
    const frame = runtime.buildFrame({ ...baseOptions, ...changed, updatePatch: deriveQuireViewUpdatePatch({ reason }) });
    expect(frame.cacheCounters!.layoutProduct)
      .toMatchObject({ rebuilt: 2, reused: 0, fallbackReason: "layout-inputs" });
  });

  it("retains canonical geometry for equal objects and changed projection clips", () => {
    const editor = createFixtureEditor();
    const runtime = createQuireViewEngineRuntime({ editor });
    const options = {
      ...baseOptions,
      layoutSnapshotClipRects: [{ ...baseOptions.viewportRect }],
      pageGeometry: {
        pageRect: { ...baseOptions.viewportRect },
        bodyRect: { x: 20, y: 20, width: 280, height: 200 },
        bodyRectVariants: { first: { x: 30, y: 30, width: 260, height: 180 } },
        pageGap: 12
      }
    };
    runtime.buildFrame(options);
    const fresh = structuredClone(options);
    setSelection(editor, 2);
    expect(runtime.buildFrame({ ...fresh, updatePatch: deriveQuireViewUpdatePatch({ reason }) }).cacheCounters!.layoutProduct)
      .toMatchObject({ rebuilt: 1, reused: 1 });
    fresh.layoutSnapshotClipRects[0]!.width -= 1;
    expect(runtime.buildFrame({ ...fresh, updatePatch: deriveQuireViewUpdatePatch({ reason }) }).cacheCounters!.layoutProduct)
      .toMatchObject({ rebuilt: 1, reused: 2, fallbackReason: null });
  });

  it("requires a typed patch and independently checks immutable document identity", () => {
    const editor = createFixtureEditor();
    const runtime = createQuireViewEngineRuntime({ editor });
    runtime.buildFrame(baseOptions);
    setSelection(editor, 2);
    expect(runtime.buildFrame(baseOptions).cacheCounters!.layoutProduct.fallbackReason).toBe("missing-patch");
    editor.commands.insertContentAt(1, "new ");
    expect(runtime.buildFrame({ ...baseOptions, updatePatch: deriveQuireViewUpdatePatch({ reason }) }).cacheCounters!.layoutProduct)
      .toMatchObject({ rebuilt: 3, reused: 0, fallbackReason: "layout-inputs" });
  });
});
