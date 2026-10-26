import type { Editor, QuireJSONContent, Range, QuireNodeViewRendererProps, QuireViewMutationRecord } from "@quirekit/core";
import type { Node as PMNode } from "@quirekit/pm";
/** Product authoring tasks sharing the captured document target. */
export type RichContentKind = "columns" | "template" | "webCard" | "embed" | "attachment" | "audio" | "video" | "imageGallery";
/** A deferred task cannot silently move to a later selection. */
export interface RichContentRequest {
  /** Original immutable document. */ readonly doc: PMNode;
  /** Intended operation. */ readonly kind: RichContentKind;
  /** Exact insertion or replacement boundary. */ readonly range: Range;
  /** Existing node when editing. */ readonly node?: PMNode;
}
/** A persistent file or image, independent of upload/playback state. */
export interface BlockResource {
  /** Stable identity within its collection. */ readonly id: string;
  /** Portable data URL or HTTP(S) source. */ readonly src: string;
  /** Readable file name. */ readonly name: string;
  /** Declared MIME type. */ readonly mime: string;
  /** Known file size in bytes. */ readonly size?: number;
  /** Authored image description. */ readonly alt?: string;
}
/** Optional host-owned storage and metadata; absent services use explicit local defaults. */
export interface BlockRichContentOptions {
  /** Maximum bytes per local file; default 4 MiB. */ readonly maxFileSize: number;
  /** Stores a file, honoring cancellation; must return a persistent source. */
  readonly storeFile?: (file: File, signal: AbortSignal, progress: (percent: number) => void) => Promise<BlockResource>;
  /** Resolves card metadata; browser cross-origin scraping is not implicit. */
  readonly resolveWebCard?: (url: string, signal: AbortSignal) => Promise<{ title?: string; description?: string; icon?: string; cover?: string }>;
}
/** Framework-neutral retained mount consumed by the Vue host. */
export interface RichContentSurface {
  /** Outer owned element. */ readonly dom: HTMLElement;
  /** Portal destination for controls or an atomic resource. */ readonly portal: HTMLElement;
  /** Editable columns; absent for atomic content. */ readonly contentDOM?: HTMLElement;
  /** Canonical session. */ readonly editor: Editor;
  /** @returns Current accepted node. */ snapshot(): PMNode;
  /** @returns Current position; undefined after disposal. */ position(): number | undefined;
  /** @param node - Accepted source. @returns Whether the mount can stay. */ update(node: PMNode): boolean;
  /** @param event - Browser event. @returns Whether controls own the event. */ stopEvent(event: Event): boolean;
  /** @param mutation - DOM change. @returns Whether the product owns this change. */ ignoreMutation(mutation: QuireViewMutationRecord): boolean;
  /** Releases the portal and invalidates pending work. */ destroy(): void;
}
/** Factory installed before the HTML view mounts. */
export type RichContentRenderer = (props: QuireNodeViewRendererProps) => RichContentSurface;
/** Template data remains ordinary editable nodes after insertion. */
export interface BlockContentTemplate {
  /** Stable library identity. */ readonly id: string;
  /** User-visible label. */ readonly name: string;
  /** One short purpose, not internal implementation text. */ readonly description: string;
  /** Complete canonical blocks. */ readonly content: readonly QuireJSONContent[];
}
