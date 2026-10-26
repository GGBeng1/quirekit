import type {
  QuireClipViewNode,
  QuireClipViewNodeOptions,
  QuireFlexViewNode,
  QuireFlexViewNodeWithDirectionOptions,
  QuireFlexViewNodeOptions,
  QuireOverlayViewNode,
  QuireOverlayViewNodeOptions,
  QuirePaddingViewNode,
  QuirePaddingViewNodeOptions,
  QuirePositionedViewNode,
  QuirePositionedViewNodeOptions,
  QuireSurfaceViewNode,
  QuireSurfaceViewNodeOptions
} from "../types";
import { freezeChildren, freezeQuireViewNode } from "./freeze";

/**
 * Creates a flex layout widget.
 *
 * @param options - Flex options with an explicit direction.
 * @returns Immutable flex widget node.
 */
export function flex(options: QuireFlexViewNodeWithDirectionOptions): QuireFlexViewNode {
  return createFlexNode(options.direction, options);
}

/**
 * Creates a horizontal flex widget.
 *
 * @param options - Flex options.
 * @returns Immutable row widget node.
 */
export function row(options: QuireFlexViewNodeOptions): QuireFlexViewNode {
  return createFlexNode("row", options);
}

/**
 * Creates a vertical flex widget.
 *
 * @param options - Flex options.
 * @returns Immutable column widget node.
 */
export function column(options: QuireFlexViewNodeOptions): QuireFlexViewNode {
  return createFlexNode("column", options);
}

/**
 * Creates a semantic surface widget.
 *
 * @param options - Surface options.
 * @returns Immutable surface widget node.
 */
export function surface(options: QuireSurfaceViewNodeOptions = {}): QuireSurfaceViewNode {
  return freezeQuireViewNode({
    ...options,
    kind: "surface"
  });
}

/**
 * Creates an overlay widget.
 *
 * @param options - Overlay options.
 * @returns Immutable overlay widget node.
 */
export function overlay(options: QuireOverlayViewNodeOptions): QuireOverlayViewNode {
  return freezeQuireViewNode({
    ...options,
    children: freezeChildren(options.children),
    kind: "overlay"
  });
}

/**
 * Creates an absolute positioning wrapper widget.
 *
 * @param options - Positioning options.
 * @returns Immutable positioned widget node.
 */
export function positioned(
  options: QuirePositionedViewNodeOptions
): QuirePositionedViewNode {
  return freezeQuireViewNode({
    ...options,
    kind: "positioned"
  });
}

/**
 * Creates a padding wrapper widget.
 *
 * @param options - Padding options.
 * @returns Immutable padding widget node.
 */
export function padding(options: QuirePaddingViewNodeOptions): QuirePaddingViewNode {
  return freezeQuireViewNode({
    ...options,
    kind: "padding"
  });
}

/**
 * Creates a rectangular clip widget.
 *
 * @param options - Clip options.
 * @returns Immutable clip widget node.
 */
export function clip(options: QuireClipViewNodeOptions): QuireClipViewNode {
  return freezeQuireViewNode({
    ...options,
    kind: "clip"
  });
}

/**
 * Creates a flex node for the requested axis.
 *
 * @param direction - Main-axis direction.
 * @param options - Flex options.
 * @returns Immutable flex widget node.
 */
function createFlexNode(
  direction: QuireFlexViewNode["direction"],
  options: QuireFlexViewNodeOptions | QuireFlexViewNodeWithDirectionOptions
): QuireFlexViewNode {
  return freezeQuireViewNode({
    ...options,
    children: freezeChildren(options.children),
    direction,
    kind: "flex"
  });
}
