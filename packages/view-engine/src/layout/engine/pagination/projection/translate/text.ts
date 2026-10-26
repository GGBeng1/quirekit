import {
  attachQuireTextFragmentSource,
  cloneQuireTextFragmentWithLazyCaretStops,
  readQuireTextFragmentSource,
  type QuireTextFragment
} from "@quirekit/layout/text";
import {
  markQuireTextFragmentsSortedByLineTop,
  readQuireTextFragmentFlowOrderMetadata
} from "@quirekit/layout/text";
import type { QuireLayoutTranslation } from "../types";
import { translateQuireRect } from "./rect";

/** Cached page-projected text fragment for one source fragment object. */
interface QuireProjectedTextFragmentCacheEntry {
  /** Horizontal page projection offset. */
  readonly dx: number;
  /** Vertical page projection offset. */
  readonly dy: number;
  /** Text fragment translated for the offset pair. */
  readonly fragment: QuireTextFragment;
}

/** Cached translated fragment array for one source fragment array object. */
interface QuireProjectedTextFragmentArrayCacheEntry {
  /** Horizontal page projection offset. */
  readonly dx: number;
  /** Vertical page projection offset. */
  readonly dy: number;
  /** Fragment array translated for the offset pair. */
  readonly fragments: readonly QuireTextFragment[];
}

/** Last page projection array result keyed by source fragment array identity. */
const projectedTextFragmentArrayStore =
  new WeakMap<readonly QuireTextFragment[], QuireProjectedTextFragmentArrayCacheEntry>();

/** Last page projection result keyed by source text fragment object identity. */
const projectedTextFragmentStore =
  new WeakMap<QuireTextFragment, QuireProjectedTextFragmentCacheEntry>();

/**
 * Translates measured text fragments and their baselines.
 *
 * @param fragments - Text fragments to translate.
 * @param projection - Page-body projection to apply.
 * @returns Translated text fragments.
 */
export function translateQuireTextFragments(
  fragments: readonly QuireTextFragment[],
  projection: QuireLayoutTranslation
): readonly QuireTextFragment[] {
  if (projection.dx === 0 && projection.dy === 0) {
    return fragments;
  }

  const entry = projectedTextFragmentArrayStore.get(fragments);
  if (
    entry !== undefined &&
    entry.dx === projection.dx &&
    entry.dy === projection.dy
  ) {
    return entry.fragments;
  }

  const translated: QuireTextFragment[] = [];

  for (let index = 0; index < fragments.length; index += 1) {
    translated.push(translateQuireTextFragment(fragments[index]!, projection));
  }

  projectedTextFragmentArrayStore.set(fragments, {
    dx: projection.dx,
    dy: projection.dy,
    fragments: translated
  });

  return readQuireTextFragmentFlowOrderMetadata(fragments)?.sortedByLineTop === true
    ? markQuireTextFragmentsSortedByLineTop(translated)
    : translated;
}

/**
 * Translates one measured text fragment and its baseline.
 *
 * @param fragment - Text fragment to translate.
 * @param projection - Page-body projection to apply.
 * @returns Translated text fragment.
 */
export function translateQuireTextFragment(
  fragment: QuireTextFragment,
  projection: QuireLayoutTranslation
): QuireTextFragment {
  if (projection.dx === 0 && projection.dy === 0) {
    return fragment;
  }

  const entry = projectedTextFragmentStore.get(fragment);
  if (
    entry !== undefined &&
    entry.dx === projection.dx &&
    entry.dy === projection.dy
  ) {
    return entry.fragment;
  }

  const translated = cloneQuireTextFragmentWithLazyCaretStops({
    source: fragment,
    id: fragment.id,
    range: fragment.range,
    rect: translateQuireRect(fragment.rect, projection),
    baseline: fragment.baseline + projection.dy
  });
  attachProjectedTextFragmentSource(translated, fragment, projection);

  projectedTextFragmentStore.set(fragment, {
    dx: projection.dx,
    dy: projection.dy,
    fragment: translated
  });

  return translated;
}

/**
 * Forwards shifted-fragment source metadata through page projection.
 *
 * @param translated - Current page-projected fragment.
 * @param source - Source-flow fragment before page projection.
 * @param projection - Page projection applied to the source.
 * @returns Nothing.
 */
function attachProjectedTextFragmentSource(
  translated: QuireTextFragment,
  source: QuireTextFragment,
  projection: QuireLayoutTranslation
): void {
  const retainedSource = readQuireTextFragmentSource(source);
  const projectedRetainedSource = retainedSource === undefined
    ? undefined
    : projectedTextFragmentStore.get(retainedSource);

  if (
    projectedRetainedSource !== undefined &&
    projectedRetainedSource.dx === projection.dx &&
    projectedRetainedSource.dy === projection.dy
  ) {
    attachQuireTextFragmentSource(translated, projectedRetainedSource.fragment);
    return;
  }

  attachQuireTextFragmentSource(translated, source);
}
