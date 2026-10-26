import { createEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import { createCanvasMountedView } from "../../canvas/mount";
import { FakeCanvasMountDocument } from "../../../../test-support/mount/canvas";
import { createSvgMountedView } from "../../svg/mount";
import { FakeSvgMountDocument } from "../../../../test-support/mount/svg";

/**
 * The coordinate authority must add each backend's surface client origin exactly
 * once. These tests inject a non-zero (scrolled) surface client rectangle — which
 * the deterministic fake DOM otherwise reports at the origin — and assert that the
 * caret/selection mapping stays the exact inverse of hit testing, and that the
 * caret lands at the surface origin plus the rendered document coordinate (not a
 * doubled or missing origin).
 */

/** A DOMRect-like surface client rectangle injected into a mounted view. */
interface SurfaceClientRectOverride {
  /** Surface left edge in client CSS pixels. */
  readonly left: number;
  /** Surface top edge in client CSS pixels. */
  readonly top: number;
  /** Surface width in CSS pixels. */
  readonly width: number;
  /** Surface height in CSS pixels. */
  readonly height: number;
}

/**
 * Overrides one fake surface element's reported client rectangle.
 *
 * @param surface - Fake surface element whose client rectangle should change.
 * @param rect - Client rectangle to report for subsequent coordinate mapping.
 */
function overrideSurfaceClientRect(surface: unknown, rect: SurfaceClientRectOverride): void {
  (surface as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect = () =>
    ({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({})
    }) as DOMRect;
}

/**
 * Creates a fixed-width text measurer for deterministic mounted geometry.
 *
 * @param width - Width assigned to every grapheme.
 * @returns Text measurer with a fixed grapheme advance.
 */
function createFixedWidthTextMeasurer(width: number): QuireTextMeasurer {
  return {
    /**
     * Measures text with a fixed grapheme width.
     *
     * @param text - Text content to measure.
     * @returns Width-only metric for the text.
     */
    measureText(text) {
      return { width: Array.from(text).length * width };
    }
  };
}

/**
 * Creates a single-paragraph editor for caret round-trip assertions.
 *
 * @param text - Paragraph text content.
 * @returns Editor seeded with the paragraph text.
 */
function createTextEditor(text: string) {
  return createEditor({
    extensions: [StarterKit],
    content: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text }] }]
    }
  });
}

/**
 * Creates a multi-paragraph editor for cross-page round-trip assertions.
 *
 * @param paragraphs - Paragraph text content in document order.
 * @returns Editor seeded with the paragraphs.
 */
function createParagraphEditor(paragraphs: readonly string[]) {
  return createEditor({
    extensions: [StarterKit],
    content: {
      type: "doc",
      content: paragraphs.map((text) => ({
        type: "paragraph",
        content: [{ type: "text", text }]
      }))
    }
  });
}

const surfaceOffset: SurfaceClientRectOverride = {
  left: 213,
  top: 137,
  width: 320,
  height: 180
};
const surfaceOrigin: SurfaceClientRectOverride = {
  left: 0,
  top: 0,
  width: 320,
  height: 180
};

describe("coordinate authority round trip across backends", () => {
  it("round-trips SVG caret geometry through a scrolled surface", () => {
    const ownerDocument = new FakeSvgMountDocument();
    const host = ownerDocument.createElement("section");
    const view = createSvgMountedView({
      editor: createTextEditor("abcdef"),
      id: "svg-round-trip",
      status: "primary",
      element: host as unknown as HTMLElement,
      ownerDocument: ownerDocument as unknown as Document,
      runtime: { width: 320, height: 180, textMeasurer: createFixedWidthTextMeasurer(10) }
    });

    overrideSurfaceClientRect(view.elements.documentSurface, surfaceOffset);

    for (const pos of [1, 3, 5, 7]) {
      const caret = view.coordsAtPos(pos);
      const midpoint = { left: caret.left, top: (caret.top + caret.bottom) / 2 };

      expect(view.posAtCoords(midpoint)?.pos).toBe(pos);
    }
  });

  it("places the SVG caret at the surface origin plus the document coordinate", () => {
    const ownerDocument = new FakeSvgMountDocument();
    const host = ownerDocument.createElement("section");
    const view = createSvgMountedView({
      editor: createTextEditor("abcdef"),
      id: "svg-origin",
      status: "primary",
      element: host as unknown as HTMLElement,
      ownerDocument: ownerDocument as unknown as Document,
      runtime: { width: 320, height: 180, textMeasurer: createFixedWidthTextMeasurer(10) }
    });

    overrideSurfaceClientRect(view.elements.documentSurface, surfaceOrigin);
    const atOrigin = view.coordsAtPos(4);
    overrideSurfaceClientRect(view.elements.documentSurface, surfaceOffset);
    const atOffset = view.coordsAtPos(4);

    // The surface client origin must shift the caret by exactly the offset — the
    // document coordinate (the rendered text origin) is never double-counted.
    expect(atOffset.left - atOrigin.left).toBe(surfaceOffset.left);
    expect(atOffset.top - atOrigin.top).toBe(surfaceOffset.top);
  });

  it("round-trips single-surface canvas caret geometry through a scrolled surface", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const host = ownerDocument.createElement("section");
    const view = createCanvasMountedView({
      editor: createTextEditor("abcdef"),
      id: "canvas-round-trip",
      status: "primary",
      element: host as unknown as HTMLElement,
      ownerDocument: ownerDocument as unknown as Document,
      runtime: { width: 320, height: 180, textMeasurer: createFixedWidthTextMeasurer(10) }
    });

    overrideSurfaceClientRect(view.elements.coordinateSurface, surfaceOffset);

    for (const pos of [1, 3, 5, 7]) {
      const caret = view.coordsAtPos(pos);
      const midpoint = { left: caret.left, top: (caret.top + caret.bottom) / 2 };

      expect(view.posAtCoords(midpoint)?.pos).toBe(pos);
    }
  });

  it("round-trips page-stack canvas caret geometry across a page boundary", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const host = ownerDocument.createElement("section");
    const view = createCanvasMountedView({
      editor: createParagraphEditor(["One", "Two", "Six"]),
      id: "page-stack-round-trip",
      status: "primary",
      element: host as unknown as HTMLElement,
      ownerDocument: ownerDocument as unknown as Document,
      runtime: {
        width: 320,
        height: 260,
        textMeasurer: createFixedWidthTextMeasurer(10),
        pageStack: true,
        pageGeometry: {
          pageRect: { x: 0, y: 0, width: 300, height: 80 },
          bodyRect: { x: 20, y: 30, width: 260, height: 32 }
        }
      }
    });

    overrideSurfaceClientRect(view.elements.coordinateSurface, surfaceOffset);

    // Positions across the document, including content paginated onto later pages.
    for (const pos of [1, 6, 11]) {
      const caret = view.coordsAtPos(pos);
      const midpoint = { left: caret.left, top: (caret.top + caret.bottom) / 2 };

      expect(view.posAtCoords(midpoint)?.pos).toBe(pos);
    }
  });
});
