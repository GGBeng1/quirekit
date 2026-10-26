/** QR error correction level passed directly to the installed encoder. */
export type QuireKitQRCodeErrorCorrection = 'L' | 'M' | 'Q' | 'H';
/** Supported lossless QR code export formats. */
export type QuireKitQRCodeFormat = 'png' | 'svg';
/** Availability of the current, unmodified content. */
export type QuireKitQRCodeStatus = 'empty' | 'ready' | 'error';

/** Public static QR image configuration. */
export interface QuireKitQRCodeProps {
  /** Exact text to encode; an empty string displays feedback instead of a symbol. */
  readonly value: string;
  /** Accessible image name describing the content or intended scan task. */
  readonly label: string;
  /** Square image size in CSS pixels, including the quiet zone; defaults to 160. */
  readonly size?: number;
  /** Error correction level; defaults to M. */
  readonly errorCorrection?: QuireKitQRCodeErrorCorrection;
}

/** Browser download configuration. */
export interface QuireKitQRCodeDownloadOptions {
  /** Lossless image format; defaults to png. */
  readonly format?: QuireKitQRCodeFormat;
  /** Download filename including extension; defaults to qr-code plus format extension. */
  readonly fileName?: string;
}

/** Export operations available to host actions. */
export interface QuireKitQRCodeActionsSlotProps {
  /** Current content availability; disable export actions unless ready. */
  readonly status: QuireKitQRCodeStatus;
  /**
   * Exports the mounted symbol using Ark's SVG and raster conversion.
   * @param format - Lossless image format; defaults to png.
   * @returns A data URL, or a rejection when no mounted symbol is available.
   */
  readonly getDataUrl: (format?: QuireKitQRCodeFormat) => Promise<string>;
  /**
   * Starts a browser download of the mounted symbol.
   * @param options - Format and filename configuration.
   * @returns Completion of the download request; rejection is handled by the host.
   */
  readonly download: (options?: QuireKitQRCodeDownloadOptions) => Promise<void>;
}

/** QR code host composition slots. */
export interface QuireKitQRCodeSlots {
  /**
   * Optional actions outside the scan area, such as public Button downloads.
   * @param props - Current availability and mounted export operations.
   * @returns Host action content.
   */
  readonly actions?: (props: QuireKitQRCodeActionsSlotProps) => unknown;
}
