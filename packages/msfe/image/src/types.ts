import type { PictureAgentInput } from "./ai/commands";
/** Host-owned image resource; release belongs to the widget that acquired it. */
export interface MsfeImageResource {
  /** Browser-admitted URL, possibly a host-created object URL. */
  readonly url: string;
  /** Releases host resources after removal or an obsolete asynchronous result. */
  readonly release?: () => void;
}

/** Why an image is being stored; hosts may use it for quotas or naming. */
export type ImageUploadSource = "paste" | "drop" | "dialog" | "docx" | "ai" | "diagram";

/** One upload request. */
export interface ImageUploadContext {
  /** Aborted when the editor or the dialog that started the upload goes away. */ readonly signal: AbortSignal;
  /** Entry point that produced the image. */ readonly source: ImageUploadSource;
  /** Original file name when known. */ readonly name?: string;
}

/** Host image storage: new images are written to Markdown as the returned address instead of inline data. */
export interface ImageUploader {
  /**
   * Stores one image. Failures should be reported by the host; the editor then writes nothing for that image.
   * @param file - Image bytes.
   * @param context - Entry point, name and cancellation.
   * @returns Persistent `http(s)` or site-relative address.
   */
  upload(file: Blob, context: ImageUploadContext): Promise<string>;
  /**
   * Optional reverse lookup for exports: fetches a stored address back as a PNG/JPEG data URI.
   * @param url - Address previously returned by `upload`.
   * @param signal - Export lifetime.
   * @returns Data URI, or null when unavailable.
   */
  resolve?(url: string, signal: AbortSignal): Promise<string | null>;
}

/** Resolves Markdown image destinations and stores pasted or dropped images, without storing host credentials in the document. */
export interface ImageOptions {
  /** Receives a source URL and lifetime signal; the default uses safe browser URLs directly. */
  readonly resolve?: (source: string, signal: AbortSignal) => MsfeImageResource | Promise<MsfeImageResource>;
  /**
   * Stores pasted and dropped images. Omitted: PNG, JPEG, GIF and WebP are inlined as `data:` URLs.
   * `false` leaves paste and drop to the host.
   */
  readonly upload?: ImageUploader | false;
}

/** Validated single-line image data for a source insertion command. */
export interface ImageSource {
  /** Image destination. */
  readonly url: string;
  /** Plain source alternative text. */
  readonly alt: string;
  /** Optional plain title. */
  readonly title?: string;
}

/** Named commands contributed when this feature is installed. */
declare module "@quirekit/msfe-core" {
  interface Commands<ReturnType> {
    /** image feature commands. */
    image: {
    /** @param source - Feature command input. @returns The caller’s result or pending chain. */
    insertImage(source: ImageSource): ReturnType;
    /** @param input - Prepared AI picture. @returns The caller's result or pending chain. */
    insertPicture(input: PictureAgentInput): ReturnType;
    };
  }
}
