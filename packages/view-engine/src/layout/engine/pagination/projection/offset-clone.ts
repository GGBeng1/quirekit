import type { QuireRect } from "@quirekit/renderer";
import {
  cloneQuireTextFragmentWithLazyCaretStops,
  type QuireTextFragment
} from "@quirekit/layout/text";
import type {
  QuireLayoutBox,
  QuireLayoutContainer
} from "../../types";
import { isQuireLayoutContainer } from "./guards";

/** Options for cloning a layout box subtree by a fixed visual offset. */
export interface QuireLayoutBoxOffsetCloneOptions {
  /** Source layout box subtree to clone. */
  readonly box: QuireLayoutBox;
  /** Horizontal offset in CSS pixels. */
  readonly dx: number;
  /** Vertical offset in CSS pixels. */
  readonly dy: number;
  /** Optional replacement id for the cloned root. */
  readonly id?: string | undefined;
  /** Stable id suffix appended to cloned descendants and text fragments. */
  readonly suffix: string;
}

/**
 * Clones a layout box subtree by applying a fixed positional offset.
 *
 * @param options - Box, offset, optional replacement id, and repeated id suffix.
 * @returns Cloned layout box subtree.
 */
export function cloneQuireLayoutBoxWithOffset(
  options: QuireLayoutBoxOffsetCloneOptions
): QuireLayoutBox {
  const rect = translateQuireRectByOffset(options.box.rect, options.dx, options.dy);
  const inlineLayoutRect =
    options.box.inlineLayoutRect === undefined
      ? undefined
      : translateQuireRectByOffset(
          options.box.inlineLayoutRect,
          options.dx,
          options.dy
        );
  const textFragments = options.box.textFragments?.map((fragment) =>
    translateQuireTextFragmentByOffset(fragment, options.dx, options.dy, options.suffix)
  );

  if (isQuireLayoutContainer(options.box)) {
    const cloned: QuireLayoutContainer = {
      ...options.box,
      id: options.id ?? `${options.box.id}${options.suffix}`,
      rect,
      ...(inlineLayoutRect === undefined ? {} : { inlineLayoutRect }),
      ...(textFragments === undefined ? {} : { textFragments }),
      children: options.box.children.map((child) =>
        cloneQuireLayoutBoxWithOffset({
          box: child,
          dx: options.dx,
          dy: options.dy,
          suffix: options.suffix
        })
      )
    };

    return cloned;
  }

  return {
    ...options.box,
    id: options.id ?? `${options.box.id}${options.suffix}`,
    rect,
    ...(inlineLayoutRect === undefined ? {} : { inlineLayoutRect }),
    ...(textFragments === undefined ? {} : { textFragments })
  };
}

/**
 * Translates a text fragment and its baseline by a fixed offset.
 *
 * @param fragment - Text fragment to clone.
 * @param dx - Horizontal offset in CSS pixels.
 * @param dy - Vertical offset in CSS pixels.
 * @param suffix - Stable id suffix for the cloned fragment.
 * @returns Cloned text fragment.
 */
function translateQuireTextFragmentByOffset(
  fragment: QuireTextFragment,
  dx: number,
  dy: number,
  suffix: string
): QuireTextFragment {
  return cloneQuireTextFragmentWithLazyCaretStops({
    source: fragment,
    id: `${fragment.id}${suffix}`,
    range: fragment.range,
    rect: translateQuireRectByOffset(fragment.rect, dx, dy),
    baseline: fragment.baseline + dy
  });
}

/**
 * Translates a rectangle by a fixed offset.
 *
 * @param rect - Rectangle to translate.
 * @param dx - Horizontal offset in CSS pixels.
 * @param dy - Vertical offset in CSS pixels.
 * @returns Translated rectangle.
 */
function translateQuireRectByOffset(
  rect: QuireRect,
  dx: number,
  dy: number
): QuireRect {
  return {
    x: rect.x + dx,
    y: rect.y + dy,
    width: rect.width,
    height: rect.height
  };
}
