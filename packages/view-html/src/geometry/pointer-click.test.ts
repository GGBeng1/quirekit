import { createEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { FakeSvgMountDocument } from "@quirekit/view/test-support/svg-mount";
import { describe, expect, it } from "vitest";
import { createHtmlMountedView } from "../mount";

/**
 * A bound pointerdown on the HTML surface must resolve the same position the caret
 * geometry maps to, with a non-zero surface origin injected.
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
 * Dispatches a single primary-button pointerdown on a fake surface element.
 *
 * @param target - Fake surface element bound to the mounted pointer handler.
 * @param clientX - Client X coordinate of the pointer.
 * @param clientY - Client Y coordinate of the pointer.
 * @param timeStamp - Browser event timestamp used by click-count normalization.
 */
function pointerDownAt(
  target: unknown,
  clientX: number,
  clientY: number,
  timeStamp = 1
): void {
  (target as { dispatchEvent: (event: unknown) => boolean }).dispatchEvent({
    type: "pointerdown",
    clientX,
    clientY,
    timeStamp,
    detail: 1,
    pointerId: 1,
    button: 0,
    buttons: 1,
    isPrimary: true,
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    pointerType: "mouse",
    /** Stubs preventDefault for the fake pointer event. */
    preventDefault() {}
  });
}

/**
 * Creates a multi-paragraph editor for click round-trip assertions.
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
  height: 1000
};

/**
 * Reads the current collapsed selection head from a mounted view.
 *
 * @param view - Mounted view whose editor selection should be read.
 * @returns Current selection head position.
 */
function selectionHead(view: { readonly state: { readonly selection: { readonly head: number } } }): number {
  return view.state.selection.head;
}

describe("HTML click path resolves the rendered position", () => {
  it("clicks land on the rendered caret position in HTML", () => {
    const ownerDocument = new FakeSvgMountDocument();
    const host = ownerDocument.createElement("section");
    const view = createHtmlMountedView({
      editor: createParagraphEditor(["abcdef", "ghijkl"]),
      id: "html-click",
      status: "primary",
      element: host as unknown as HTMLElement,
      ownerDocument: ownerDocument as unknown as Document,
      runtime: {
        width: 320,
        height: 1000
      }
    });

    overrideSurfaceClientRect(view.elements.contentSurface, surfaceOffset);

    for (const pos of [3, 11]) {
      const caret = view.coordsAtPos(pos);
      pointerDownAt(view.elements.contentSurface, caret.left, (caret.top + caret.bottom) / 2);

      expect(selectionHead(view)).toBe(pos);
    }
  });
});
