import { describe, expect, it } from "vitest";
import { deriveQuireViewUpdatePatch } from "../invalidation";
import { canReuseQuireViewEngineLayoutSnapshot } from "./layout";
import { createQuireViewEngineRuntime } from "./runtime";
import { baseOptions, createFixtureEditor, selectionPatch, setSelection } from "../../test-support/frame-layout-reuse";

const pageGeometry = {
  pageRect: { x: 0, y: 0, width: 320, height: 100 },
  bodyRect: { x: 20, y: 10, width: 280, height: 80 },
  pageGap: 12
};

describe("canonical layout and viewport projection", () => {
  it.each(["selection", "scroll", "image-paint"])("reprojects A to B and back without layout for %s", (reason) => {
    const editor = createFixtureEditor(20);
    const runtime = createQuireViewEngineRuntime({ editor });
    const phases: string[] = [];
    const options = { ...baseOptions, pageGeometry, trace: (phase: { name: string }) => phases.push(phase.name) };
    const initial = runtime.buildFrame(options);
    const pages = initial.layoutSnapshot.pages!;
    expect(pages.length).toBeGreaterThan(2);
    const windows = [pages[0]!.pageRect, pages[2]!.pageRect, pages[0]!.pageRect];
    phases.length = 0;

    for (const [index, rect] of windows.entries()) {
      const current = {
        ...options, layoutSnapshotClipRects: [rect],
        updatePatch: deriveQuireViewUpdatePatch({ reason })
      };
      const frame = runtime.buildFrame(current);
      const full = createQuireViewEngineRuntime({ editor }).buildFrame({ ...current, trace: undefined, updatePatch: undefined });
      expect(frame.cacheCounters!.layoutProduct).toMatchObject({ rebuilt: 1, reused: index + 1 });
      expect(frame.layoutSnapshot.pages).toEqual(full.layoutSnapshot.pages);
      expect(frame.contentDisplayList).toEqual(full.contentDisplayList);
      expect(frame.overlayDisplayList).toEqual(full.overlayDisplayList);
      expect(frame.selectionGeometry).toEqual(full.selectionGeometry);
      expect(frame.viewTargets).toEqual(full.viewTargets);
      expect(frame.layoutSnapshot.state.doc).toBe(initial.layoutSnapshot.state.doc);
    }
    expect(phases.filter(name => name === "layout:collect" || name === "layout:paginate")).toEqual([]);
  });

  it("rejects old mounted geometry for a changed clip while retaining canonical layout", () => {
    const editor = createFixtureEditor(12);
    const runtime = createQuireViewEngineRuntime({ editor });
    const clips = [{ ...pageGeometry.pageRect }];
    const options = { ...baseOptions, pageGeometry, layoutSnapshotClipRects: clips };
    const initial = runtime.buildFrame(options);
    const current = { ...options, updatePatch: selectionPatch() };
    expect(canReuseQuireViewEngineLayoutSnapshot({ snapshot: initial.layoutSnapshot, state: editor.state, options: current })).toBe(true);
    clips[0]!.y += 112;
    expect(canReuseQuireViewEngineLayoutSnapshot({ snapshot: initial.layoutSnapshot, state: editor.state, options: current })).toBe(false);
    const frame = runtime.buildFrame(current);
    const full = createQuireViewEngineRuntime({ editor }).buildFrame(options);
    expect(frame.cacheCounters!.layoutProduct).toMatchObject({ rebuilt: 1, reused: 1 });
    expect(frame.contentDisplayList).toEqual(full.contentDisplayList);
  });

  it("skips projection when a measured selection remains in the same window", () => {
    const editor = createFixtureEditor(12);
    const runtime = createQuireViewEngineRuntime({ editor });
    const phases: string[] = [];
    const options = {
      ...baseOptions, pageGeometry, layoutSnapshotClipRects: [pageGeometry.pageRect],
      trace: (phase: { name: string }) => phases.push(phase.name)
    };
    runtime.buildFrame(options);
    phases.length = 0;
    setSelection(editor, 4);
    runtime.buildFrame({ ...options, updatePatch: selectionPatch() });
    expect(phases).not.toContain("layout:project");
    expect(phases).toContain("layout:adapt");
  });

  it.each(["scroll", "image-paint"])("keeps %s with unknown transactions on the full-layout path", (reason) => {
    const editor = createFixtureEditor(12);
    const runtime = createQuireViewEngineRuntime({ editor });
    const options = { ...baseOptions, pageGeometry };
    runtime.buildFrame(options);
    const transaction = editor.state.pm.tr.setMeta("unknown", true);
    const frame = runtime.buildFrame({
      ...options, layoutSnapshotClipRects: [pageGeometry.pageRect],
      updatePatch: deriveQuireViewUpdatePatch({ reason, transactions: [transaction] })
    });
    expect(frame.cacheCounters!.layoutProduct).toMatchObject({ rebuilt: 2, reused: 0, fallbackReason: "update-patch" });
  });

  it.each([false, true])("uses measured source outside the previous window for reverse=%s selection", (reverse) => {
    const editor = createFixtureEditor(20);
    const runtime = createQuireViewEngineRuntime({ editor });
    const options = { ...baseOptions, pageGeometry };
    const all = runtime.buildFrame(options);
    const first = all.layoutSnapshot.pages![0]!;
    const third = all.layoutSnapshot.pages![2]!;
    const from = first.range.from + 1;
    const to = third.range.from + 4;
    setSelection(editor, reverse ? to : from);
    runtime.buildFrame({ ...options, layoutSnapshotClipRects: [reverse ? third.pageRect : first.pageRect], updatePatch: selectionPatch() });
    setSelection(editor, reverse ? to : from, reverse ? from : to);
    const current = { ...options, layoutSnapshotClipRects: [reverse ? first.pageRect : third.pageRect], updatePatch: selectionPatch() };
    const frame = runtime.buildFrame(current);
    const full = createQuireViewEngineRuntime({ editor }).buildFrame(current);
    expect(frame.cacheCounters!.layoutProduct.rebuilt).toBe(1);
    expect(frame.selectionGeometry).toEqual(full.selectionGeometry);
    expect(frame.selectionGeometry.ranges.length).toBeGreaterThan(0);
  });

  it.each([undefined, [], [{ x: 0, y: 0, width: 0, height: 100 }]])(
    "normalizes empty clips and preserves the full projection for %j", (clips) => {
      const editor = createFixtureEditor(12);
      const runtime = createQuireViewEngineRuntime({ editor });
      const options = { ...baseOptions, pageGeometry };
      runtime.buildFrame({ ...options, layoutSnapshotClipRects: [pageGeometry.pageRect] });
      const current = { ...options, layoutSnapshotClipRects: clips, updatePatch: selectionPatch() };
      const frame = runtime.buildFrame(current);
      const full = createQuireViewEngineRuntime({ editor }).buildFrame(current);
      expect(frame.cacheCounters!.layoutProduct).toMatchObject({ rebuilt: 1, reused: 1 });
      expect(frame.contentDisplayList).toEqual(full.contentDisplayList);
      expect(frame.selectionGeometry).toEqual(full.selectionGeometry);
    }
  );

  it("reuses an unpaginated source while adapting a changed window", () => {
    const editor = createFixtureEditor(12);
    const runtime = createQuireViewEngineRuntime({ editor });
    runtime.buildFrame(baseOptions);
    const current = {
      ...baseOptions, updatePatch: selectionPatch(),
      layoutSnapshotClipRects: [{ ...baseOptions.viewportRect, y: 100 }]
    };
    const frame = runtime.buildFrame(current);
    const full = createQuireViewEngineRuntime({ editor }).buildFrame(current);
    expect(frame.cacheCounters!.layoutProduct).toMatchObject({ rebuilt: 1, reused: 1 });
    expect(frame.contentDisplayList).toEqual(full.contentDisplayList);
    expect(frame.viewTargets).toEqual(full.viewTargets);
  });

  it("keeps the accepted window when a reprojected frame fails", () => {
    const editor = createFixtureEditor(12);
    const runtime = createQuireViewEngineRuntime({ editor });
    const options = { ...baseOptions, pageGeometry, layoutSnapshotClipRects: [pageGeometry.pageRect] };
    const initial = runtime.buildFrame(options);
    const changed = {
      ...options, layoutSnapshotClipRects: [{ ...pageGeometry.pageRect, y: 224 }],
      updatePatch: selectionPatch()
    };
    expect(() => runtime.buildFrame({
      ...changed, decorationSourceView: {
        get state() { return editor.state.pm; },
        someProp() { throw new Error("window decoration failure"); }
      }
    })).toThrow("window decoration failure");
    expect(canReuseQuireViewEngineLayoutSnapshot({
      snapshot: initial.layoutSnapshot, state: editor.state,
      options: { ...options, updatePatch: selectionPatch() }
    })).toBe(true);
    const frame = runtime.buildFrame(changed);
    const full = createQuireViewEngineRuntime({ editor }).buildFrame(changed);
    expect(frame.cacheCounters!.layoutProduct).toMatchObject({ rebuilt: 1, reused: 2 });
    expect(frame.contentDisplayList).toEqual(full.contentDisplayList);
  });

  it.each([false, true])("owns clips across projection callbacks for reuse=%s", (reuse) => {
    const editor = createFixtureEditor(12);
    const runtime = createQuireViewEngineRuntime({ editor });
    const options = { ...baseOptions, pageGeometry };
    if (reuse) runtime.buildFrame(options);
    const clips = [{ ...pageGeometry.pageRect }];
    const originalClips = structuredClone(clips);
    const current = {
      ...options, layoutSnapshotClipRects: clips, updatePatch: selectionPatch(),
      trace: (phase: { name: string }) => {
        if (phase.name === "layout:project") clips[0]!.y = 224;
      }
    };
    const frame = runtime.buildFrame(current);
    const full = createQuireViewEngineRuntime({ editor }).buildFrame({ ...options, layoutSnapshotClipRects: originalClips });
    expect(frame.contentDisplayList).toEqual(full.contentDisplayList);
    expect(canReuseQuireViewEngineLayoutSnapshot({
      snapshot: frame.layoutSnapshot, state: editor.state, options: current
    })).toBe(false);
    const next = runtime.buildFrame({ ...current, trace: undefined });
    const nextFull = createQuireViewEngineRuntime({ editor }).buildFrame({ ...current, trace: undefined });
    expect(next.contentDisplayList).toEqual(nextFull.contentDisplayList);
  });
});
