import type { AnyExtension, MsfeEditorOptions, InlineBoundaryRule, EditingBoundaryRule } from "@quirekit/msfe-core";
import type { StarterKitOptions } from "@quirekit/msfe-starter-kit";
import type { ContainerOptions } from "@quirekit/msfe-markdown-extras";
import type { ComponentViewRenderer } from "@quirekit/msfe-core";
import type { MdHighlightIconProps } from "./highlight/types";
import type { MdImageStorage } from "./images/types";

/** Marker reveal in rich views: hidden in document view, revealed at the selection in live preview. */
export type MdEditingMode = "document" | "markdown";

/** Four views of one Markdown source: document, live preview, source and the rendered reading view. */
export type MdEditorView = "document" | "preview" | "source" | "reading";

/** Views an editor instance shows itself; the reading view renders the same source outside the editor. */
export type MdEditableView = Exclude<MdEditorView, "reading">;

/** Instance-local product preference, retained across explicit document replacement. */
export interface MdPresentationOptions {
  /** Document hides recognized syntax; Markdown reveals syntax at the selection. */
  readonly editingMode: MdEditingMode;
  /** Hidden inline delimiter policies; custom syntax uses the same shared navigation. */
  readonly inlineBoundaries: readonly InlineBoundaryRule[];
  /** Host boundary declarations override the matching syntax owners in feature defaults. */
  readonly editingBoundaries: readonly EditingBoundaryRule[];
}

/** Mutable instance preference; document content remains owned by MSFE. */
export interface MdPresentationStorage {
  /** Last requested editing experience, including input-deferred changes. */
  editingMode: MdEditingMode;
}

/** Product containers: the common named containers plus the highlight icon control. */
export interface MdContainerOptions extends ContainerOptions {
  /** Host icon control for `::: highlight`; omitted shows a static emoji. */
  readonly highlightIcon: ComponentViewRenderer<MdHighlightIconProps>;
  /** @param emoji - Current icon. @returns Localized accessible action for the icon control. */
  readonly highlightLabel: (emoji: string) => string;
}

/** Public product assembly without a second document model. */
export interface MdEditorExtensionOptions {
  /** Initial view, default document. */
  readonly view?: MdEditableView;
  /** Replace default hidden inline boundary policies; an empty array preserves native navigation. Read once on mount. */
  readonly inlineBoundaries?: readonly InlineBoundaryRule[];
  /** Override boundary rules by syntax owner, or add rules for custom features. Read once on mount. */
  readonly editingBoundaries?: readonly EditingBoundaryRule[];
  /** Replace or omit individual features using normal MSFE descriptors. */
  readonly features?: StarterKitOptions;
  /** Named containers and source-neutral controls, or false to omit containers. */
  readonly containers?: Partial<MdContainerOptions> | false;
  /** Common Markdown extensions, each replaceable or removable; false keeps the base syntax only. */
  readonly extras?: MdExtraOptions | false;
  /** Additional features installed beside the product preset. */
  readonly extensions?: readonly AnyExtension[];
  /** Maps a stored image address to the address shown, such as resolving site-relative paths for another origin; the source is unchanged. */
  readonly imageSource?: MdImageSource;
  /** Stores pasted and dropped images; omitted, they are inlined as `data:` URLs. */
  readonly images?: MdImageStorage;
}

/** An image ready for display: an http(s), blob or data image URL, with an optional release for host-created object URLs. */
export interface MdImageResource {
  /** Displayed address. */
  readonly url: string;
  /** Frees the address once the image leaves the document or a newer result replaces it. */
  readonly release?: () => void;
}

/** Resolves a stored image address for display; the signal aborts when the result is no longer needed. */
export type MdImageSource = (url: string, signal: AbortSignal) => string | MdImageResource | Promise<string | MdImageResource>;

/** Source-native extras; heavy formula and diagram rendering loads only when used. */
export interface MdExtraOptions {
  /** Dollar-delimited inline and display formulas. */ readonly math?: AnyExtension | false;
  /** Closed Mermaid code fences. */ readonly mermaid?: AnyExtension | false;
  /** Closed PlantUML and Graphviz/DOT code fences. */ readonly textDiagram?: AnyExtension | false;
  /** Named and inline footnotes. */ readonly footnotes?: AnyExtension | false;
  /** Terms with one or more definitions. */ readonly definitionList?: AnyExtension | false;
  /** Single-tilde subscript. */ readonly subscript?: AnyExtension | false;
  /** Caret superscript. */ readonly superscript?: AnyExtension | false;
  /** Double-plus inserted/underlined text. */ readonly insertedText?: AnyExtension | false;
  /** Double-equals highlighting. */ readonly highlight?: AnyExtension | false;
  /** Root YAML/TOML metadata retained verbatim. */ readonly frontmatter?: AnyExtension | false;
}

/** Native product factory options; Vue consumers can use the product component instead. */
export interface MdEditorOptions extends Omit<MsfeEditorOptions, "extensions" | "mode">, MdEditorExtensionOptions {}
