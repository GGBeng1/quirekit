import type { OFDImageFormat, OFDImageOptions } from "../resources";

/** Image resource local to exactly one physical OFD page. */
export class OFDPageImage {
  /** @internal */
  readonly documentIdentity: object;
  /** @internal */
  readonly pageIdentity: object;
  /** @internal */
  readonly resourceIndex: number;
  /** Complete copied image bytes. */
  readonly data: Uint8Array;
  /** Validated image format. */
  readonly format: OFDImageFormat;
  /** Frozen image options. */
  readonly options: Readonly<OFDImageOptions>;

  /**
   * Creates one internal page-local image handle.
   *
   * @param documentIdentity - Owning document identity.
   * @param pageIdentity - Owning physical page identity.
   * @param resourceIndex - Stable page-local image index.
   * @param data - Complete image bytes.
   * @param format - Validated image format.
   * @param options - Frozen image options.
   */
  constructor(
    documentIdentity: object,
    pageIdentity: object,
    resourceIndex: number,
    data: Uint8Array,
    format: OFDImageFormat,
    options: Readonly<OFDImageOptions>
  ) {
    this.documentIdentity = documentIdentity;
    this.pageIdentity = pageIdentity;
    this.resourceIndex = resourceIndex;
    this.data = data;
    this.format = format;
    this.options = options;
  }
}

/** Page-local resource registry owned by one `OFDPage`. */
export class OFDPageResources {
  private readonly images: OFDPageImage[] = [];

  /**
   * Creates one page-local resource registry.
   *
   * @param documentIdentity - Owning document identity.
   * @param pageIdentity - Owning physical page identity.
   */
  constructor(
    private readonly documentIdentity: object,
    private readonly pageIdentity: object
  ) {}

  /**
   * Adds a PNG or JPEG image local to the owning page.
   *
   * @param data - Complete image bytes.
   * @param options - Optional image format hint.
   * @returns Page-local image handle.
   */
  addImage(
    data: Uint8Array | ArrayBuffer,
    options: OFDImageOptions = {}
  ): OFDPageImage {
    const bytes = copyBytes(data);
    const format = detectImageFormat(bytes);
    if (!format || (options.format && options.format !== format)) {
      throw new TypeError("OFD page image bytes must match PNG or JPEG.");
    }
    const image = new OFDPageImage(
      this.documentIdentity,
      this.pageIdentity,
      this.images.length,
      bytes,
      format,
      Object.freeze({ ...options })
    );
    this.images.push(image);
    return image;
  }

  /**
   * Freezes page-local image handles in insertion order.
   *
   * @returns Immutable local image sequence.
   * @internal
   */
  toSnapshot(): readonly OFDPageImage[] {
    return Object.freeze([...this.images]);
  }
}

/**
 * Copies caller-owned binary data into an isolated typed array.
 *
 * @param data - Source bytes or buffer.
 * @returns Copied bytes.
 */
function copyBytes(data: Uint8Array | ArrayBuffer): Uint8Array {
  return data instanceof Uint8Array ? new Uint8Array(data) : new Uint8Array(data.slice(0));
}

/**
 * Detects the supported image format from standard file signatures.
 *
 * @param data - Candidate image bytes.
 * @returns Detected format, or undefined for an unsupported signature.
 */
function detectImageFormat(data: Uint8Array): OFDImageFormat | undefined {
  if (data.length >= 8
    && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47
    && data[4] === 0x0d && data[5] === 0x0a && data[6] === 0x1a && data[7] === 0x0a) {
    return "PNG";
  }
  return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff
    ? "JPEG"
    : undefined;
}
