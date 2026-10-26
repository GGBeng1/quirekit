/** Standard device color spaces supported by the standalone OFD writer. */
export type OFDColorSpaceType = "DeviceGray" | "DeviceRGB" | "DeviceCMYK";

/** One pre-defined color value stored in a color-space palette. */
export type OFDPaletteColor = readonly number[];

/** Options used to register one reusable OFD device color space. */
export interface OFDColorSpaceOptions {
  /** Required standard device color-space family. */
  readonly type: OFDColorSpaceType;
  /** Optional bits per channel; valid values are 1, 2, 4, 8, and 16. */
  readonly bitsPerComponent?: 1 | 2 | 4 | 8 | 16;
  /** Optional indexed palette entries in this color space's channel order. */
  readonly palette?: readonly OFDPaletteColor[];
}

/** One color used by a reusable drawing parameter. */
export interface OFDDrawParamColor {
  /** Direct device-channel values; omitted when selecting a palette entry. */
  readonly value?: readonly number[];
  /** Palette entry index, starting at zero. */
  readonly index?: number;
  /** Optional registered color space; omitted values use the default device RGB space. */
  readonly colorSpace?: OFDColorSpace;
  /** Optional opacity byte from 0 through 255. */
  readonly alpha?: number;
}

/** Options used to register a reusable drawing parameter resource. */
export interface OFDDrawParamOptions {
  /** Optional same-document parameter inherited before local overrides. */
  readonly relative?: OFDDrawParam;
  /** Optional non-negative path line width in millimetres. */
  readonly lineWidth?: number;
  /** Optional path line-join style. */
  readonly lineJoin?: "Miter" | "Round" | "Bevel";
  /** Optional path line-cap style. */
  readonly lineCap?: "Butt" | "Round" | "Square";
  /** Optional dash phase in millimetres. */
  readonly dashOffset?: number;
  /** Optional alternating dash and gap lengths. */
  readonly dashPattern?: readonly number[];
  /** Optional positive miter clipping limit. */
  readonly miterLimit?: number;
  /** Optional shared fill paint. */
  readonly fillColor?: OFDDrawParamColor;
  /** Optional shared stroke paint. */
  readonly strokeColor?: OFDDrawParamColor;
}

/** Opaque reusable color-space resource owned by one `OFDDocument`. */
export class OFDColorSpace {
  /** @internal */
  readonly documentIdentity: object;
  /** @internal */
  readonly resourceIndex: number;
  /** Frozen registered color-space options. */
  readonly options: Readonly<OFDColorSpaceOptions>;

  /**
   * Creates an internal color-space handle.
   *
   * @param documentIdentity - Owning document identity.
   * @param resourceIndex - Stable registration index.
   * @param options - Frozen color-space options.
   */
  constructor(
    documentIdentity: object,
    resourceIndex: number,
    options: Readonly<OFDColorSpaceOptions>
  ) {
    this.documentIdentity = documentIdentity;
    this.resourceIndex = resourceIndex;
    this.options = options;
  }
}

/** Opaque reusable drawing-parameter resource owned by one `OFDDocument`. */
export class OFDDrawParam {
  /** @internal */
  readonly documentIdentity: object;
  /** @internal */
  readonly resourceIndex: number;
  /** Frozen registered drawing-parameter options. */
  readonly options: Readonly<OFDDrawParamOptions>;

  /**
   * Creates an internal drawing-parameter handle.
   *
   * @param documentIdentity - Owning document identity.
   * @param resourceIndex - Stable registration index.
   * @param options - Frozen drawing-parameter options.
   */
  constructor(
    documentIdentity: object,
    resourceIndex: number,
    options: Readonly<OFDDrawParamOptions>
  ) {
    this.documentIdentity = documentIdentity;
    this.resourceIndex = resourceIndex;
    this.options = options;
  }
}
