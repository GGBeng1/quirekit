/** Font bytes and metadata supplied to a shaping backend or glyph outline loader. */
export interface QuireShaperFontSource {
  /** Stable id used by caches and diagnostics. */
  readonly id: string;
  /** CSS family name represented by the font data. */
  readonly family: string;
  /**
   * CSS generic family this font satisfies (`serif`, `sans-serif`, `monospace`, …).
   * Lets a generic request (e.g. `monospace`) resolve to a font of that category
   * instead of any loaded font — a monospace run shaped with a proportional font
   * gets proportional advances and overlaps when painted at shaped positions.
   */
  readonly genericFamily?: string;
  /** Raw OpenType-compatible font bytes. */
  readonly data: ArrayBuffer;
  /** Font face index for collections. */
  readonly faceIndex?: number;
  /** CSS font style represented by the source. */
  readonly style?: string;
  /** CSS font weight represented by the source. */
  readonly weight?: string | number;
}

/** Raw byte containers accepted from host font loaders. */
export type QuireFontServiceSourceDataValue = ArrayBuffer | ArrayBufferView;

/** Function that lazily returns raw font bytes. */
export type QuireFontServiceSourceDataProvider = () =>
  QuireFontServiceSourceDataValue | Promise<QuireFontServiceSourceDataValue>;

/** Raw font bytes accepted by a font service before backend loading. */
export type QuireFontServiceSourceData =
  | QuireFontServiceSourceDataValue
  | Promise<QuireFontServiceSourceDataValue>
  | QuireFontServiceSourceDataProvider;

/** Host-configured font source that may load bytes lazily. */
export interface QuireFontServiceSource extends Omit<QuireShaperFontSource, "data"> {
  /** Raw font bytes or a lazy provider for those bytes. */
  readonly data?: QuireFontServiceSourceData;
  /** Optional URL used by host fetch-backed source loaders. */
  readonly url?: string | URL;
}

/**
 * Loads raw bytes for a font source that did not include inline `data`.
 *
 * @param source - Font source metadata without resolved backend bytes.
 * @returns Raw font bytes or a promise for the bytes.
 */
export type QuireFontServiceSourceDataLoader = (
  source: QuireFontServiceSource
) => QuireFontServiceSourceData;
