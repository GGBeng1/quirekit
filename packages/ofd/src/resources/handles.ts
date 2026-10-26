import type {
  OFDAttachmentOptions,
  OFDFontFormat,
  OFDFontOptions,
  OFDImageFormat,
  OFDImageOptions
} from "./types";

/** Opaque font resource owned by one `OFDDocument`. */
export class OFDFont {
  /** @internal */
  readonly documentIdentity: object;
  /** @internal */
  readonly resourceIndex: number;
  /** Font options frozen at embedding time. */
  readonly options: Readonly<OFDFontOptions>;
  /** Complete optional font bytes. */
  readonly data: Uint8Array | undefined;
  /** Validated container format when bytes are embedded. */
  readonly format: OFDFontFormat | undefined;

  /**
   * Creates an internal font handle.
   *
   * @param documentIdentity - Owning document identity.
   * @param resourceIndex - Stable resource index.
   * @param options - Frozen resource options.
   * @param data - Optional complete font bytes.
   * @param format - Validated font container.
   */
  constructor(
    documentIdentity: object,
    resourceIndex: number,
    options: Readonly<OFDFontOptions>,
    data?: Uint8Array,
    format?: OFDFontFormat
  ) {
    this.documentIdentity = documentIdentity;
    this.resourceIndex = resourceIndex;
    this.options = options;
    this.data = data;
    this.format = format;
  }
}

/** Opaque image resource owned by one `OFDDocument`. */
export class OFDImage {
  /** @internal */
  readonly documentIdentity: object;
  /** @internal */
  readonly resourceIndex: number;
  /** Complete image bytes. */
  readonly data: Uint8Array;
  /** Validated image format. */
  readonly format: OFDImageFormat;
  /** Frozen image options. */
  readonly options: Readonly<OFDImageOptions>;

  /**
   * Creates an internal image handle.
   *
   * @param documentIdentity - Owning document identity.
   * @param resourceIndex - Stable resource index.
   * @param data - Complete image bytes.
   * @param format - Validated image format.
   * @param options - Frozen resource options.
   */
  constructor(
    documentIdentity: object,
    resourceIndex: number,
    data: Uint8Array,
    format: OFDImageFormat,
    options: Readonly<OFDImageOptions>
  ) {
    this.documentIdentity = documentIdentity;
    this.resourceIndex = resourceIndex;
    this.data = data;
    this.format = format;
    this.options = options;
  }
}

/** Opaque attachment resource owned by one `OFDDocument`. */
export class OFDAttachment {
  /** @internal */
  readonly documentIdentity: object;
  /** @internal */
  readonly resourceIndex: number;
  /** Complete attachment bytes. */
  readonly data: Uint8Array;
  /** Frozen attachment options. */
  readonly options: Readonly<OFDAttachmentOptions>;

  /**
   * Creates an internal attachment handle.
   *
   * @param documentIdentity - Owning document identity.
   * @param resourceIndex - Stable resource index.
   * @param data - Complete attachment bytes.
   * @param options - Frozen attachment options.
   */
  constructor(
    documentIdentity: object,
    resourceIndex: number,
    data: Uint8Array,
    options: Readonly<OFDAttachmentOptions>
  ) {
    this.documentIdentity = documentIdentity;
    this.resourceIndex = resourceIndex;
    this.data = data;
    this.options = options;
  }
}
