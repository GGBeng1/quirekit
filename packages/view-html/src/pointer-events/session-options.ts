import {
  bindMountedPointerSession,
  type BindMountedPointerSessionOptions
} from "@quirekit/view/mounted-backend";
import { measureHtmlMountedPointerHit } from "./hit";
import type { BindHtmlMountedPointerEventsOptions } from "./types";

/**
 * Adapts retained DOM measurement and surfaces to the shared pointer session.
 *
 * @param options - Mounted HTML pointer capabilities.
 * @returns Renderer-neutral pointer session options.
 */
export function createHtmlMountedPointerSessionOptions(
  options: BindHtmlMountedPointerEventsOptions
): BindMountedPointerSessionOptions {
  return {
    mountedView: options.mountedView,
    root: options.elements.root,
    coordinateSurface: options.elements.contentSurface,
    cursorSurface: options.elements.root,
    eventTargets: [options.elements.contentSurface],
    leaveTarget: options.elements.contentSurface,
    widgetEvents: options.widgetEvents,
    getRenderState: options.getRenderState,
    getInputBinding: options.getInputBinding,
    getInteractionTarget: options.getInteractionTarget ?? (() => null),
    focus: options.focus,
    renderSelection: options.renderSelection,
    setInteractionTarget: options.setInteractionTarget,
    setSelectionGeometryContext: options.setSelectionGeometryContext,
    prepareHeaderFooterPointerSelection:
      options.prepareHeaderFooterPointerSelection,
    hitTestPointer: (selectionOptions) =>
      measureHtmlMountedPointerHit(
        options.measurementProvider,
        selectionOptions
      ),
    onPointerHitTest: options.onPointerHitTest,
    stopEvent: options.stopEvent,
    clearCursorOnLeave: true
  };
}

/**
 * Binds HTML through the canonical mounted pointer session.
 *
 * @param options - Mounted HTML pointer capabilities.
 * @returns Cleanup for the shared pointer session.
 */
export function bindHtmlMountedPointerSession(
  options: BindHtmlMountedPointerEventsOptions
): () => void {
  return bindMountedPointerSession(createHtmlMountedPointerSessionOptions(options));
}
