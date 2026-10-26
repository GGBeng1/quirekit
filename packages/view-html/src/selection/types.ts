import type { HtmlMeasuredClientRect, HtmlMeasuredDomPoint } from "../measurement";
import type { HtmlFocusOwner } from "../focus";

/** Native browser selection endpoints retained for accessibility and platform APIs. */
export interface HtmlNativeSelectionEndpoints {
  /** Model anchor projected to an owned retained DOM point. */
  readonly anchor: Pick<HtmlMeasuredDomPoint, "node" | "offset">;
  /** Model head projected to an owned retained DOM point. */
  readonly head: Pick<HtmlMeasuredDomPoint, "node" | "offset">;
}

/** Options used to create the native selection mirror. */
export interface CreateHtmlNativeSelectionMirrorOptions {
  /** Browser document whose single native Selection is mirrored. */
  readonly ownerDocument: Document;
  /** Retained document root that owns accepted mirror endpoints. */
  readonly documentRoot: HTMLElement;
}

/** Non-authoritative native browser selection mirror. */
export interface HtmlNativeSelectionMirror {
  /**
   * Mirrors exact model anchor/head direction into browser Selection.
   *
   * @param endpoints - Owned retained DOM endpoints.
   */
  sync(endpoints: HtmlNativeSelectionEndpoints): void;
  /** Suspends mirror writes while another focus owner uses native Selection. */
  suspend(): void;
  /** Releases mirror state owned by this retained document. */
  destroy(): void;
}

/** Inputs used to synchronize custom retained HTML selection presentation. */
export interface HtmlSelectionRuntimeSyncOptions {
  /** Current focus owner controlling caret and native mirror ownership. */
  readonly focusOwner: HtmlFocusOwner;
  /** Whether the document accepts editing input. */
  readonly editable: boolean;
  /** Content surface rectangle in viewport CSS pixels. */
  readonly surfaceClientRect: Pick<DOMRect, "left" | "top">;
  /** Collapsed caret rectangle in viewport CSS pixels. */
  readonly caret?: HtmlMeasuredClientRect | undefined;
  /** Browser range or node-selection rectangles in viewport CSS pixels. */
  readonly selectionRects: readonly HtmlMeasuredClientRect[];
  /** Optional native mirror endpoints for the current model selection. */
  readonly mirror?: HtmlNativeSelectionEndpoints | undefined;
  /** Themed selection fill retained across document, control, and outside focus. */
  readonly selectionFillStyle: string;
  /** Default caret fill; the head DOM scope may override it with --qk-html-caret-color. */
  readonly caretFillStyle: string;
}

/** Options used to create custom retained HTML selection presentation. */
export interface CreateHtmlSelectionRuntimeOptions {
  /** Browser document used to create pooled presentation elements. */
  readonly ownerDocument: Document;
  /** Overlay host receiving the owned SVG selection surface and shared DOM caret. */
  readonly host: HTMLElement;
  /** Retained document root accepted by the native mirror. */
  readonly documentRoot: HTMLElement;
}

/** Custom selection, caret, and native mirror runtime. */
export interface HtmlSelectionRuntime {
  /**
   * Synchronizes one measured selection presentation.
   *
   * @param options - Measured geometry, focus ownership, and visual styles.
   */
  sync(options: HtmlSelectionRuntimeSyncOptions): void;
  /** Removes pooled presentation and native mirror ownership. */
  destroy(): void;
}

/** Retained SVG rectangle pool for DOM-measured HTML selections. */
export interface HtmlSelectionRectPool {
  /**
   * Synchronizes pooled rectangles from one geometry batch.
   *
   * @param rects - Client-space selection rectangles.
   * @param surfaceClientRect - Content surface origin in client coordinates.
   * @param fillStyle - CSS fill applied to visible rectangles.
   */
  sync(
    rects: readonly HtmlMeasuredClientRect[],
    surfaceClientRect: Pick<DOMRect, "left" | "top">,
    fillStyle: string
  ): void;
  /** Removes every pooled rectangle from its host. */
  destroy(): void;
}
