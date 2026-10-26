/** File families have visual identities, not upload or security semantics. */
export type QuireKitFileKind = 'document' | 'spreadsheet' | 'presentation' | 'pdf' | 'ofd' | 'image' | 'video' | 'audio' | 'archive' | 'code' | 'web' | 'markdown' | 'text' | 'design' | 'font' | 'file';

/** Metadata used for presentation only; never validates file contents. */
export interface QuireKitFileIconProps {
  /** Filename used to identify a familiar extension, case-insensitively. */
  readonly name?: string | undefined;
  /** MIME fallback for names without a recognized extension. */
  readonly mediaType?: string | undefined;
  /** Explicit host classification, taking precedence over filename and MIME. */
  readonly kind?: QuireKitFileKind | undefined;
  /** Icon width in pixels; height preserves the document silhouette. */
  readonly size?: number | undefined;
  /** Optional accessible name; omitted when accompanying a visible filename. */
  readonly label?: string | undefined;
}

/** Resolved presentation independent of Vue and native File objects. */
export interface QuireKitFileIdentity {
  /** Stable color family. */
  readonly kind: QuireKitFileKind;
  /** Short non-color identifier on the file silhouette. */
  readonly badge: string;
}
