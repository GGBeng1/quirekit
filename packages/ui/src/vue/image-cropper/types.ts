import type { Messages as QuireKitImageCropperMessages } from '../../locale/components/image-cropper';
import type { ImgHTMLAttributes } from 'vue';

/** Normalized fractions removed from the original image edges. */
export interface QuireKitImageCrop {
  /** Fraction removed from the top. */ readonly top: number;
  /** Fraction removed from the right. */ readonly right: number;
  /** Fraction removed from the bottom. */ readonly bottom: number;
  /** Fraction removed from the left. */ readonly left: number;
}
/** Image or viewport dimensions in their owning coordinate space. */
export interface QuireKitImageCropSize {
  /** Width in pixels. */ readonly width: number;
  /** Height in pixels. */ readonly height: number;
}
/** Source crop and its natural image dimensions. */
export interface QuireKitImageCropResult {
  /** Non-destructive source insets. */ readonly crop: QuireKitImageCrop;
  /** Browser-decoded original image dimensions. */ readonly naturalSize: QuireKitImageCropSize;
  /** Rounded size of the retained source pixels. */ readonly outputSize: QuireKitImageCropSize;
}
/** Crop controls and accessible instructions, supplied by the active language. */
export type QuireKitImageCropperLabels = QuireKitImageCropperMessages;
/** Reusable image crop workspace; mounting and persistence belong to the consumer. */
export interface QuireKitImageCropperProps {
  /** Browser-readable original image URL. */ readonly src: string;
  /** Description of the original image. */ readonly alt: string;
  /** Maximum image stage height in CSS pixels, default 360. */ readonly height?: number;
  /** Show ratio, mode, zoom and reset controls, default true. */ readonly toolbar?: boolean;
  /** Show thirds guides, default true. */ readonly grid?: boolean;
  /** Lock the crop frame and move the image underneath, default false. */ readonly fixedCropArea?: boolean;
  /** Disable all edits, default false. */ readonly disabled?: boolean;
  /** Native image CORS setting; omitted by default. */ readonly crossorigin?: ImgHTMLAttributes['crossorigin'];
  /** Native image referrer policy. */ readonly referrerpolicy?: ImgHTMLAttributes['referrerpolicy'];
}
/** Explicit raster export settings. */
export interface QuireKitImageCropExportOptions {
  /** Browser image encoding, default image/png. */ readonly type?: 'image/png' | 'image/jpeg' | 'image/webp';
  /** Lossy encoding quality from 0 to 1, default 0.92. */ readonly quality?: number;
  /** Proportional maximum size, default 4096 by 4096. */ readonly maxSize?: QuireKitImageCropSize;
}
/** Instance methods for consumer-owned confirmation and export. */
export interface QuireKitImageCropperApi {
  /** @returns Current valid source geometry, or null before ready. */ getCrop(): QuireKitImageCropResult | null;
  /** Restores the largest centered crop for the active ratio. */ reset(): void;
  /** @param options - Raster encoding and size limits. @returns Cropped image; rejects when unavailable, stale or blocked. */ getCroppedImage(options?: QuireKitImageCropExportOptions): Promise<Blob>;
}
