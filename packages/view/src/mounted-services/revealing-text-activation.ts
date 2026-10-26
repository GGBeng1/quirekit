import { isMainTextTarget } from "./text-target";
import type { QuireMountedTextActivationOptions, QuireMountedTextTarget } from "./types";
import type { Node, Selection } from "@quirekit/pm";

/** Geometry revisions waited for a revealed page before the activation is dropped. */
const maximumAttempts = 3;

/** View operations a revealing text activation needs. */
export interface MountedRevealingTextActivationHost {
  /**
   * Activates text whose occurrence is laid out in the current window.
   *
   * @param target - Version-bound text request.
   * @param options - Focus policy.
   * @returns Whether the target was accepted.
   */
  activate(target: QuireMountedTextTarget, options?: QuireMountedTextActivationOptions): boolean;
  /**
   * Scrolls the page holding a position into view.
   *
   * @param position - Document position.
   * @returns Whether a page holds the position.
   */
  reveal(position: number): boolean;
  /**
   * Subscribes to committed geometry revisions.
   *
   * @param listener - Called after each revision.
   * @returns Release function.
   */
  onGeometryUpdate(listener: () => void): () => void;
  /** @returns Current accepted document. */
  readDoc(): Node;
  /** @returns Current accepted selection, used to abandon an obsolete reveal. */
  readSelection(): Selection;
}

/** Text activation that waits for an off-window story occurrence to render. */
export interface MountedRevealingTextActivator {
  /**
   * Activates text now, or reveals its page and activates once it renders.
   *
   * @param target - Version-bound text request.
   * @param options - Focus policy.
   * @returns Whether the target was accepted or is being revealed.
   */
  activate(target: QuireMountedTextTarget, options?: QuireMountedTextActivationOptions): boolean;
  /** Drops a pending activation. */
  cancel(): void;
}

/**
 * Creates the activator that reveals off-window story text before activating it.
 *
 * Interaction geometry covers only the laid-out window, so a footnote or
 * endnote on a distant page has no occurrence to activate yet. Its page is
 * scrolled into view first; each geometry revision then retries until the
 * occurrence exists, the document or selection changes, or the attempts run out.
 *
 * @param host - View operations.
 * @returns Activator holding at most one pending activation.
 */
export function createMountedRevealingTextActivator(host: MountedRevealingTextActivationHost): MountedRevealingTextActivator {
  let release: (() => void) | null = null;
  const cancel = (): void => {
    release?.();
    release = null;
  };
  return {
    activate(target, options) {
      cancel();
      if (host.activate(target, options)) return true;
      if (target.doc !== host.readDoc() || isMainTextTarget(target, target.doc)) return false;
      const selection = host.readSelection();
      let attempts = 0;
      // Revealing a cached page can commit geometry synchronously; listen first.
      release = host.onGeometryUpdate(() => {
        attempts += 1;
        if (host.readDoc() !== target.doc || !selection.eq(host.readSelection())
          || host.activate(target, options) || attempts >= maximumAttempts) cancel();
      });
      const revealed = host.reveal(target.head);
      if (!revealed) cancel();
      return revealed;
    },
    cancel
  };
}
