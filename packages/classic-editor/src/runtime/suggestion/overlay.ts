import type { SuggestionOverlayPort } from "@quirekit/editor-ui";
import {
  classicEditorOverlayOwnerAttribute,
  releaseIdleClassicEditorOverlayState,
  resolveClassicEditorOverlayState,
  type ClassicEditorOverlayDocumentState
} from "../../shell/overlays/document-state";

/** DOM attribute joining a suggestion trigger/surface to canonical overlay ownership. */
export const classicEditorSuggestionOverlayOwnerAttribute =
  classicEditorOverlayOwnerAttribute;

/** Canonical Classic adapter implementing the headless suggestion overlay seam. */
export interface ClassicEditorSuggestionOverlayPort extends SuggestionOverlayPort {
  /** @returns Active overlay identity used by trigger and teleported surface DOM. */
  readonly activeId: string | null;
}

/** Active controlled registration retained without creating another stack. */
interface ActiveSuggestionOverlay {
  /** Stable overlay/session id. */
  readonly id: string;
  /** Canonical document state already owning capture listeners. */
  readonly state: ClassicEditorOverlayDocumentState;
  /** Feature-owned focus return callback. */
  readonly restoreFocus: () => void;
}

/**
 * Adapts SuggestionController to the committed document/root-local overlay stack.
 *
 * @param ownerDocument - Document already hosting Classic overlay coordination.
 * @returns Command-neutral controlled overlay port.
 */
export function createClassicEditorSuggestionOverlayPort(
  ownerDocument: Document
): ClassicEditorSuggestionOverlayPort {
  let active: ActiveSuggestionOverlay | undefined;

  /** Releases one registration and optionally returns focus. */
  function release(restoreFocus: boolean): void {
    const current = active;
    if (current === undefined) return;
    active = undefined;
    current.state.coordinator.release(current.id);
    releaseIdleClassicEditorOverlayState(current.state);
    if (restoreFocus) current.restoreFocus();
  }

  return Object.freeze({
    get activeId(): string | null {
      return active?.id ?? null;
    },
    open(input: Parameters<SuggestionOverlayPort["open"]>[0]): void {
      release(false);
      const state = resolveClassicEditorOverlayState(ownerDocument);
      active = { id: input.id, state, restoreFocus: input.restoreFocus };
      state.coordinator.activate({
        id: input.id,
        root: input.root,
        close: () => {
          if (active?.id !== input.id) return;
          active = undefined;
          releaseIdleClassicEditorOverlayState(state);
          input.dismiss();
        },
        restoreFocus: input.restoreFocus,
        dismissOnEscape: () => true,
        dismissOnOutsidePointer: () => true
      });
    },
    release
  });
}
