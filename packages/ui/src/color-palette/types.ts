import type { Messages as QuireColorPickerMessages } from "../locale/components/color-picker";

/** RGB color channels in the browser integer value space. */
export interface RgbColor {
  /** Blue channel from 0 through 255. */
  readonly blue: number;
  /** Green channel from 0 through 255. */
  readonly green: number;
  /** Red channel from 0 through 255. */
  readonly red: number;
}

/** HSV color channels used by custom color surfaces. */
export interface HsvColor {
  /** Hue angle from 0 through 360 degrees. */
  readonly hue: number;
  /** Saturation percentage from 0 through 100. */
  readonly saturation: number;
  /** Value percentage from 0 through 100. */
  readonly value: number;
}

/** Visible and accessible copy rendered by one document color palette. */
export interface QuireColorPaletteLabels {
  /** Accessible name for the complete palette. */
  readonly label: string;
  /** Visible label for the reset/default action. */
  readonly defaultColor: string;
  /** Visible label for the optional custom-color action. */
  readonly moreColors: string;
  /** Visible heading for colors selected during the mounted lifetime. */
  readonly recentColors: string;
}

/** Controlled document-color state rendered by a shared palette. */
export interface QuireColorPaletteState {
  /** Current canonical color, or null when the consumer owns no paint. */
  readonly value: string | null;
  /** Color shown by reset, or null for an explicit transparent/no-paint state. */
  readonly defaultColor: string | null;
  /** Copy naming this palette's purpose; missing fields come from `messages`. */
  readonly labels?: Partial<QuireColorPaletteLabels> | undefined;
  /** ColorPicker text of the active language; defaults to Chinese. */
  readonly messages?: QuireColorPickerMessages | undefined;
  /** Recently authored colors in display order. */
  readonly recentColors: readonly string[];
}

/** Inputs for one framework-neutral document color palette. */
export interface CreateQuireColorPaletteOptions
  extends QuireColorPaletteState {
  /** Document that owns the mounted primitive. */
  readonly ownerDocument: Document;
  /**
   * Applies one preset or recent color.
   *
   * @param color - Canonical six-digit hexadecimal color.
   */
  readonly onSelect: (color: string) => void;
  /** Applies consumer-defined reset or no-paint semantics. */
  readonly onReset: () => void;
  /** Opens the consumer-owned custom-color surface when provided. */
  readonly onMoreColors?: (() => void) | undefined;
}

/** Controlled lifecycle returned by the shared document color palette. */
export interface QuireColorPaletteController {
  /** Mounted palette root. */
  readonly element: HTMLElement;
  /**
   * Reprojects current values and localized copy.
   *
   * @param state - Complete next controlled presentation state.
   */
  update(state: QuireColorPaletteState): void;
  /** Removes the palette and releases its event-owned descendants. */
  destroy(): void;
}

/** Controlled state rendered by one shared custom-color editing surface. */
export interface QuireCustomColorPanelState {
  /** Current canonical six-digit hexadecimal color. */
  readonly value: string;
  /** Accessible name for the complete editing surface; defaults to the "more colors" text. */
  readonly label?: string | undefined;
  /** ColorPicker text of the active language; defaults to Chinese. */
  readonly messages?: QuireColorPickerMessages | undefined;
}

/** Inputs for one framework-neutral custom-color editing surface. */
export interface CreateQuireCustomColorPanelOptions
  extends QuireCustomColorPanelState {
  /** Document that owns the mounted primitive. */
  readonly ownerDocument: Document;
  /**
   * Applies one custom color while the editing surface remains open.
   *
   * @param color - Canonical six-digit hexadecimal color.
   */
  readonly onChange: (color: string) => void;
}

/** Controlled lifecycle returned by the shared custom-color surface. */
export interface QuireCustomColorPanelController {
  /** Mounted custom-color root. */
  readonly element: HTMLElement;
  /**
   * Reprojects current color and localized accessible copy.
   *
   * @param state - Complete next controlled presentation state.
   */
  update(state: QuireCustomColorPanelState): void;
  /** Removes the editing surface and releases its event-owned descendants. */
  destroy(): void;
}
