import { adaptQuireLayoutDocumentToSnapshot } from "../../adapter";
import type { QuireLayoutSnapshot, QuireRetainedLayoutSnapshot } from "../../types";
import { readQuireLayoutProductCandidate } from "./cache";
import type { QuirePositionLayoutProjection } from "./types";

const projections = new WeakMap<QuireLayoutSnapshot, QuirePositionLayoutProjection>();

/**
 * Materializes an offscreen page window from measured and paginated geometry.
 *
 * This query never publishes a frame or changes the mounted window. Its cache is
 * bounded to one window per immutable snapshot; consecutive anchors on that page
 * share the projection without collecting, shaping or paginating again.
 *
 * @param snapshot - Current retained geometry, possibly clipped to the viewport.
 * @param position - Source position whose page should be queried.
 * @returns Page-local query geometry, or null when its source is unavailable.
 */
export function resolveQuireLayoutSnapshotForPosition(
  snapshot: QuireLayoutSnapshot,
  position: number
): QuireRetainedLayoutSnapshot | null {
  const candidate = readQuireLayoutProductCandidate(snapshot);
  if (candidate === undefined || !Number.isInteger(position)) return null;
  const pages = snapshot.pages ?? [];
  // A shared source boundary needs both occurrences so the existing caret
  // authority can apply its affinity. Empty intervening pages have no caret;
  // retaining the first and last matching page bounds this window to two pages.
  const firstPage = pages.find(entry => entry.range.from <= position && position <= entry.range.to);
  if (firstPage === undefined) return null;
  let lastPage = firstPage;
  for (let index = pages.length - 1; index >= 0; index--) {
    const page = pages[index]!;
    if (page.range.from <= position && position <= page.range.to) {
      lastPage = page;
      break;
    }
  }
  const cached = projections.get(snapshot);
  if (cached?.firstPage === firstPage && cached.lastPage === lastPage) return cached.snapshot;

  const snapshotClipRects = firstPage === lastPage ? [firstPage.pageRect] : [firstPage.pageRect, lastPage.pageRect];
  const { product } = candidate;
  const document = product.projectDocument({ ...candidate.options, snapshotClipRects });
  // Adapt into the same document coordinate space and version as the caller.
  // The original interaction tree and its transient hit targets stay untouched.
  const projected = adaptQuireLayoutDocumentToSnapshot({
    ...product, document, snapshotClipRects,
    state: snapshot.state,
    viewportRect: snapshot.viewportRect,
    documentProfile: snapshot.documentProfile
  });
  projections.set(snapshot, { firstPage, lastPage, snapshot: projected });
  return projected;
}
