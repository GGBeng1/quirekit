import { createEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { FakeSvgMountDocument } from "@quirekit/view/test-support/svg-mount";
import { describe, expect, it } from "vitest";
import { createHtmlMountedView } from "../mount";

/**
 * The HTML surface client origin must be added exactly once: caret mapping stays
 * the inverse of hit testing on a scrolled surface.
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
describe("HTML coordinate authority round trip", () => {
  it("round-trips HTML caret geometry through a scrolled surface", () => {
    const ownerDocument = new FakeSvgMountDocument();
    const host = ownerDocument.createElement("section");
    const view = createHtmlMountedView({
      editor: createTextEditor("abcdef"),
      id: "html-round-trip",
      status: "primary",
      element: host as unknown as HTMLElement,
      ownerDocument: ownerDocument as unknown as Document,
      runtime: { width: 320, height: 180 }
    });

    overrideSurfaceClientRect(view.elements.contentSurface, surfaceOffset);

    for (const pos of [1, 3, 5, 7]) {
      const caret = view.coordsAtPos(pos);
      const midpoint = { left: caret.left, top: (caret.top + caret.bottom) / 2 };

      expect(view.posAtCoords(midpoint)?.pos).toBe(pos);
    }
  });

  it("places the HTML caret at the surface origin plus the document coordinate", () => {
    const ownerDocument = new FakeSvgMountDocument();
    const host = ownerDocument.createElement("section");
    const view = createHtmlMountedView({
      editor: createTextEditor("abcdef"),
      id: "html-origin",
      status: "primary",
      element: host as unknown as HTMLElement,
      ownerDocument: ownerDocument as unknown as Document,
      runtime: { width: 320, height: 180 }
    });

    overrideSurfaceClientRect(view.elements.contentSurface, surfaceOrigin);
    const atOrigin = view.coordsAtPos(4);
    overrideSurfaceClientRect(view.elements.contentSurface, surfaceOffset);
    const atOffset = view.coordsAtPos(4);

    expect(atOffset.left - atOrigin.left).toBe(surfaceOffset.left);
    expect(atOffset.top - atOrigin.top).toBe(surfaceOffset.top);
  });
});
