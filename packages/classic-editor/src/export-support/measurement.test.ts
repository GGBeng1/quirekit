import { describe, expect, it, vi } from "vitest";
import { tryCreateClassicEditorDetachedCanvasTextMeasurer } from "./measurement";

describe("Classic detached export text measurement", () => {
  it("uses font boxes instead of content-dependent ink bounds", () => {
    const measureText = vi.fn(() => ({
      width: 42,
      actualBoundingBoxAscent: 9,
      actualBoundingBoxDescent: 3,
      fontBoundingBoxAscent: 14,
      fontBoundingBoxDescent: 4
    }));
    const context = { font: "", measureText };
    const ownerDocument = createDocumentShape(context);
    const measurer = tryCreateClassicEditorDetachedCanvasTextMeasurer(
      ownerDocument
    );

    expect(measurer?.measureText("Quire", "600 12px Test Sans")).toEqual({
      width: 42,
      ascent: 14,
      descent: 4
    });
    expect(context.font).toBe("600 12px Test Sans");
    expect(measureText).toHaveBeenCalledWith("Quire");
  });

  it("returns undefined without a browser document or Canvas 2D context", () => {
    expect(tryCreateClassicEditorDetachedCanvasTextMeasurer(undefined))
      .toBeUndefined();
    expect(tryCreateClassicEditorDetachedCanvasTextMeasurer(
      createDocumentShape(null)
    )).toBeUndefined();
  });
});

/**
 * Creates a minimal Document whose detached canvas returns one test context.
 *
 * @param context - Context returned by the canvas fixture.
 * @returns Document-compatible detached-canvas fixture.
 */
function createDocumentShape(
  context: { font: string; measureText: (text: string) => object } | null
): Document {
  return {
    createElement() {
      return {
        getContext() {
          return context;
        }
      };
    }
  } as unknown as Document;
}
