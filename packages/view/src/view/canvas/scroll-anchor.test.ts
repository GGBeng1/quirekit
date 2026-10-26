import { createEditor, type QuireEditor } from "@quirekit/core";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { canvasViewExtension } from "./extension";
import type { CanvasMountedViewRenderEvent } from "./types";
import { FakeCanvasMountDocument, FakeCanvasMountElement } from "../../../test-support/mount/canvas";
import { captureMountedViewScrollAnchor } from "../shared/scroll/position-anchor";

/**
 * Mounts a 30-paragraph page-stack editor scrolled by an outer viewport.
 *
 * @returns Editor, viewport and a reader for the line at the visible top.
 */
function mountScrolled() {
  const ownerDocument = new FakeCanvasMountDocument();
  const host = ownerDocument.createElement("section");
  const viewport = ownerDocument.createElement("div");
  viewport.appendChild(host);
  viewport.clientWidth = 300;
  viewport.clientHeight = 80;
  const renders: CanvasMountedViewRenderEvent[] = [];
  const frames: FrameRequestCallback[] = [];
  const editor = createEditor({
    extensions: [StarterKit, canvasViewExtension({ runtime: {
      width: 320, height: 260, textMeasurer: createFixedWidthTextMeasurer(10), pageStack: true,
      scrollSource: "viewport", scrollViewport: viewport as unknown as HTMLElement, scrollBufferPages: 0,
      onRender: event => { renders.push(event); },
      requestUpdateFrame: callback => { frames.push(callback); return frames.length; },
      cancelUpdateFrame: () => undefined,
      pageGeometry: { pageRect: { x: 0, y: 0, width: 300, height: 80 }, bodyRect: { x: 20, y: 10, width: 260, height: 60 } }
    } })],
    content: { type: "doc", content: Array.from({ length: 30 }, (_, index) => paragraphJson(`P${index}`)) }
  }) as QuireEditor;
  editor.mount({ mode: "canvas", element: host as unknown as HTMLElement, ownerDocument: ownerDocument as unknown as Document });
  /** Runs queued fill frames until page-stack fill settles. */
  const flush = () => { for (let count = 0; count < 50 && frames.length > 0; count++) frames.shift()!(0); };
  flush();
  return {
    editor,
    viewport,
    flush,
    /** @param top - Scroll offset to move the viewport to. */
    scrollTo(top: number) {
      viewport.scrollTop = top;
      (viewport as unknown as FakeCanvasMountElement).dispatchEvent({ type: "scroll" } as unknown as Event & { type: string });
    },
    /** @returns Text and offset of the line at the visible top. */
    readTop() {
      const anchor = captureMountedViewScrollAnchor(renders.at(-1)!.renderResult, { x: 0, y: viewport.scrollTop, width: 300, height: 80 });
      return anchor === null ? null : { text: anchor.doc.resolve(anchor.pos).parent.textContent, offset: anchor.top - viewport.scrollTop };
    }
  };
}

/**
 * @param text - Paragraph text.
 * @returns Paragraph JSON.
 */
function paragraphJson(text: string) {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

/**
 * Inserts a paragraph at a document position as a direct transaction.
 * @param editor - Mounted editor.
 * @param pos - Insert position.
 */
function insertParagraph(editor: QuireEditor, pos: number): void {
  const schema = editor.state.pm.schema;
  editor.view.dispatch(editor.state.pm.tr.insert(pos, schema.nodes.paragraph!.create(null, schema.text("New"))));
}

describe("canvas page-stack scroll anchoring", () => {
  it("keeps the line at the visible top in place when content is inserted above it", () => {
    const { editor, scrollTo, flush, viewport, readTop } = mountScrolled();
    scrollTo(250);
    const before = readTop();

    insertParagraph(editor, 0);
    insertParagraph(editor, 0);
    flush();

    expect(before?.text).toBe("P6");
    expect(viewport.scrollTop).toBeGreaterThan(250);
    expect(readTop()).toEqual(before);
  });

  it("leaves the scroll position alone for changes below the visible top", () => {
    const { editor, scrollTo, flush, viewport } = mountScrolled();
    scrollTo(250);

    insertParagraph(editor, editor.state.doc.content.size);
    flush();

    expect(viewport.scrollTop).toBe(250);
  });

  it("does not anchor while the start of the document is visible", () => {
    const { editor, flush, viewport } = mountScrolled();

    insertParagraph(editor, 0);
    flush();

    expect(viewport.scrollTop).toBe(0);
  });
});

/**
 * @param width - Width of every character.
 * @returns Text measurer with a fixed character width.
 */
function createFixedWidthTextMeasurer(width: number): QuireTextMeasurer {
  return { measureText: text => ({ width: Array.from(text).length * width }) };
}
