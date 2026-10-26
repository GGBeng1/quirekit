import type { QuireMediaIntrinsicSize } from "@quirekit/media";

/**
 * Pages whose images may decode now, and the images that pages outside them deferred.
 *
 * Page indices address the committed page snapshot. Without a window every page decodes,
 * as on surfaces that do not report their mounted pages.
 */
export class MountedImageDemandWindow {
  private pages: ReadonlySet<number> | undefined;
  /** Deferred image keys per page, with the largest whole-image demand in display-list units. */
  private readonly deferred = new Map<number, Map<string, QuireMediaIntrinsicSize | undefined>>();

  /**
   * @param pageIndex - Page of the current snapshot.
   * @returns Whether images painted on it may decode now.
   */
  covers(pageIndex: number): boolean {
    return this.pages === undefined || this.pages.has(pageIndex);
  }

  /**
   * Forgets a page's deferred images before its chunk is transformed again.
   *
   * @param pageIndex - Page whose chunk is being transformed.
   */
  clear(pageIndex: number): void {
    this.deferred.delete(pageIndex);
  }

  /**
   * Records an image a page outside the window paints.
   *
   * @param pageIndex - Page outside the window.
   * @param key - Resource key.
   * @param demand - Whole-image demand of the command, if known.
   */
  defer(pageIndex: number, key: string, demand: QuireMediaIntrinsicSize | undefined): void {
    let images = this.deferred.get(pageIndex);
    if (images === undefined) this.deferred.set(pageIndex, images = new Map());
    images.set(key, largest(images.get(key), demand));
  }

  /**
   * Replaces the window.
   *
   * @param pageIndices - Mounted pages, or undefined to let every page decode.
   * @returns Deferred images of the pages now inside the window, with their demands.
   */
  update(pageIndices: readonly number[] | undefined): Map<string, QuireMediaIntrinsicSize | undefined> {
    this.pages = pageIndices === undefined ? undefined : new Set(pageIndices);
    const ready = new Map<string, QuireMediaIntrinsicSize | undefined>();
    for (const [pageIndex, images] of this.deferred) {
      if (!this.covers(pageIndex)) continue;
      for (const [key, demand] of images) ready.set(key, largest(ready.get(key), demand));
      this.deferred.delete(pageIndex);
    }
    return ready;
  }
}

/**
 * @param left - Known demand.
 * @param right - Another demand.
 * @returns Per-axis maximum, or whichever is known.
 */
function largest(
  left: QuireMediaIntrinsicSize | undefined,
  right: QuireMediaIntrinsicSize | undefined
): QuireMediaIntrinsicSize | undefined {
  if (left === undefined) return right;
  if (right === undefined) return left;
  return { width: Math.max(left.width, right.width), height: Math.max(left.height, right.height) };
}
