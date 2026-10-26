import type { QuireTextFragment } from "./types";

/** Source metadata for a text fragment produced by shifting another fragment. */
interface QuireTextFragmentSourceMetadata {
  /** Fragment whose paint-equivalent local geometry produced the shifted fragment. */
  readonly source: QuireTextFragment;
}

/** Non-enumerable source metadata keyed by shifted text-fragment identity. */
const textFragmentSourceStore =
  new WeakMap<QuireTextFragment, QuireTextFragmentSourceMetadata>();

/**
 * Attaches a retained source fragment to a shifted text fragment.
 *
 * @param fragment - Shifted text fragment that should inherit source metadata.
 * @param source - Retained source fragment before the shift or projection.
 * @returns Nothing.
 */
export function attachQuireTextFragmentSource(
  fragment: QuireTextFragment,
  source: QuireTextFragment
): void {
  if (fragment === source) {
    return;
  }

  textFragmentSourceStore.set(fragment, { source });
}

/**
 * Reads the retained source fragment for a shifted text fragment.
 *
 * @param fragment - Text fragment to inspect.
 * @returns Source fragment metadata, or undefined when the fragment is original.
 */
export function readQuireTextFragmentSource(
  fragment: QuireTextFragment
): QuireTextFragment | undefined {
  return textFragmentSourceStore.get(fragment)?.source;
}
