import type { AnyExtension } from "@quirekit/msfe-core";

/** Per-feature overrides or explicit exclusions, with duplicate owners still diagnosed. */
export interface StarterKitOptions {
  /** Heading descriptor, or false to omit it. */
  readonly heading?: AnyExtension | false;
  /** Bold descriptor, or false to omit it. */
  readonly bold?: AnyExtension | false;
  /** Link descriptor, or false to omit it. */
  readonly link?: AnyExtension | false;
  /** Code block descriptor, including component overrides, or false. */
  readonly codeBlock?: AnyExtension | false;
  /** Image descriptor, including source resolver and component overrides, or false. */
  readonly image?: AnyExtension | false;
  /** Emphasis descriptor, or false to omit it. */
  readonly emphasis?: AnyExtension | false;
  /** Inline code descriptor, or false to omit it. */
  readonly inlineCode?: AnyExtension | false;
  /** GFM strikethrough descriptor, or false to omit it. */
  readonly strikethrough?: AnyExtension | false;
  /** Thematic separator descriptor, or false to omit it. */
  readonly horizontalRule?: AnyExtension | false;
  /** Quote body and prefix descriptor, or a host extension with component controls. */
  readonly blockquote?: AnyExtension | false;
  /** Native list-prefix descriptor, or false to omit it. */
  readonly listMarkers?: AnyExtension | false;
  /** Task checkbox descriptor, including Vue/React overrides, or false. */
  readonly taskItem?: AnyExtension | false;
  /** GFM native table presentation, or false to omit it. */
  readonly table?: AnyExtension | false;
  /** Prose entity, escape and break presentation, or false to omit it. */
  readonly textLiterals?: AnyExtension | false;
  /** Folds long base64 data URLs into a size pill without changing the source, or false to omit it. */
  readonly dataUrlFold?: AnyExtension | false;
}
