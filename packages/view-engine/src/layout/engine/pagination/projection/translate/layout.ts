import type {
  QuireLayoutBox,
  QuireLayoutContainer
} from "../../../types";
import { translateQuireAffineTransform } from "@quirekit/renderer";
import type { QuireLayoutBoxSubLayoutFragment } from "../../../sub-layout";
import { isQuireLayoutContainer } from "../guards";
import type { QuireLayoutTranslation } from "../types";
import { translateQuireRect } from "./rect";
import { translateQuireLayoutBoxSubLayoutFragments } from "./sub-layout";
import { translateQuireTableLayoutSnapshot } from "./table";
import { translateQuireTextFragments } from "./text";
import { translateQuireRetainedRegionProducts } from "./region-products";
import {
  containsQuireFloatingTable,
  resolveQuireFloatingTableVisualProjection
} from "./floating-table";

/** Layout box extension that retains child sub-layout fragments. */
interface QuireLayoutBoxWithSubLayoutFragments extends QuireLayoutBox {
  /** Retained sub-layout fragments for nested flows owned by this box. */
  readonly subLayoutFragments?: readonly QuireLayoutBoxSubLayoutFragment[] | undefined;
}

/** Cached page-projected layout box for one source box object. */
interface QuireProjectedLayoutBoxCacheEntry {
  /** Horizontal page projection offset. */
  readonly dx: number;
  /** Vertical page projection offset. */
  readonly dy: number;
  /** Horizontal visual-product projection offset. */
  readonly visualDx: number;
  /** Vertical visual-product projection offset. */
  readonly visualDy: number;
  /** Layout box translated for the offset pair. */
  readonly box: QuireLayoutBox;
}

/** Last page projection result keyed by source layout box object identity. */
const projectedLayoutBoxStore =
  new WeakMap<QuireLayoutBox, QuireProjectedLayoutBoxCacheEntry>();

/**
 * Translates one layout box and its owned geometry.
 *
 * @param box - Layout box to translate.
 * @param projection - Page-body projection to apply.
 * @returns Translated layout box.
 */
export function translateQuireLayoutBox(
  box: QuireLayoutBox,
  projection: QuireLayoutTranslation
): QuireLayoutBox {
  // Without page authority, zero translation cannot reposition floating visuals.
  // Preserve canonical identity before reading descendants or the page cache.
  if (projection.dx === 0 && projection.dy === 0 && !("page" in projection)) return box;

  const visualProjection = resolveQuireFloatingTableVisualProjection(
    box,
    projection
  );
  if (
    projection.dx === 0 &&
    projection.dy === 0 &&
    visualProjection.dx === 0 &&
    visualProjection.dy === 0 &&
    !containsQuireFloatingTable(box)
  ) {
    return box;
  }

  const entry = projectedLayoutBoxStore.get(box);
  if (
    entry !== undefined &&
    entry.dx === projection.dx &&
    entry.dy === projection.dy &&
    entry.visualDx === visualProjection.dx &&
    entry.visualDy === visualProjection.dy
  ) {
    return entry.box;
  }

  const rect = translateQuireRect(box.rect, projection);
  const paintTransform = box.paintTransform === undefined
    ? undefined
    : translateQuireAffineTransform(
        box.paintTransform,
        visualProjection.dx,
        visualProjection.dy
      );
  const paintBounds = box.paintBounds === undefined
    ? undefined
    : translateQuireRect(box.paintBounds, visualProjection);
  const paintClipRect = box.paintClipRect === undefined
    ? undefined
    : translateQuireRect(box.paintClipRect, visualProjection);
  const inlineLayoutRect =
    box.inlineLayoutRect === undefined
      ? undefined
      : translateQuireRect(box.inlineLayoutRect, visualProjection);
  const table =
    box.table === undefined
      ? undefined
      : translateQuireTableLayoutSnapshot(box.table, visualProjection);
  const textFragments =
    box.textFragments === undefined
      ? undefined
      : translateQuireTextFragments(box.textFragments, visualProjection);
  const regionProducts = box.regionProducts === undefined
    ? undefined
    : translateQuireRetainedRegionProducts(box.regionProducts, visualProjection);
  const subLayoutFragments = readQuireLayoutBoxSubLayoutFragments(box);
  const translatedSubLayoutFragments = subLayoutFragments === undefined
    ? undefined
    : translateQuireLayoutBoxSubLayoutFragments(
        subLayoutFragments,
        visualProjection,
        translateQuireLayoutBox
      );

  if (isQuireLayoutContainer(box)) {
    const translatedContainer: QuireLayoutContainer = {
      ...box,
      rect,
      ...(paintTransform === undefined ? {} : { paintTransform }),
      ...(paintBounds === undefined ? {} : { paintBounds }),
      ...(paintClipRect === undefined ? {} : { paintClipRect }),
      ...(inlineLayoutRect === undefined ? {} : { inlineLayoutRect }),
      ...(table === undefined ? {} : { table }),
      ...(textFragments === undefined ? {} : { textFragments }),
      ...(regionProducts === undefined ? {} : { regionProducts }),
      ...(translatedSubLayoutFragments === undefined
        ? {}
        : { subLayoutFragments: translatedSubLayoutFragments }),
      children: box.children.map((child) =>
        translateQuireLayoutBox(child, visualProjection)
      )
    };

    projectedLayoutBoxStore.set(box, {
      dx: projection.dx,
      dy: projection.dy,
      visualDx: visualProjection.dx,
      visualDy: visualProjection.dy,
      box: translatedContainer
    });

    return translatedContainer;
  }

  const translated = {
    ...box,
    rect,
    ...(paintTransform === undefined ? {} : { paintTransform }),
    ...(paintBounds === undefined ? {} : { paintBounds }),
    ...(paintClipRect === undefined ? {} : { paintClipRect }),
    ...(inlineLayoutRect === undefined ? {} : { inlineLayoutRect }),
    ...(table === undefined ? {} : { table }),
    ...(textFragments === undefined ? {} : { textFragments }),
    ...(regionProducts === undefined ? {} : { regionProducts }),
    ...(translatedSubLayoutFragments === undefined
      ? {}
      : { subLayoutFragments: translatedSubLayoutFragments })
  };

  projectedLayoutBoxStore.set(box, {
    dx: projection.dx,
    dy: projection.dy,
    visualDx: visualProjection.dx,
    visualDy: visualProjection.dy,
    box: translated
  });

  return translated;
}

/**
 * Reads retained sub-layout fragments from a layout box.
 *
 * @param box - Layout box that may carry retained sub-layout fragments.
 * @returns Retained sub-layout fragments, or undefined when the box has none.
 */
function readQuireLayoutBoxSubLayoutFragments(
  box: QuireLayoutBox
): readonly QuireLayoutBoxSubLayoutFragment[] | undefined {
  const candidate = box as QuireLayoutBoxWithSubLayoutFragments;

  return candidate.subLayoutFragments;
}
