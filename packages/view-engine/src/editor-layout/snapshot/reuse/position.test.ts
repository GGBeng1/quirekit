import { describe, expect, it } from "vitest";
import { createFixtureEditor, baseOptions } from "../../../../test-support/frame-layout-reuse";
import { createQuireViewEngineRuntime } from "../../../frame/runtime";
import { createQuireInteractionGeometryAuthority } from "../../../interaction/geometry";
import { resolveQuireLayoutSnapshotForPosition } from "./position";

const options = {
  ...baseOptions,
  pageGeometry: {
    pageRect: { ...baseOptions.viewportRect },
    bodyRect: { x: 20, y: 20, width: 280, height: 200 },
    pageGap: 12
  }
};

describe("offscreen position projection", () => {
  it("queries one retained page without rebuilding layout or changing the mounted window", () => {
    const editor = createFixtureEditor(80);
    const runtime = createQuireViewEngineRuntime({ editor });
    const stages: string[] = [];
    const frame = runtime.buildFrame({
      ...options, layoutSnapshotClipRects: [baseOptions.viewportRect],
      trace: entry => stages.push(entry.name)
    });
    const snapshot = frame.interactionSnapshot;
    const position = editor.state.doc.content.size - 3;
    expect(createQuireInteractionGeometryAuthority({ snapshot }).coordsAtPos(position).source).toBe("viewport-fallback");
    const initialTree = snapshot.root;
    stages.length = 0;
    const projected = resolveQuireLayoutSnapshotForPosition(snapshot, position)!;
    expect(projected).not.toBeNull();
    const actual = createQuireInteractionGeometryAuthority({ snapshot: projected }).coordsAtPos(position);
    const full = createQuireViewEngineRuntime({ editor }).buildFrame(options);
    const expected = createQuireInteractionGeometryAuthority({ snapshot: full.interactionSnapshot }).coordsAtPos(position);
    expect(actual.rect).toEqual(expected.rect);
    expect(actual.source).not.toBe("viewport-fallback");
    expect(actual.snapshotVersion).toBe(snapshot.viewGraph.version);
    expect(snapshot.root).toBe(initialTree);
    expect(createQuireInteractionGeometryAuthority({ snapshot }).coordsAtPos(position).source).toBe("viewport-fallback");
    expect(projected.root.children!.length).toBeLessThan(full.layoutSnapshot.root.children!.length);
    expect(stages.filter(name => name === "layout:project")).toHaveLength(1);
    expect(stages).not.toContain("layout:collect");
    expect(stages).not.toContain("layout:paginate");
    stages.length = 0;
    expect(resolveQuireLayoutSnapshotForPosition(snapshot, position - 1)).toBe(projected);
    expect(stages).toEqual([]);
    editor.destroy();
  });

  it("respects page-boundary bias and rejects unavailable or mismatched sources", () => {
    const editor = createFixtureEditor(80);
    const snapshot = createQuireViewEngineRuntime({ editor }).buildFrame({
      ...options, layoutSnapshotClipRects: [baseOptions.viewportRect]
    }).interactionSnapshot;
    const page = snapshot.pages![3]!;
    const projection = resolveQuireLayoutSnapshotForPosition(snapshot, page.range.from)!;
    expect(projection).not.toBeNull();
    const full = createQuireViewEngineRuntime({ editor }).buildFrame(options).interactionSnapshot;
    for (const side of [1, -1]) {
      expect(createQuireInteractionGeometryAuthority({ snapshot: projection }).coordsAtPos(page.range.from, side).rect)
        .toEqual(createQuireInteractionGeometryAuthority({ snapshot: full }).coordsAtPos(page.range.from, side).rect);
    }
    expect(resolveQuireLayoutSnapshotForPosition(snapshot, -1)).toBeNull();
    editor.commands.insertContentAt(1, "changed");
    expect(resolveQuireLayoutSnapshotForPosition({ ...snapshot, state: editor.state }, page.range.from)).toBeNull();
    editor.destroy();
  });
});
