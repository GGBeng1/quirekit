import type { QuirePresentationOverlay } from "@quirekit/view-engine";

/** Overlay channel of one mounted view. */
interface MountedPresentationTarget {
  /** Current overlay, or undefined when none is presented. */
  overlay: QuirePresentationOverlay | undefined;
  /** Schedules a render that picks up the current overlay. */
  readonly requestRender: () => void;
}

const targets = new WeakMap<object, MountedPresentationTarget>();

/**
 * Declares that a mounted view renders presentation overlays.
 *
 * Overlay geometry belongs to the presented document, so pointer selection is
 * suspended while an overlay is shown: a capture listener on the view root stops
 * every pointer press before the selection session sees it. Controls placed in
 * the view (such as review actions) still receive `click`, which the session's
 * pointer capture would otherwise retarget.
 *
 * @param view - Mounted view, also the `decorationSourceView` of its frames.
 * @param root - View root element.
 * @param requestRender - Schedules a render after the overlay changes.
 */
export function registerMountedPresentationTarget(view: object, root: HTMLElement, requestRender: () => void): void {
  const target: MountedPresentationTarget = { overlay: undefined, requestRender };
  targets.set(view, target);
  root.addEventListener("pointerdown", event => {
    if (target.overlay !== undefined) event.stopImmediatePropagation();
  }, true);
}

/**
 * Replaces the overlay of a mounted view and schedules its render.
 *
 * @param view - Mounted view.
 * @param overlay - Overlay planned against the current document, or null to clear it.
 * @returns Whether the view renders presentation overlays.
 */
export function presentMountedOverlay(view: object, overlay: QuirePresentationOverlay | null): boolean {
  const target = targets.get(view);
  if (target === undefined) return false;
  target.overlay = overlay ?? undefined;
  target.requestRender();
  return true;
}

/**
 * Reads the overlay presented on the mounted view that sources a frame.
 *
 * @param view - Frame `decorationSourceView`, if any.
 * @returns Current overlay, or undefined.
 */
export function readMountedPresentationOverlay(view: object | undefined): QuirePresentationOverlay | undefined {
  return view === undefined ? undefined : targets.get(view)?.overlay;
}
