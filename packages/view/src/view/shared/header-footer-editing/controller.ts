import type { QuireInteractionSelectionTarget } from "@quirekit/view-engine";
import { createMountedHeaderFooterEditingChrome } from "./chrome";
import { createMountedHeaderFooterSessionToolbar } from "./session-toolbar";
import {
  matchesHeaderFooterSession,
  resolveHeaderFooterTarget
} from "./session-target";
import type {
  CreateMountedHeaderFooterEditingControllerOptions,
  MountedHeaderFooterEditingController,
  MountedHeaderFooterEditingSession
} from "./types";

/**
 * Creates view-local ownership for explicit header/footer editing.
 *
 * @param options - Mounted root, overlay host, and transition observer.
 * @returns Controller that gates pointer selection and input ownership.
 */
export function createMountedHeaderFooterEditingController(
  options: CreateMountedHeaderFooterEditingControllerOptions
): MountedHeaderFooterEditingController {
  let session: MountedHeaderFooterEditingSession | null = null;
  let chromeElement: HTMLElement | null = null;
  let chromeReferenceRect: QuireInteractionSelectionTarget["referenceRect"];
  let destroyed = false;
  const toolbar = createMountedHeaderFooterSessionToolbar(options);

  /** Removes the current transient DOM decoration. */
  const removeChrome = (): void => {
    chromeElement?.remove();
    chromeElement = null;
    delete options.root.dataset.qkHeaderFooterEditing;
  };

  /** Clears active ownership and its additive presentation. */
  const exit = (): boolean => {
    if (session === null) {
      return false;
    }

    session = null;
    chromeReferenceRect = undefined;
    removeChrome();
    toolbar.destroy();
    options.onChange?.(null);
    return true;
  };

  /** Projects the current session against the latest paginated geometry. */
  const mountChrome = (): void => {
    if (session === null) {
      return;
    }

    chromeElement?.remove();
    const sessionToolbar = toolbar.sync(session, {
      onClose: () => {
        if (exit()) {
          options.onChromeExit?.();
        }
      },
      onReturnFocus: () => options.onReturnFocus?.()
    });
    const chrome = createMountedHeaderFooterEditingChrome({
      ownerDocument: options.root.ownerDocument,
      region: session.region,
      referenceRect: chromeReferenceRect,
      pages: options.readPages(),
      regionLabel: sessionToolbar.regionLabel,
      actions: sessionToolbar.host
    });
    chromeElement = chrome.element;
    options.overlayHost.appendChild(chrome.element);
  };

  /**
   * Publishes one session and projects its current visual instance.
   *
   * @param nextSession - Session to make active.
   * @param target - Retained hit carrying the visual reference rectangle.
   */
  const enter = (
    nextSession: MountedHeaderFooterEditingSession,
    target: QuireInteractionSelectionTarget
  ): void => {
    removeChrome();
    session = nextSession;
    chromeReferenceRect = target.referenceRect;
    options.root.dataset.qkHeaderFooterEditing = nextSession.region;
    mountChrome();
    options.onChange?.(nextSession);
  };

  return {
    getSession: () => session,
    preparePointerSelection(target, clickCount): boolean {
      if (destroyed) {
        return false;
      }

      const descriptor = resolveHeaderFooterTarget(target);

      // Entering and leaving an auxiliary story are both explicit transitions.
      // While a session is active, a body single-click must not leak selection
      // or input ownership across the story boundary.
      if (descriptor === null) {
        if (session === null) {
          return true;
        }

        if (target?.region?.kind !== "body" || clickCount < 2) {
          return false;
        }

        exit();
        return true;
      }

      if (matchesHeaderFooterSession(session, descriptor)) {
        if (session?.visualInstanceId !== descriptor.visualInstanceId) {
          enter(descriptor, target as QuireInteractionSelectionTarget);
        }
        return true;
      }

      exit();
      if (clickCount < 2) {
        return false;
      }

      enter(descriptor, target as QuireInteractionSelectionTarget);
      return true;
    },
    matchesTarget(target): boolean {
      return matchesHeaderFooterSession(session, resolveHeaderFooterTarget(target));
    },
    refreshChrome(): boolean {
      if (session === null) {
        return false;
      }

      mountChrome();
      return true;
    },
    ownsFocusTarget: (node) => session !== null && toolbar.owns(node),
    handleEscape: exit,
    exit,
    destroy(): void {
      if (destroyed) {
        return;
      }

      destroyed = true;
      exit();
      removeChrome();
    }
  };
}
