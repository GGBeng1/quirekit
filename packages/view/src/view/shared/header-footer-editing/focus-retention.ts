/** Inputs used while the header/footer toolbar holds keyboard focus. */
export interface HeaderFooterFocusRetentionOptions {
  /** Document whose focus moves are observed. */
  readonly ownerDocument: Document;
  /** Hidden editor input; focus returning here ends the retention normally. */
  readonly inputProxy: HTMLElement;
  /**
   * Reports whether a focus target belongs to the toolbar.
   *
   * @param node - Candidate focus target.
   * @returns Whether focus there keeps the session.
   */
  readonly owns: (node: Node) => boolean;
  /** Ends the session after focus left both the toolbar and the editor. */
  readonly onLeave: () => void;
}

/**
 * Keeps a header/footer session alive while focus stays inside its toolbar.
 *
 * Focus landing outside the toolbar ends the session like an ordinary blur.
 * A blur with no new target (for example a click on non-focusable UI) is
 * judged on the next frame, after pointer handlers may have refocused the editor.
 *
 * @param options - Focus owners and the leave intent.
 * @returns Idempotent release that stops observing without ending the session.
 */
export function watchHeaderFooterFocusRetention(
  options: HeaderFooterFocusRetentionOptions
): () => void {
  const { ownerDocument, inputProxy, owns } = options;
  const view = ownerDocument.defaultView;
  let frame: number | null = null;
  let released = false;

  const release = (): void => {
    if (released) return;
    released = true;
    if (frame !== null) view?.cancelAnimationFrame(frame);
    ownerDocument.removeEventListener("focusin", handleFocusIn, true);
    ownerDocument.removeEventListener("focusout", handleFocusOut, true);
  };
  /** @param target - New focus target, or null when focus went nowhere. */
  const judge = (target: EventTarget | null): void => {
    if (target === inputProxy) {
      release();
      return;
    }
    if (target !== null && owns(target as Node)) return;
    release();
    options.onLeave();
  };
  /** @param event - Focus arriving anywhere in the document. */
  function handleFocusIn(event: FocusEvent): void {
    judge(event.target);
  }
  /** @param event - Focus leaving a node; only target-less exits need a deferred check. */
  function handleFocusOut(event: FocusEvent): void {
    if (event.relatedTarget !== null || view === null) return;
    if (frame !== null) view.cancelAnimationFrame(frame);
    frame = view.requestAnimationFrame(() => {
      frame = null;
      const active = ownerDocument.activeElement;
      judge(active === ownerDocument.body ? null : active);
    });
  }

  ownerDocument.addEventListener("focusin", handleFocusIn, true);
  ownerDocument.addEventListener("focusout", handleFocusOut, true);
  return release;
}
