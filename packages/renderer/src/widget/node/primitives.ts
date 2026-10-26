import type {
  QuireBoxViewNode,
  QuireBoxViewNodeOptions,
  QuireCustomPaintViewNode,
  QuireCustomPaintViewNodeOptions,
  QuireDividerViewNode,
  QuireDividerViewNodeOptions,
  QuireDomOverlayViewNode,
  QuireDomOverlayViewNodeOptions,
  QuireParagraphPreviewViewNode,
  QuireParagraphPreviewViewNodeOptions,
  QuireSpacerViewNode,
  QuireSpacerViewNodeOptions,
  QuireTextViewNode,
  QuireTextViewNodeOptions
} from "../types";
import { freezeQuireViewNode } from "./freeze";

/**
 * Creates a filled or stroked rectangle widget.
 *
 * @param options - Box options.
 * @returns Immutable box widget node.
 */
export function box(options: QuireBoxViewNodeOptions = {}): QuireBoxViewNode {
  return freezeQuireViewNode({
    ...options,
    kind: "box"
  });
}

/**
 * Creates a single-line text widget.
 *
 * @param options - Text options.
 * @returns Immutable text widget node.
 */
export function text(options: QuireTextViewNodeOptions): QuireTextViewNode {
  return freezeQuireViewNode({
    ...options,
    kind: "text"
  });
}

/**
 * Creates a static paragraph preview widget.
 *
 * @param options - Paragraph preview options.
 * @returns Immutable paragraph preview widget node.
 */
export function paragraphPreview(
  options: QuireParagraphPreviewViewNodeOptions
): QuireParagraphPreviewViewNode {
  return freezeQuireViewNode({
    ...options,
    kind: "paragraph-preview"
  });
}

/**
 * Creates a spacer widget.
 *
 * @param options - Spacer options.
 * @returns Immutable spacer widget node.
 */
export function spacer(options: QuireSpacerViewNodeOptions = {}): QuireSpacerViewNode {
  return freezeQuireViewNode({
    ...options,
    kind: "spacer"
  });
}

/**
 * Creates a divider widget.
 *
 * @param options - Divider options.
 * @returns Immutable divider widget node.
 */
export function divider(options: QuireDividerViewNodeOptions): QuireDividerViewNode {
  return freezeQuireViewNode({
    ...options,
    kind: "divider"
  });
}

/**
 * Creates a custom-paint widget.
 *
 * @param options - Custom paint options.
 * @returns Immutable custom-paint widget node.
 */
export function customPaint(
  options: QuireCustomPaintViewNodeOptions
): QuireCustomPaintViewNode {
  return freezeQuireViewNode({
    ...options,
    kind: "custom-paint"
  });
}

/**
 * Creates a DOM overlay widget.
 *
 * @param options - DOM overlay options.
 * @returns Immutable DOM overlay widget node.
 */
export function domOverlay(
  options: QuireDomOverlayViewNodeOptions
): QuireDomOverlayViewNode {
  return freezeQuireViewNode({
    ...options,
    kind: "dom-overlay"
  });
}
