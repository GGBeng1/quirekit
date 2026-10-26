import type { QuireInteractionSelectionTarget } from "@quirekit/view-engine";
import type { QuireLayoutPage } from "@quirekit/view-engine";
import type { QuireRect } from "@quirekit/renderer";
import type { QuireLayoutCommandOwnerRef } from "@quirekit/layout/identity";
import type { QuireHeaderFooterToolbarRenderer } from "./toolbar/types";

/** Header/footer region kinds that may own an explicit editing session. */
export type MountedHeaderFooterEditingRegion = "header" | "footer";

/** Outcome of gating one pointer gesture through header/footer ownership. */
export type MountedHeaderFooterPointerSelectionPreparation =
  | "allow"
  | "block"
  | "transition";

/** DOM nodes owned by one active header/footer editing chrome instance. */
export interface MountedHeaderFooterEditingChrome {
  /** Root decoration containing inactive-area masks and the active band. */
  readonly element: HTMLElement;
  /** Active band projected from the retained hit rectangle. */
  readonly band: HTMLElement;
}

/** Inputs used to create transient header/footer editing chrome. */
export interface CreateMountedHeaderFooterEditingChromeOptions {
  /** Document used to create transient DOM elements. */
  readonly ownerDocument: Document;
  /** Header or footer mode shown by the chrome. */
  readonly region: MountedHeaderFooterEditingRegion;
  /** Retained document-space rectangle of the active visual instance. */
  readonly referenceRect: QuireRect | undefined;
  /** Current layout pages used to derive page-scoped mode geometry. */
  readonly pages: readonly QuireLayoutPage[];
  /** Localized region tag text. */
  readonly regionLabel: string;
  /** Session-long action host positioned against the active boundary. */
  readonly actions: HTMLElement;
}

/** Page-scoped rectangles used by transient editing chrome. */
export interface MountedHeaderFooterEditingChromeGeometry {
  /** Concrete page containing the active visual instance. */
  readonly pageRect?: QuireRect | undefined;
  /** Measured body area identified by four transient corner marks. */
  readonly bodyRect?: QuireRect | undefined;
  /** Header or footer area that remains visually active. */
  readonly activeRect: QuireRect;
  /** Remaining page area that receives a light inactive wash. */
  readonly inactiveRect?: QuireRect | undefined;
  /** Zero-height body-width boundary on the body's top edge. */
  readonly headerBoundaryRect?: QuireRect | undefined;
  /** Zero-height body-width boundary on the body's bottom edge. */
  readonly footerBoundaryRect?: QuireRect | undefined;
}

/** Transient editing ownership retained by one mounted view. */
export interface MountedHeaderFooterEditingSession {
  /** Stable shared story source receiving commands and input. */
  readonly sourceId: string;
  /** Header or footer band represented by the active session. */
  readonly region: MountedHeaderFooterEditingRegion;
  /** Page-local visual occurrence that currently presents the active band. */
  readonly visualInstanceId: string;
  /** Structural section that should receive contextual header/footer commands. */
  readonly commandOwner?: QuireLayoutCommandOwnerRef | undefined;
}

/** Options used to create one mounted header/footer editing controller. */
export interface CreateMountedHeaderFooterEditingControllerOptions {
  /** Mounted view root decorated with the active editing-mode state. */
  readonly root: HTMLElement;
  /** DOM overlay host receiving transient mode chrome. */
  readonly overlayHost: HTMLElement;
  /**
   * Reads the current paginated geometry used to clip editing chrome.
   *
   * @returns Current layout pages, or an empty collection before layout exists.
   */
  readonly readPages: () => readonly QuireLayoutPage[];
  /**
   * Reads the product toolbar renderer registered for this editor.
   *
   * @returns Product renderer, or undefined for the View default.
   */
  readonly readToolbarRenderer?: (() => QuireHeaderFooterToolbarRenderer | undefined) | undefined;
  /** Returns keyboard focus to the editor input after the toolbar took input. */
  readonly onReturnFocus?: (() => void) | undefined;
  /** Completes input-routing cleanup after chrome requests an explicit exit. */
  readonly onChromeExit?: (() => void) | undefined;
  /**
   * Reads the current section-owned distance for contextual chrome.
   *
   * @param session - Active header/footer editing session.
   * @returns Current distance in twips, or null when unavailable.
   */
  readonly readDistanceTwips?:
    | ((session: MountedHeaderFooterEditingSession) => number | null)
    | undefined;
  /**
   * Applies a contextual distance change through the owning editor command.
   *
   * @param session - Active header/footer editing session.
   * @param distanceTwips - Requested non-negative distance in twips.
   * @returns Whether the editor command changed the document.
   */
  readonly onDistanceChange?:
    | ((session: MountedHeaderFooterEditingSession, distanceTwips: number) => boolean)
    | undefined;
  /**
   * Observes editing-session transitions.
   *
   * @param session - New session, or null after editing exits.
   */
  readonly onChange?:
    | ((session: MountedHeaderFooterEditingSession | null) => void)
    | undefined;
}

/** View-local controller for explicit header/footer editing ownership. */
export interface MountedHeaderFooterEditingController {
  /**
   * Reads the current transient editing session.
   *
   * @returns Active session, or null while body input owns the view.
   */
  getSession(): MountedHeaderFooterEditingSession | null;
  /**
   * Decides whether a pointer target may proceed into selection handling.
   *
   * @param target - Retained target produced by the current hit test.
   * @param clickCount - Normalized consecutive pointer click count.
   * @returns Whether shared pointer selection and focus may continue.
   */
  preparePointerSelection(
    target: QuireInteractionSelectionTarget | null,
    clickCount: number
  ): boolean;
  /**
   * Reports whether a retained target belongs to the active editing session.
   *
   * @param target - Retained target to compare with current ownership.
   * @returns Whether commands may route to the target.
   */
  matchesTarget(target: QuireInteractionSelectionTarget | null): boolean;
  /**
   * Reprojects active chrome from the latest paginated layout snapshot.
   *
   * @returns Whether an active session was reprojected.
   */
  refreshChrome(): boolean;
  /**
   * Reports whether focus on a node keeps the session, because the toolbar owns it.
   *
   * @param node - Candidate focus target.
   * @returns Whether the toolbar owns the node.
   */
  ownsFocusTarget(node: Node): boolean;
  /**
   * Exits header/footer editing in response to Escape.
   *
   * @returns Whether an active session was closed.
   */
  handleEscape(): boolean;
  /**
   * Exits the current editing session.
   *
   * @returns Whether an active session was closed.
   */
  exit(): boolean;
  /** Releases session state and transient chrome once. */
  destroy(): void;
}
