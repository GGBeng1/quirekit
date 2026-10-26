import { createMountedHeaderFooterEditingController } from "../header-footer-editing";
import { readHeaderFooterToolbarRenderer } from "../header-footer-editing/toolbar";
import { watchHeaderFooterFocusRetention } from "../header-footer-editing/focus-retention";
import { createHeaderFooterBodySelectionMemory } from "../header-footer-editing/body-selection";
import {
  readMountedHeaderFooterDistanceTwips,
  setMountedHeaderFooterDistanceTwips
} from "../header-footer-editing/section-command";
import { listMountedStoryInstances } from "../../../mounted-services/story-target";
import type { createMountedInputBinding } from "../input-binding";
import type { CreateMountedViewInteractionLifecycleOptions } from "./types";

/** Mount facts and interaction-state callbacks a header/footer session lifecycle needs. */
export interface MountedHeaderFooterSessionLifecycleOptions extends Pick<
  CreateMountedViewInteractionLifecycleOptions,
  "editor" | "root" | "overlayHost" | "inputProxy" | "getInteractionSnapshot" | "render"
> {
  /** @returns Input binding once created; undefined during setup. */
  readonly readInputBinding: () => ReturnType<typeof createMountedInputBinding> | undefined;
  /** Clears retained story routing and suspends story input. */
  readonly clearRouting: () => void;
  /** Resumes keyboard input after the selection left the story. */
  readonly resumeInput: () => void;
}

/**
 * Creates header/footer editing ownership with its body return and toolbar focus policy.
 *
 * Explicit exits return the selection to the body position held before the session;
 * focus moving into the session toolbar keeps the story active until it leaves.
 *
 * @param options - Mount facts and interaction-state callbacks.
 * @returns Editing controller plus the exits the input binding routes.
 */
export function createMountedHeaderFooterSessionLifecycle(options: MountedHeaderFooterSessionLifecycleOptions) {
  const bodySelection = createHeaderFooterBodySelectionMemory(options.editor);
  let releaseFocusRetention: (() => void) | null = null;
  const stopFocusRetention = (): void => {
    releaseFocusRetention?.();
    releaseFocusRetention = null;
  };
  /** Returns the caret to the body; keyboard input resumes once the selection left the story. */
  const returnToBody = (): void => {
    if (bodySelection.restore()) options.resumeInput();
  };
  /** Ends routing and returns the caret to the body. */
  const leaveStory = (): void => {
    options.clearRouting();
    returnToBody();
  };
  /** Leaves the story and releases editor input focus. */
  const leaveAndBlur = (): void => {
    leaveStory();
    options.readInputBinding()?.resetTransientState();
    options.readInputBinding()?.blur();
    options.render("selection");
  };

  const controller = createMountedHeaderFooterEditingController({
    root: options.root,
    overlayHost: options.overlayHost,
    readPages: () => options.getInteractionSnapshot()?.pages ?? [],
    readToolbarRenderer: () => readHeaderFooterToolbarRenderer(options.editor),
    readDistanceTwips: (session) => readMountedHeaderFooterDistanceTwips(options.editor, session),
    onDistanceChange: (session, distanceTwips) =>
      setMountedHeaderFooterDistanceTwips(options.editor, session, distanceTwips),
    onChange: (session) => {
      if (session === null) stopFocusRetention();
      else bodySelection.remember();
      // Editing ownership changes persistent story presentation, so this must
      // bypass the selection-only retained-content reuse path.
      options.render("mode-change");
    },
    onReturnFocus: () => {
      stopFocusRetention();
      options.readInputBinding()?.focus();
    },
    onChromeExit: leaveAndBlur
  });

  /** Ends story ownership after the editor input lost focus for good. */
  const exitAfterOwnershipLost = (): void => {
    if (!controller.exit()) return;
    leaveStory();
    options.render("selection");
  };

  return {
    controller,
    /**
     * Reports a selection inside a header/footer story that no session owns, as
     * undo can leave it; typing there would edit the story outside its session.
     *
     * @returns Whether keyboard input must stay away from the selection.
     */
    selectionInUnownedStory(): boolean {
      const snapshot = options.getInteractionSnapshot();
      if (controller.getSession() !== null || snapshot === undefined) return false;
      return listMountedStoryInstances(snapshot, options.editor.state.pm.selection.head)
        .some(instance => instance.region.kind === "header" || instance.region.kind === "footer");
    },
    /** @returns Whether Escape ended the session and returned to the body. */
    handleEscape(): boolean {
      if (!controller.handleEscape()) return false;
      leaveStory();
      options.render("selection");
      return true;
    },
    /** @param event - Blur event that removed focus from the editor input. */
    handleOwnershipLost(event: FocusEvent | undefined): void {
      const next = event?.relatedTarget as Node | null | undefined;
      if (next === null || next === undefined || !controller.ownsFocusTarget(next)) {
        exitAfterOwnershipLost();
        return;
      }
      // The session toolbar took focus to accept input; keep the story active.
      stopFocusRetention();
      releaseFocusRetention = watchHeaderFooterFocusRetention({
        ownerDocument: options.inputProxy.ownerDocument,
        inputProxy: options.inputProxy,
        owns: (node) => controller.ownsFocusTarget(node),
        onLeave: () => {
          releaseFocusRetention = null;
          exitAfterOwnershipLost();
        }
      });
    },
    /** @returns Whether an active session was exited and focus left the editor input. */
    exit(): boolean {
      if (!controller.exit()) return false;
      leaveAndBlur();
      return true;
    },
    /** @param placesCaret - Whether the pointer gesture that ended the session placed the body caret itself. */
    settleAfterPointerExit(placesCaret: boolean): void {
      if (placesCaret) bodySelection.forget();
      else returnToBody();
    },
    /** Releases focus retention and the editing controller. */
    destroy(): void {
      stopFocusRetention();
      controller.destroy();
    }
  };
}
