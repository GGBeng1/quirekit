/** Typed attributes of a plain, native VML text watermark. */
export interface LitAstTextWatermarkAttributes {
  /** Native text discriminator. */
  readonly watermarkType: 'text';
  /** Complete text, including spaces and explicit line breaks. */
  readonly text: string;
  /** Unrotated width in points. */
  readonly widthPt: number;
  /** Unrotated height in points. */
  readonly heightPt: number;
  /** Clockwise degrees. */
  readonly rotation: number;
  /** Single typeface used by all script slots. */
  readonly fontFamily: string;
  /** Point size token; 1pt is the producer's nominal automatic size. */
  readonly fontSize: string;
  /** Solid RGB text fill. */
  readonly fillColor: string;
  /** Text fill opacity from zero through one. */
  readonly opacity: number;
  /** Fits text to its path. */
  readonly fitPath: boolean;
  /** Fits the text to the plain shape boundaries. */
  readonly fitShape: boolean;
  /** Horizontal placement reference. */
  readonly horizontalRelativeTo: 'page' | 'margin';
  /** Vertical placement reference. */
  readonly verticalRelativeTo: 'page' | 'margin';
  /** Native horizontal alignment when no explicit offset is present. */
  readonly horizontalAlignment?: 'left' | 'center' | 'right' | 'inside' | 'outside';
  /** Native vertical alignment when no explicit offset is present. */
  readonly verticalAlignment?: 'top' | 'center' | 'bottom' | 'inside' | 'outside';
  /** Explicit horizontal offset in points; omission means centered. */
  readonly leftPt?: number;
  /** Explicit vertical offset in points; omission means centered. */
  readonly topPt?: number;
  /** Horizontal glyph reflection. */
  readonly flipHorizontal?: boolean;
  /** Vertical glyph reflection. */
  readonly flipVertical?: boolean;
  /** Uniform font weight. */
  readonly bold?: boolean;
  /** Uniform font slant. */
  readonly italic?: boolean;
}
