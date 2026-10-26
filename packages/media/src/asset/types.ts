/** Media families represented by the first portable asset contract. */
export type QuireMediaAssetKind = "image";

/** Stable reference to portable bytes registered with a host media repository. */
export interface QuireAssetMediaReference {
  /** Reference discriminator. */
  readonly kind: "asset";
  /** Stable host-defined asset identifier. */
  readonly assetId: string;
}

/** Stable reference whose resolution is controlled by an explicit host policy. */
export interface QuireExternalMediaReference {
  /** Reference discriminator. */
  readonly kind: "external";
  /** Preserved external location; resolving it never implies an automatic fetch. */
  readonly href: string;
}

/** JSON-safe media identity stored by canonical document models. */
export type QuireMediaReference =
  | QuireAssetMediaReference
  | QuireExternalMediaReference;

/** Intrinsic raster dimensions in CSS-independent source pixels. */
export interface QuireMediaIntrinsicSize {
  /** Positive finite source width in pixels. */
  readonly width: number;
  /** Positive finite source height in pixels. */
  readonly height: number;
}

/** Portable bytes and metadata accepted by a media asset sink. */
export interface QuireMediaAssetInput {
  /** Stable host-defined identifier used by asset references. */
  readonly assetId: string;
  /** Media family represented by the bytes. */
  readonly kind: QuireMediaAssetKind;
  /** Syntactically valid MIME media type matching the media family. */
  readonly mimeType: string;
  /** Non-empty portable bytes copied by the receiving sink. */
  readonly bytes: ArrayBuffer | Uint8Array;
  /** Optional non-empty producer-visible file name. */
  readonly fileName?: string | undefined;
  /** Optional positive finite intrinsic raster dimensions. */
  readonly intrinsicSize?: QuireMediaIntrinsicSize | undefined;
}

/** One resolved portable media asset returned to a consumer. */
export interface QuireResolvedMediaAsset {
  /** Stable reference that produced this resolution. */
  readonly reference: QuireMediaReference;
  /** Media family represented by the bytes. */
  readonly kind: QuireMediaAssetKind;
  /** Syntactically valid MIME media type matching the media family. */
  readonly mimeType: string;
  /** Non-empty portable bytes owned by the caller. */
  readonly bytes: Uint8Array;
  /** Optional non-empty producer-visible file name. */
  readonly fileName?: string | undefined;
  /** Optional positive finite intrinsic raster dimensions. */
  readonly intrinsicSize?: QuireMediaIntrinsicSize | undefined;
}

/** Explicit media-resolution boundary implemented by a host or repository. */
export interface QuireMediaAssetResolver {
  /**
   * Resolves portable media without implying network access.
   *
   * @param reference - Stable reference requested by a consumer.
   * @returns A resolved asset, or undefined when this resolver cannot resolve it.
   */
  resolve(
    reference: QuireMediaReference
  ):
    | QuireResolvedMediaAsset
    | undefined
    | Promise<QuireResolvedMediaAsset | undefined>;
}

/** Registration boundary implemented by a host-owned media repository. */
export interface QuireMediaAssetSink {
  /**
   * Registers one complete portable asset.
   *
   * @param asset - Stable identity, portable bytes, and validated metadata.
   * @returns The canonical asset reference.
   */
  put(asset: QuireMediaAssetInput): QuireAssetMediaReference;
}

/** One-shot ownership handle for an asset registered during authoring. */
export interface QuireMediaAssetLease {
  /** Canonical reference made available by the registration. */
  readonly reference: QuireAssetMediaReference;
  /**
   * Accepts the registered asset as reachable document state.
   *
   * @returns Whether this call settled the lease.
   */
  accept(): boolean;
  /**
   * Rolls back an unaccepted asset created by this registration.
   *
   * @returns Whether this call removed a newly registered asset.
   */
  rollback(): boolean;
}

/** Registration boundary for authoring workflows that can fail before commit. */
export interface QuireMediaAssetRegistrar {
  /**
   * Registers one complete asset behind a one-shot accept/rollback lease.
   *
   * @param asset - Stable identity, portable bytes, and validated metadata.
   * @returns Lease controlling only this registration's provisional ownership.
   */
  register(asset: QuireMediaAssetInput): QuireMediaAssetLease;
}

/** Minimal synchronous repository contract used by tests, demos, and hosts. */
export interface QuireMediaRepository
  extends QuireMediaAssetResolver,
    QuireMediaAssetSink,
    QuireMediaAssetRegistrar {
  /**
   * Resolves one repository-owned asset synchronously.
   *
   * @param reference - Stable reference requested by a consumer.
   * @returns A resolved asset, or undefined when the repository cannot resolve it.
   */
  resolve(reference: QuireMediaReference): QuireResolvedMediaAsset | undefined;
  /**
   * Reports whether one stable asset id is registered.
   *
   * @param assetId - Stable host-defined identifier.
   * @returns True when the repository contains the asset.
   */
  has(assetId: string): boolean;
}
