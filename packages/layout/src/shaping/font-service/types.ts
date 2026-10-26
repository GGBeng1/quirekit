import type {
  CanvasGlyphPathSource,
  QuireFontServiceSource,
  QuireFontServiceSourceData,
  QuireFontServiceSourceDataLoader,
  QuireFontServiceSourceDataProvider,
  QuireFontServiceSourceDataValue
} from "@quirekit/renderer";
import type { QuireTextMeasurer } from "../../text";
import type {
  QuireFontResolver,
  QuireFontResolverOptions
} from "../font-resolver";
import type {
  QuireLoadedShaperFont,
  QuireTextShaperBackend
} from "../types";

export type {
  QuireFontServiceSource,
  QuireFontServiceSourceData,
  QuireFontServiceSourceDataLoader,
  QuireFontServiceSourceDataProvider,
  QuireFontServiceSourceDataValue
};

/** Options used to create a canvas font service. */
export interface QuireFontServiceOptions {
  /** Backend that loads raw font bytes into synchronous shaper fonts. */
  readonly backend: QuireTextShaperBackend;
  /** Font sources to load into the backend. */
  readonly sources: readonly QuireFontServiceSource[];
  /** Optional host loader for sources that do not include inline bytes. */
  readonly loadSourceData?: QuireFontServiceSourceDataLoader;
  /** Optional measurer used when loaded fonts cannot cover a text segment. */
  readonly fallbackMeasurer?: QuireTextMeasurer | undefined;
  /**
   * Aligns shaped advances to `fallbackMeasurer.measureText()` output.
   *
   * This is useful while a mounted browser view still paints with native canvas
   * text APIs instead of drawing individual shaped glyphs.
   */
  readonly normalizeWidthToFallbackMeasurer?: boolean | undefined;
  /** Ordered fallback families used after requested CSS families. */
  readonly fallbackFamilies?: QuireFontResolverOptions["fallbackFamilies"];
}

/** Runtime font service consumed by mounted layout and diagnostics. */
export interface QuireFontService {
  /** Loaded shaper fonts managed by this service. */
  readonly fonts: readonly QuireLoadedShaperFont[];
  /** Resolver that maps CSS font requests to loaded font runs. */
  readonly resolver: QuireFontResolver;
  /** Text measurer backed by the service resolver. */
  readonly textMeasurer: QuireTextMeasurer;
  /** Renderer-compatible glyph path source backed by loaded fonts. */
  readonly glyphPathSource: CanvasGlyphPathSource;
  /**
   * Releases loaded font and backend resources.
   *
   * @returns Optional promise when backend cleanup is asynchronous.
   */
  destroy(): void | Promise<void>;
}
