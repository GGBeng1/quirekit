import { describe, expect, it } from "vitest";
import { createEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import {
  buildQuireBodyMeasuredContainer,
  compileQuireInfiniteLayoutDocument,
  createQuireViewEngineRuntime,
  withQuireViewEngineAcceptedCacheAuthority
} from "@quirekit/view-engine";
import {
  createQuirePaginationCheckpointStore,
  readQuirePreparedPaginationResult
} from "@quirekit/layout/pagination";
import { compileQuireRemainderPaginationBatch } from "./compiler";
import { handleQuireRemainderPaginationJob } from "./handler";
import type { QuireLayoutJobRequest } from "../types";

const container = {
  id: "body",
  range: { from: 0, to: 6 },
  items: [
    { id: "line:0", range: { from: 0, to: 2 }, height: 30 },
    { id: "line:1", range: { from: 2, to: 4 }, height: 30 },
    { id: "line:2", range: { from: 4, to: 6 }, height: 30 }
  ]
} as const;
const pageGeometry = {
  pageRect: { x: 0, y: 0, width: 100, height: 80 },
  bodyRect: { x: 10, y: 10, width: 80, height: 50 },
  pageGap: 10
} as const;

describe("remainder pagination layout job", () => {
  it("drives and attaches an exact prepared page stream", () => {
    const store = createQuirePaginationCheckpointStore();
    const batch = compileQuireRemainderPaginationBatch({
      requestKey: "request:1",
      container,
      pageGeometry,
      paginationCheckpointStore: store
    });
    const output = handleQuireRemainderPaginationJob(request(batch.payload));
    const attachment = batch.attachAcceptedOutput(output);

    expect(output.fragments).toHaveLength(3);
    expect(attachment).toEqual({ attachedPageCount: 3 });
    expect(readQuirePreparedPaginationResult(
      store,
      container,
      batch.payload.geometryKey
    )).toBe(output.fragments);
  });

  it("preserves page-position body rectangles across the clone-safe job boundary", () => {
    const batch = compileQuireRemainderPaginationBatch({
      requestKey: "request:variants",
      container,
      pageGeometry: {
        ...pageGeometry,
        bodyRectVariants: {
          first: { x: 10, y: 20, width: 80, height: 30 },
          even: { x: 10, y: 10, width: 80, height: 60 },
          odd: { x: 10, y: 15, width: 80, height: 50 }
        }
      },
      paginationCheckpointStore: createQuirePaginationCheckpointStore()
    });
    const output = handleQuireRemainderPaginationJob(request(batch.payload));

    expect(output.fragments.map((fragment) => fragment.bodyRect)).toEqual([
      { x: 10, y: 20, width: 80, height: 30 },
      { x: 10, y: 100, width: 80, height: 60 }
    ]);
  });

  it("feeds a full job result into canonical flow-only layout without synchronous page driving", () => {
    const editor = createEditor({
      extensions: [StarterKit],
      content: { type: "doc", content: Array.from({ length: 6 }, () => ({
        type: "paragraph", content: [{ type: "text", text: "prepared page source" }]
      })) }
    });
    const runtime = createQuireViewEngineRuntime({ editor });
    const options = { viewportRect: { x: 0, y: 0, width: 320, height: 240 }, pageGeometry };
    // The real main-thread compiler and job handler keep their full default
    // contract. Their accepted output must warm the runtime's exact cache lane.
    const batch = withQuireViewEngineAcceptedCacheAuthority(runtime, (caches) => {
      const source = compileQuireInfiniteLayoutDocument({
        ...options, editor, state: editor.state, blockShapeCache: caches.blockShapeCache
      }, caches.retainedBlockGraph);
      return compileQuireRemainderPaginationBatch({
        requestKey: "request:canonical",
        container: buildQuireBodyMeasuredContainer(source.document.children, caches.measuredSourceCache),
        pageGeometry,
        paginationCheckpointStore: caches.paginationCheckpointStore
      });
    });
    const output = handleQuireRemainderPaginationJob(request(structuredClone(batch.payload)));
    expect(output.fragments.length).toBeGreaterThan(1);
    expect(output.fragments.some((page) => (page.sourceFragments?.length ?? 0) > 0)).toBe(true);
    batch.attachAcceptedOutput(structuredClone(output));

    const phases: string[] = [];
    const frame = runtime.buildFrame({ ...options, trace: (phase) => phases.push(phase.name) });
    const fresh = createQuireViewEngineRuntime({ editor }).buildFrame(options);
    expect(phases).toContain("layout:paginate:measured-source");
    expect(phases).not.toContain("layout:paginate:drive");
    expect(frame.layoutSnapshot.pages).toEqual(fresh.layoutSnapshot.pages);
    expect(frame.contentDisplayList).toEqual(fresh.contentDisplayList);
    expect(frame.overlayDisplayList).toEqual(fresh.overlayDisplayList);
    expect(frame.selectionGeometry).toEqual(fresh.selectionGeometry);
    expect(frame.viewTargets).toEqual(fresh.viewTargets);
    editor.destroy();
  });

  it("rejects malformed measured payloads", () => {
    expect(() => handleQuireRemainderPaginationJob(request({
      requestKey: "request:bad",
      container: { ...container, items: [{ id: "bad" }] },
      pageGeometry,
      geometryKey: "geometry"
    }))).toThrow("requires measured flow");
  });

  it("rejects values that only a same-thread fallback could retain", () => {
    expect(() => handleQuireRemainderPaginationJob(request({
      requestKey: "request:live",
      container: {
        ...container,
        items: [{ ...container.items[0]!, liveProvider: () => undefined }]
      },
      pageGeometry,
      geometryKey: "geometry"
    }))).toThrow("not structured-clone safe");
  });

  it("rejects output from another attachment authority", () => {
    const batch = compileQuireRemainderPaginationBatch({
      requestKey: "request:1",
      container,
      pageGeometry,
      paginationCheckpointStore: createQuirePaginationCheckpointStore()
    });
    expect(() => batch.attachAcceptedOutput({
      requestKey: "request:2",
      geometryKey: batch.payload.geometryKey,
      fragments: []
    })).toThrow("does not match");
  });
});

/** @param payload - Job-owned payload. @returns Versioned test request. */
function request(payload: unknown): QuireLayoutJobRequest {
  return {
    protocolVersion: 1,
    jobId: "job:1",
    supersessionScope: "pagination",
    kind: "remainder-pagination",
    stateVersion: 1,
    layoutEpoch: 1,
    dirtyRange: null,
    window: { kind: "pages", fromIndex: 0, toIndex: 100 },
    cacheHints: {
      retainedBlockKeys: [],
      paginationCheckpointKeys: [],
      tableProductKeys: []
    },
    payload
  };
}
