import type { ImageUploadContext, ImageUploader, ImageUploadSource } from "@quirekit/msfe-image";

/** Why an image is being stored; the MSFE image upload protocol. */
export type MdImageUploadSource = ImageUploadSource;

/** One upload request; the MSFE image upload protocol. */
export type MdImageUploadContext = ImageUploadContext;

/** Host image storage: new images are written to Markdown as the returned address instead of inline data. Same contract as MSFE's `ImageUploader`. */
export type MdImageStorage = ImageUploader;
