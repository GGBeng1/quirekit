import type { QuireDisplayList } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import type { QuireView } from "../facade";
import type {
  QuireViewBuildOptions,
  QuireViewRenderResult
} from "../types";
import type { SvgMountedView } from "./types";
import { runSvgMountedRenderPass } from "./render-pass";

describe("SVG mounted render pass options", () => {
  it("forwards the configured list-marker collision policy", () => {
    let received: QuireViewBuildOptions | undefined;
    const displayList = {
      bounds: { x: 0, y: 0, width: 100, height: 80 },
      commands: []
    } as unknown as QuireDisplayList;
    const result = {
      displayList,
      contentDisplayList: displayList,
      overlayDisplayList: displayList
    } as unknown as QuireViewRenderResult;
    const view = {
      /**
       * Captures the renderer-neutral build options supplied by the SVG pass.
       *
       * @param options - Build options assembled from mounted SVG runtime input.
       * @returns Minimal retained render result used by this option-flow test.
       */
      buildRenderResult(options: QuireViewBuildOptions): QuireViewRenderResult {
        received = options;
        return result;
      }
    } as unknown as QuireView;

    runSvgMountedRenderPass({
      view,
      decorationSourceView: {} as SvgMountedView,
      surfaceState: {
        displaySize: { width: 100, height: 80 },
        viewportRect: { x: 0, y: 0, width: 100, height: 80 },
        surfaceBounds: { x: 0, y: 0, width: 100, height: 80 }
      },
      runtime: {
        listMarkerCollision: "word-compatible",
        hiddenTextViewMode: "formatting-inspection"
      }
    });

    expect(received?.listMarkerCollision).toBe("word-compatible");
    expect(received?.hiddenTextViewMode).toBe("formatting-inspection");
  });
});
