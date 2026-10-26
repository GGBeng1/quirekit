import type { QuireEditor } from "@quirekit/core";

/** Product languages supported by header/footer editing chrome copy. */
export type QuireHeaderFooterChromeLocale = "zh-CN" | "en";

/** Header/footer region represented by one editing toolbar. */
export type QuireHeaderFooterToolbarRegion = "header" | "footer";

/** Complete localized copy for header/footer editing chrome. */
export interface QuireHeaderFooterChromeMessages {
  /** Region tag attached to the active boundary. */
  readonly regionLabel: string;
  /** Accessible toolbar name. */
  readonly toolbarLabel: string;
  /** Visible caption before the distance readout. */
  readonly distanceLabel: string;
  /** Accessible name of the decrement step. */
  readonly decreaseDistance: string;
  /** Accessible name of the increment step. */
  readonly increaseDistance: string;
  /** Short visible close text. */
  readonly close: string;
  /** Accessible close name naming the region. */
  readonly closeLabel: string;
  /** Close explanation including the keyboard shortcut. */
  readonly closeTooltip: string;
  /** Unit suffix used by the distance readout. */
  readonly unit: string;
}

/** Facts and intents View supplies to a header/footer editing toolbar. */
export interface QuireHeaderFooterToolbarState {
  /** Active editing region. */
  readonly region: QuireHeaderFooterToolbarRegion;
  /** Mounted product language. */
  readonly locale: QuireHeaderFooterChromeLocale;
  /** Localized copy matching `locale` and `region`. */
  readonly messages: QuireHeaderFooterChromeMessages;
  /** Layout source id of the edited story: the document profile's story namespace, a colon, and the story id. */
  readonly sourceId: string;
  /** Position before the structural owner of this page's region, when retained. */
  readonly sectionPosition: number | null;
  /** Section-owned edge distance in twips, or null when not commandable. */
  readonly distanceTwips: number | null;
  /** Section-owned edge distance in centimeters, or null when not commandable. */
  readonly distanceCentimeters: number | null;
  /** Formatted distance readout including its unit, or null when unavailable. */
  readonly distanceText: string | null;
  /**
   * Applies an exact edge distance through the section command.
   *
   * @param distanceTwips - Non-negative integer distance in twips.
   * @returns Whether the document changed.
   */
  readonly onDistanceChange: (distanceTwips: number) => boolean;
  /**
   * Applies one product step to the edge distance through the section command.
   *
   * @param direction - Decrease (-1) or increase (1).
   * @returns Whether the document changed.
   */
  readonly onDistanceStep: (direction: -1 | 1) => boolean;
  /** Closes the active editing session. */
  readonly onClose: () => void;
  /** Returns keyboard focus to the editor after the toolbar finished taking input. */
  readonly onReturnFocus: () => void;
}

/** Product-owned toolbar retained for one header/footer editing session. */
export interface QuireHeaderFooterToolbarController {
  /** Complete toolbar surface; View supplies only its positioning host. */
  readonly element: HTMLElement;
  /** @param state - Latest session facts and intents. */
  update(state: QuireHeaderFooterToolbarState): void;
  /**
   * Product text for the region tag, such as a variant and section name.
   *
   * @returns Tag text, or undefined for the generic region name.
   */
  readRegionLabel?(): string | undefined;
  /**
   * Claims focus targets outside `element`, such as portalled popups without an `aria-controls` link.
   *
   * @param node - Candidate focus target.
   * @returns Whether focus there keeps the editing session.
   */
  owns?(node: Node): boolean;
  /** Releases the product UI and any portalled surfaces. */
  destroy(): void;
}

/**
 * Mounts a product toolbar without introducing a UI framework into View.
 *
 * Focus may move into the toolbar or popups its controls reference through
 * `aria-controls`; anywhere else ends the editing session.
 *
 * @param ownerDocument - Document owning the editing chrome.
 * @param state - Initial session facts and intents.
 * @returns Toolbar with explicit update and disposal lifetimes.
 */
export type QuireHeaderFooterToolbarRenderer = (
  ownerDocument: Document,
  state: QuireHeaderFooterToolbarState
) => QuireHeaderFooterToolbarController;

/** Editor-local renderer registrations; the most recent owner wins. */
export type QuireHeaderFooterToolbarRegistry = WeakMap<
  QuireEditor,
  QuireHeaderFooterToolbarRenderer[]
>;
