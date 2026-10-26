import type { ReadingHeadingAnchor, ReadingOutlineController, ReadingOutlineOptions } from "./types";

const readingOffset = 48;

/**
 * Tracks reading position without subscribing to canonical selection transactions.
 * @param options - Visible outline and its mounted HTML editor.
 * @returns Subscriptions and explicit heading navigation, owned by the product lifecycle.
 */
export function createReadingOutline(options: ReadingOutlineOptions): ReadingOutlineController {
  const { editor, viewport, headings, activate } = options;
  const view = editor.mountedView!;
  const window = viewport.ownerDocument.defaultView!;
  let committedDoc = editor.state.doc;
  let anchors: ReadingHeadingAnchor[] = [];
  let dirty = true;
  let frame = 0;
  let destroyed = false;
  let current: number | undefined;
  let navigation: { pos: number; doc: typeof committedDoc } | undefined;

  /** Coalesces scroll and layout invalidation into one measurement per frame. */
  function schedule(): void {
    if (!destroyed && !frame) frame = window.requestAnimationFrame(measure);
  }
  /** Invalidates only the visible heading index, never the canonical document. */
  function refresh(): void { dirty = true; schedule(); }

  /** Resolves the last visible heading above the reading line in logarithmic work. */
  function measure(): void {
    frame = 0;
    if (destroyed || committedDoc !== editor.state.doc) return;
    // Semantic positions become DOM anchors only after the mounted View commits.
    // Hidden headings are excluded so folded content cannot steal reading focus.
    if (dirty) {
      anchors = [];
      for (const heading of headings()) {
        const element = view.nodeDOM?.(heading.pos);
        if (element instanceof Element && element.getClientRects().length) anchors.push({ pos: heading.pos, element });
      }
      dirty = false;
    }
    const bounds = viewport.getBoundingClientRect();
    const top = bounds.top + viewport.clientTop;
    if (navigation) {
      const target = navigation.doc === committedDoc ? view.nodeDOM?.(navigation.pos) : null;
      navigation = undefined;
      if (target instanceof Element && target.getClientRects().length) {
        viewport.scrollTop += target.getBoundingClientRect().top - top - readingOffset;
      }
    }
    // Read client coordinates after navigation: scrolling is the sole authority,
    // including clamping near the document end and user scrolling in either direction.
    const atEnd = viewport.scrollTop > 0 && viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 8;
    const line = atEnd ? top + viewport.clientHeight - 1 : top + readingOffset;
    let low = 0, high = anchors.length - 1, active = anchors[0]?.pos;
    while (low <= high) {
      const middle = (low + high) >>> 1;
      const anchor = anchors[middle]!;
      if (anchor.element.getBoundingClientRect().top <= line + 0.5) { active = anchor.pos; low = middle + 1; }
      else high = middle - 1;
    }
    if (active !== current) { current = active; activate(active); }
  }

  /** Ignores selection-only frames; document commits and explicit navigation need fresh anchors. */
  function geometryCommitted(): void {
    if (committedDoc !== editor.state.doc || navigation) {
      committedDoc = editor.state.doc;
      refresh();
    }
  }
  /** @param pos - Semantic heading selected from the outline. */
  function navigate(pos: number): void {
    navigation = { pos, doc: editor.state.doc };
    // Canonical selection opens folded ancestors. The product owns reveal alignment,
    // so the focus command must not compete with it through minimal caret scrolling.
    editor.chain().setTextSelection(pos + 1).focus(null, { scrollIntoView: false }).run();
    refresh();
  }

  const resize = new ResizeObserver(refresh);
  resize.observe(viewport);
  resize.observe(view.dom);
  const releaseGeometry = view.onGeometryUpdate?.(geometryCommitted);
  viewport.addEventListener("scroll", schedule, { passive: true });
  schedule();
  return {
    refresh, navigate,
    /** Releases every geometry dependency when the outline no longer consumes it. */
    destroy() {
      destroyed = true;
      if (frame) window.cancelAnimationFrame(frame);
      resize.disconnect(); releaseGeometry?.();
      viewport.removeEventListener("scroll", schedule);
      anchors = []; navigation = undefined;
    }
  };
}
