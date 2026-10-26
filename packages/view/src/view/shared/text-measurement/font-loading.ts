/** Lifecycle that invalidates browser text measurements after font-set changes. */
export interface BrowserFontMeasurementRevision {
  /** Monotonic revision incremented whenever browser font metrics may change. */
  readonly version: number;
  /** Explicitly invalidates measurements after already-loaded faces are registered. */
  invalidate(): void;
  /** Invalidates only when the loaded faces differ from those at the last invalidation. */
  invalidateIfChanged(): void;
  /** Releases FontFaceSet listeners owned by the measurement adapter. */
  destroy(): void;
}

/**
 * Tracks browser font loading events for one mounted text-measurement cache.
 *
 * Canvas and SVG can synchronously return fallback metrics while a web font is
 * still loading. Clearing only layout geometry is insufficient because the
 * browser measurement adapter may otherwise replay those fallback widths from
 * its own cache. This lifecycle clears that cache first and advances the shared
 * measurer version so retained shaping and pagination caches also invalidate.
 *
 * @param ownerDocument - Document whose FontFaceSet owns rendered fonts.
 * @param invalidateMeasurements - Callback that clears backend measurement data.
 * @returns Destroyable monotonic font-measurement revision.
 */
export function createBrowserFontMeasurementRevision(
  ownerDocument: Document,
  invalidateMeasurements: () => void
): BrowserFontMeasurementRevision {
  let version = 0;
  const fonts = ownerDocument.fonts;
  // Every cached measurement was taken with exactly these faces loaded.
  let loadedFaces = readLoadedFaces(fonts);
  const invalidate = (): void => {
    invalidateMeasurements();
    version += 1;
    loadedFaces = readLoadedFaces(fonts);
  };
  const handleFontSetChange = (): void => invalidate();

  fonts?.addEventListener?.("loadingdone", handleFontSetChange);
  fonts?.addEventListener?.("loadingerror", handleFontSetChange);

  return {
    get version(): number {
      return version;
    },
    invalidate,
    invalidateIfChanged(): void {
      const current = readLoadedFaces(fonts);
      if (current.size !== loadedFaces.size || [...current].some((face) => !loadedFaces.has(face))) invalidate();
    },
    destroy(): void {
      fonts?.removeEventListener?.("loadingdone", handleFontSetChange);
      fonts?.removeEventListener?.("loadingerror", handleFontSetChange);
    }
  };
}

/**
 * @param fonts - Document font set, absent outside browsers.
 * @returns Faces currently usable for measurement.
 */
function readLoadedFaces(fonts: FontFaceSet | undefined): ReadonlySet<FontFace> {
  const loaded = new Set<FontFace>();
  if (fonts === undefined || typeof (fonts as Partial<Iterable<FontFace>>)[Symbol.iterator] !== "function") return loaded;
  for (const face of fonts as Iterable<FontFace>) {
    if (face.status === "loaded") loaded.add(face);
  }
  return loaded;
}
