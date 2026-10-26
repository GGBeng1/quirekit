import { emptyQuireWidgetInsets } from "./constraints";
import {
  type QuireBoxViewNode,
  type QuireBoxViewNodeOptions,
  type QuireClipViewNode,
  type QuireClipViewNodeOptions,
  type QuireCustomPaintViewNode,
  type QuireCustomPaintViewNodeOptions,
  type QuireDividerViewNode,
  type QuireDividerViewNodeOptions,
  type QuireDomOverlayViewNode,
  type QuireDomOverlayViewNodeOptions,
  type QuireFlexViewNode,
  type QuireFlexViewNodeOptions,
  type QuireFlexViewNodeWithDirectionOptions,
  type QuireOverlayViewNode,
  type QuireOverlayViewNodeOptions,
  type QuirePaddingViewNode,
  type QuirePaddingViewNodeOptions,
  type QuireParagraphPreviewViewNode,
  type QuireParagraphPreviewViewNodeOptions,
  type QuirePositionedViewNode,
  type QuirePositionedViewNodeOptions,
  type QuireSpacerViewNode,
  type QuireSpacerViewNodeOptions,
  type QuireSurfaceViewNode,
  type QuireSurfaceViewNodeOptions,
  type QuireTextViewNode,
  type QuireTextViewNodeOptions
} from "./types";
import {
  box,
  clip,
  column,
  customPaint,
  divider,
  domOverlay,
  flex,
  overlay,
  padding,
  paragraphPreview,
  positioned,
  row,
  spacer,
  surface,
  text
} from "./node";
import { insets } from "./insets";

/** Typed factory namespace for renderer-neutral retained view authoring. */
export type QuireQkView<TContext = unknown> = {
  /** Creates a filled or stroked rectangle widget. */
  readonly box: (options?: QuireBoxViewNodeOptions<TContext>) => QuireBoxViewNode<TContext>;
  /** Creates a single-line text widget. */
  readonly text: (options: QuireTextViewNodeOptions<TContext>) => QuireTextViewNode<TContext>;
  /** Creates a static paragraph preview widget. */
  readonly paragraphPreview: (
    options: QuireParagraphPreviewViewNodeOptions<TContext>
  ) => QuireParagraphPreviewViewNode<TContext>;
  /** Creates a flex layout widget. */
  readonly flex: (
    options: QuireFlexViewNodeWithDirectionOptions<TContext>
  ) => QuireFlexViewNode<TContext>;
  /** Creates a horizontal flex layout widget. */
  readonly row: (options: QuireFlexViewNodeOptions<TContext>) => QuireFlexViewNode<TContext>;
  /** Creates a vertical flex layout widget. */
  readonly column: (options: QuireFlexViewNodeOptions<TContext>) => QuireFlexViewNode<TContext>;
  /** Creates a semantic surface widget. */
  readonly surface: (
    options?: QuireSurfaceViewNodeOptions<TContext>
  ) => QuireSurfaceViewNode<TContext>;
  /** Creates a layered overlay widget. */
  readonly overlay: (
    options: QuireOverlayViewNodeOptions<TContext>
  ) => QuireOverlayViewNode<TContext>;
  /** Creates an absolute-positioning wrapper widget. */
  readonly positioned: (
    options: QuirePositionedViewNodeOptions<TContext>
  ) => QuirePositionedViewNode<TContext>;
  /** Creates a layout-only padding wrapper. */
  readonly padding: (
    options: QuirePaddingViewNodeOptions<TContext>
  ) => QuirePaddingViewNode<TContext>;
  /** Creates a rectangular clip widget. */
  readonly clip: (options: QuireClipViewNodeOptions<TContext>) => QuireClipViewNode<TContext>;
  /** Creates a spacer widget. */
  readonly spacer: (
    options?: QuireSpacerViewNodeOptions<TContext>
  ) => QuireSpacerViewNode<TContext>;
  /** Creates a divider widget. */
  readonly divider: (
    options: QuireDividerViewNodeOptions<TContext>
  ) => QuireDividerViewNode<TContext>;
  /** Creates a custom paint widget. */
  readonly customPaint: (
    options: QuireCustomPaintViewNodeOptions<TContext>
  ) => QuireCustomPaintViewNode<TContext>;
  /** Creates a DOM overlay widget. */
  readonly domOverlay: (
    options: QuireDomOverlayViewNodeOptions<TContext>
  ) => QuireDomOverlayViewNode<TContext>;
  /** Normalizes inset shorthand. */
  readonly insets: typeof insets;
  /** Reusable empty inset object. */
  readonly emptyInsets: typeof emptyQuireWidgetInsets;
};

/** Factory namespace for renderer-neutral retained view authoring. */
export const qkView = Object.freeze({
  box,
  clip,
  column,
  customPaint,
  divider,
  domOverlay,
  emptyInsets: emptyQuireWidgetInsets,
  flex,
  insets,
  overlay,
  padding,
  paragraphPreview,
  positioned,
  row,
  spacer,
  surface,
  text
});

/**
 * Creates a typed qkView factory namespace.
 *
 * @returns qkView factories typed with the requested runtime context.
 */
export function createQkView<TContext = unknown>(): QuireQkView<TContext> {
  return qkView as QuireQkView<TContext>;
}
