import type { GateClassicEditorFirstPaintOptions } from "./types";

/** Attribute hiding the mounted page area until its first frame uses settled fonts. */
export const classicEditorFontGateAttribute = "data-qk-font-gate";

/** Longest time the page area stays hidden, matching the browser block period for web fonts. */
export const classicEditorFontGateTimeoutMs = 3000;

/**
 * Hides the page area until the first frame is painted with its fonts, or the timeout elapses.
 *
 * Laying out the first frame makes the browser start loading every face it uses, so the gate
 * waits for that frame, then for `FontFaceSet.ready`, then for the relayout the font change triggers.
 *
 * @param options - View root, font set, frame subscription and timeout.
 * @returns Release function that reveals the page area and stops waiting.
 */
export function gateClassicEditorFirstPaint(options: GateClassicEditorFirstPaintOptions): () => void {
  const { element, fonts } = options;
  const view = element.ownerDocument.defaultView;
  if (options.onGeometryUpdate === undefined || view === null) return () => {};
  let released = false;
  let unsubscribe: (() => void) | undefined;
  let frameWaiters: (() => void)[] = [];
  const timer = view.setTimeout(() => reveal(), options.timeoutMs ?? classicEditorFontGateTimeoutMs);
  element.setAttribute(classicEditorFontGateAttribute, "pending");

  /** Removes the gate and every pending wait exactly once. */
  function reveal(): void {
    if (released) return;
    released = true;
    view!.clearTimeout(timer);
    unsubscribe?.();
    frameWaiters = [];
    element.removeAttribute(classicEditorFontGateAttribute);
  }

  /** @returns Promise settled by the next committed frame, or after two animation frames without one. */
  function nextFrame(): Promise<void> {
    return new Promise(resolve => {
      frameWaiters.push(resolve);
      view!.requestAnimationFrame(() => view!.requestAnimationFrame(() => resolve()));
    });
  }

  let firstFrame = true;
  unsubscribe = options.onGeometryUpdate(() => {
    const waiters = frameWaiters;
    frameWaiters = [];
    for (const resolve of waiters) resolve();
    if (!firstFrame) return;
    firstFrame = false;
    // Phase 1: the first frame has measured its text, so every face it needs is now known to the font set.
    if (fonts === undefined || fonts.status !== "loading") {
      reveal();
      return;
    }
    // Phase 2: fonts settle, then the font-change relayout commits before the page area appears.
    void fonts.ready.then(() => released ? undefined : nextFrame()).then(reveal);
  });
  return reveal;
}
