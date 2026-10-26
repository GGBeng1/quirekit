import type { QuireKitImageCrop, QuireKitImageCropperLabels, QuireKitImageCropperProps, QuireKitImageCropSize } from './types';
/** One measured source session; changing source or geometry creates a new session. */
export interface CropperSessionProps extends QuireKitImageCropperProps {
  /** Unstyled, decoded original used for browser-consistent SVG raster export. */ readonly sourceImage: HTMLImageElement | null;
  /** Starting source geometry. */ readonly initial: QuireKitImageCrop;
  /** Measured image viewport. */ readonly size: QuireKitImageCropSize;
  /** Resolved output ratio. */ readonly ratio?: number | undefined;
  /** Fully resolved localized copy. */ readonly copy: QuireKitImageCropperLabels;
}
