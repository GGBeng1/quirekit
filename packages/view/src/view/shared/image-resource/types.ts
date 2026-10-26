import type {
  QuireMediaAssetResolver,
  QuireMediaIntrinsicSize,
  QuireResolvedMediaAsset
} from "@quirekit/media";
import type { QuireDisplayList } from "@quirekit/renderer";

/** Mounted lifecycle state for one opaque image resource key. */
export type QuireMountedImageResourceStatus =
  | "unresolved"
  | "loading"
  | "failed"
  | "resolved";

/** Browser-local paint inputs produced by one explicit image decoder. */
export interface QuireDecodedImageResource {
  /** Canvas-compatible decoded image source. */
  readonly source: CanvasImageSource;
  /** Browser-owned URL used only by SVG image paint. */
  readonly href: string;
  /** Positive intrinsic source dimensions. */
  readonly intrinsicSize: QuireMediaIntrinsicSize;
  /** Pixel size of `source` when it was decoded below the intrinsic size. */
  readonly pixelSize?: QuireMediaIntrinsicSize | undefined;
  /** Releases the decoded source and any owned URL exactly once. */
  release(): void;
}

/** Raster demand passed to a decoder that can decode below intrinsic size. */
export interface QuireImageDecodeRequest {
  /** Device pixels the whole image needs at its largest painted size. */
  readonly pixelSize: QuireMediaIntrinsicSize;
}

/** Explicit browser decoding boundary used by mounted image resources. */
export interface QuireImageResourceDecoder {
  /**
   * Decodes one already-resolved portable image asset.
   *
   * @param asset - Portable bytes returned by the explicit host resolver.
   * @param request - Optional raster demand; decoders may ignore it and decode at intrinsic size.
   * @returns Browser-local paint inputs with owned cleanup.
   */
  decode(
    asset: QuireResolvedMediaAsset,
    request?: QuireImageDecodeRequest
  ): Promise<QuireDecodedImageResource>;
}

/** Observable state snapshot for one mounted image resource key. */
export interface QuireMountedImageResourceState {
  /** Opaque portable resource key. */
  readonly key: string;
  /** Current lifecycle state. */
  readonly status: QuireMountedImageResourceStatus;
  /** Failure retained for diagnostics when status is `failed`. */
  readonly error?: unknown;
}

/** Inputs used to create a mounted image resource manager. */
export interface QuireMountedImageResourceManagerOptions {
  /** Explicit host resolver; omission keeps every portable key unresolved. */
  readonly resolver?: QuireMediaAssetResolver | undefined;
  /** Browser-local decoder used after portable bytes resolve. */
  readonly decoder: QuireImageResourceDecoder;
  /**
   * Schedules a display refresh after an asynchronous resource state change.
   *
   * @param state - New stable resource state.
   */
  readonly onStateChange?: ((state: QuireMountedImageResourceState) => void) | undefined;
  /** Decoded bytes kept for images no complete render pass paints; defaults to 48 MiB. */
  readonly maxIdleDecodedBytes?: number | undefined;
  /** Initial device pixels per display-list unit; omit to decode at intrinsic size. */
  readonly rasterScale?: number | undefined;
}

/** Mounted resource owner shared by Canvas and SVG display-list resolution. */
export interface QuireMountedImageResourceManager {
  /**
   * Resolves portable image commands to placeholders or browser paint inputs.
   *
   * @param displayList - Renderer-neutral display list to resolve.
   * @returns Display list safe for Canvas and SVG paint.
   */
  transformDisplayList(displayList: QuireDisplayList): QuireDisplayList;
  /**
   * Reads the current state for diagnostics.
   *
   * @param key - Opaque resource key to inspect.
   * @returns Current state, or undefined before the key is observed.
   */
  readState(key: string): QuireMountedImageResourceState | undefined;
  /**
   * Sets the device pixels per display-list unit of the surfaces painting the images.
   * Only raster backends set it; without it images decode at intrinsic size.
   *
   * @param scale - Positive backing-store scale, including display zoom.
   */
  setRasterScale(scale: number): void;
  /**
   * Sets the pages whose images may decode now; images of other pages decode once
   * their page enters the window. Only backends reporting mounted pages set it.
   *
   * @param pageIndices - Mounted pages of the committed snapshot, or undefined for every page.
   */
  setDemandPages(pageIndices: readonly number[] | undefined): void;
  /** Releases every decoded source and rejects late async completion. */
  destroy(): void;
}
