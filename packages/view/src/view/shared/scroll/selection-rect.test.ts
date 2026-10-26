import type { QuireSelectionGeometry } from "@quirekit/view-engine";
import type { QuireViewRenderResult } from "../../types";
import { describe, expect, it } from "vitest";
import { resolveMountedRetainedSelectionScrollRect } from "./selection-rect";

describe("retained mounted selection scroll rectangles", () => {
  it("projects retained caret geometry into client scroll coordinates", () => {
    const result = resolveMountedRetainedSelectionScrollRect({
      renderResult: createRenderResult({
        selection: { empty: true, from: 4, to: 4, head: 4 },
        selectionGeometry: {
          carets: [
            {
              position: { pos: 4, bias: 0 },
              rect: { x: 20, y: 30, width: 5, height: 10 }
            }
          ],
          ranges: []
        }
      }),
      surfaceClientRect: { left: 100, top: 50, width: 200, height: 100 },
      surfaceBounds: { x: 10, y: 20, width: 100, height: 50 }
    });

    expect(result).toEqual({
      left: 120,
      right: 130,
      top: 70,
      bottom: 90
    });
  });

  it("uses the retained range nearest to the selection head", () => {
    const result = resolveMountedRetainedSelectionScrollRect({
      renderResult: createRenderResult({
        selection: { empty: false, from: 2, to: 12, head: 12 },
        selectionGeometry: {
          carets: [],
          ranges: [
            {
              range: { from: 2, to: 5 },
              rect: { x: 10, y: 10, width: 30, height: 10 }
            },
            {
              range: { from: 8, to: 12 },
              rect: { x: 10, y: 50, width: 40, height: 10 }
            }
          ]
        }
      }),
      surfaceClientRect: { left: 0, top: 0, width: 100, height: 100 }
    });

    expect(result).toEqual({
      left: 10,
      right: 50,
      top: 50,
      bottom: 60
    });
  });

  it("returns null when the retained selection geometry has no visible rectangle", () => {
    expect(
      resolveMountedRetainedSelectionScrollRect({
        renderResult: createRenderResult({
          selection: { empty: true, from: 99, to: 99, head: 99 },
          selectionGeometry: { carets: [], ranges: [] }
        }),
        surfaceClientRect: { left: 0, top: 0, width: 100, height: 100 }
      })
    ).toBeNull();
  });
});

/**
 * Creates a minimal render result carrying only selection geometry inputs.
 *
 * @param options - Selection shape and retained geometry to expose.
 * @returns Render result fixture for scroll-rectangle tests.
 */
function createRenderResult(options: {
  readonly selection: {
    readonly empty: boolean;
    readonly from: number;
    readonly to: number;
    readonly head?: number | undefined;
  };
  readonly selectionGeometry: QuireSelectionGeometry;
}): QuireViewRenderResult {
  return {
    interactionSnapshot: {
      state: {
        pm: {
          selection: options.selection
        }
      }
    },
    selectionGeometry: options.selectionGeometry
  } as unknown as QuireViewRenderResult;
}
