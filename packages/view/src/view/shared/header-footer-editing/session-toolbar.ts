import { createHeaderFooterActionGroup } from "./chrome-elements";
import {
  createDefaultHeaderFooterToolbar,
  formatDistance,
  resolveHeaderFooterChromeLocale,
  resolveHeaderFooterChromeMessages,
  stepDistanceTwips,
  twipsToCentimeters
} from "./toolbar";
import type {
  QuireHeaderFooterToolbarController,
  QuireHeaderFooterToolbarState
} from "./toolbar";
import type {
  CreateMountedHeaderFooterEditingControllerOptions,
  MountedHeaderFooterEditingRegion,
  MountedHeaderFooterEditingSession
} from "./types";

/** Session intents the toolbar forwards to the controller. */
export interface MountedHeaderFooterSessionToolbarIntents {
  /** Explicit close. */
  readonly onClose: () => void;
  /** Focus hand-back to the editor input. */
  readonly onReturnFocus: () => void;
}

/** Toolbar and its positioning host retained for one editing session. */
export interface MountedHeaderFooterSessionToolbar {
  /**
   * Creates or updates the toolbar and mounts its host in the overlay.
   *
   * @param session - Active session.
   * @param intents - Close and focus intents.
   * @returns Positioning host and localized region tag text.
   */
  sync(
    session: MountedHeaderFooterEditingSession,
    intents: MountedHeaderFooterSessionToolbarIntents
  ): { readonly host: HTMLElement; readonly regionLabel: string };
  /**
   * Reports whether focus on a node belongs to the toolbar.
   *
   * @param node - Candidate focus target.
   * @returns Whether the node is inside the toolbar or a popup it controls.
   */
  owns(node: Node): boolean;
  /** Releases the toolbar and removes its host. */
  destroy(): void;
}

/**
 * Owns the product or default toolbar across chrome reprojections.
 *
 * Reprojection rebuilds geometry on every committed render. The toolbar and its
 * host stay mounted in place instead, so a focused field inside it never loses
 * focus to a DOM move and product UI keeps its component state.
 *
 * @param options - Controller options providing distance access and renderer lookup.
 * @returns Session toolbar owner.
 */
export function createMountedHeaderFooterSessionToolbar(
  options: CreateMountedHeaderFooterEditingControllerOptions
): MountedHeaderFooterSessionToolbar {
  let toolbar: QuireHeaderFooterToolbarController | null = null;
  let host: HTMLElement | null = null;
  let toolbarRegion: MountedHeaderFooterEditingRegion | null = null;

  /**
   * Projects session facts and section commands into the toolbar contract.
   *
   * @param session - Active session.
   * @param intents - Close and focus intents.
   * @returns Toolbar state.
   */
  const readState = (
    session: MountedHeaderFooterEditingSession,
    intents: MountedHeaderFooterSessionToolbarIntents
  ): QuireHeaderFooterToolbarState => {
    const locale = resolveHeaderFooterChromeLocale(options.overlayHost);
    const messages = resolveHeaderFooterChromeMessages(locale, session.region);
    const twips = options.onDistanceChange === undefined
      ? null
      : options.readDistanceTwips?.(session) ?? null;
    /** @param next - Requested distance. @returns Whether the section changed. */
    const change = (next: number): boolean => Number.isInteger(next) && next >= 0
      && options.onDistanceChange?.(session, next) === true;
    return {
      region: session.region,
      locale,
      messages,
      sourceId: session.sourceId,
      sectionPosition: session.commandOwner?.position ?? null,
      distanceTwips: twips,
      distanceCentimeters: twips === null ? null : twipsToCentimeters(twips),
      distanceText: twips === null ? null : formatDistance(twips, messages.unit),
      onDistanceChange: change,
      onDistanceStep: (direction) => {
        // Read the committed distance so repeated steps accumulate before the
        // next render reprojects the readout.
        const current = options.readDistanceTwips?.(session) ?? null;
        return current !== null && change(stepDistanceTwips(current, direction));
      },
      onClose: intents.onClose,
      onReturnFocus: intents.onReturnFocus
    };
  };

  const destroy = (): void => {
    toolbar?.destroy();
    host?.remove();
    toolbar = null;
    host = null;
    toolbarRegion = null;
  };

  return {
    sync(session, intents) {
      const state = readState(session, intents);
      if (toolbar === null || host === null || toolbarRegion !== session.region) {
        destroy();
        const renderer = options.readToolbarRenderer?.();
        const ownerDocument = options.root.ownerDocument;
        toolbar = renderer === undefined
          ? createDefaultHeaderFooterToolbar(ownerDocument, state)
          : renderer(ownerDocument, state);
        toolbar.element.dataset.qkHeaderFooterToolbar = session.region;
        host = createHeaderFooterActionGroup(ownerDocument, session.region);
        host.append(toolbar.element);
        toolbarRegion = session.region;
      } else {
        toolbar.update(state);
      }
      if (!host.isConnected) options.overlayHost.appendChild(host);
      return { host, regionLabel: toolbar.readRegionLabel?.() ?? state.messages.regionLabel };
    },
    owns(node) {
      if (host === null || toolbar === null) return false;
      if (host.contains(node) || toolbar.owns?.(node) === true) return true;
      const ownerDocument = host.ownerDocument;
      // Portalled popups (selects, menus) are linked to their trigger by aria-controls.
      return [...host.querySelectorAll("[aria-controls]")].some((trigger) => {
        const popup = ownerDocument.getElementById(trigger.getAttribute("aria-controls") ?? "");
        return popup?.contains(node) === true;
      });
    },
    destroy
  };
}
