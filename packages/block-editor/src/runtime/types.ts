import type {
  Editor,
  QuireAnyExtension,
  QuireEditorOptions,
  QuireMountedEditorView
} from "@quirekit/core";
import type { HtmlMountedViewRuntimeOptions } from "@quirekit/view-html";
import type { BlockEditorPresetOptions } from "../preset";
import type { BlockEditorLocale, BlockLocaleListener } from "../localization/types";

/** Creation options for one continuous-flow Block Editor document session. */
export interface BlockEditorOptions
  extends Omit<QuireEditorOptions, "element" | "mode" | "extensions"> {
  /** Optional initial host; omit it to create an unmounted document session. */
  readonly element?: HTMLElement;
  /** Generic profile options, or false to supply all semantic extensions. */
  readonly preset?: BlockEditorPresetOptions | false;
  /** Core extensions configured per instance; replace conflicts through preset options. */
  readonly extensions?: readonly QuireAnyExtension[];
  /** Continuous HTML presentation settings, with no pagination configuration. */
  readonly view?: HtmlMountedViewRuntimeOptions;
  /** Initial interface language, independent of document content; defaults to Chinese. */
  readonly locale?: BlockEditorLocale;
}

/** Product lifecycle around a single canonical Core editor and HTML view. */
export interface BlockEditorInstance {
  /** Canonical commands, events, document state, serialization, and editability. */
  readonly editor: Editor;
  /** Current interface language for this session. */
  readonly locale: BlockEditorLocale;
  /** @param locale - Next language; preserves document, view, selection and history. */
  setLocale(locale: BlockEditorLocale): void;
  /** @param listener - Presentation observer. @returns Subscription release. */
  onLocaleChange(listener: BlockLocaleListener): () => void;
  /**
   * Replaces the product's mounted surface while preserving document and history.
   *
   * @param element - Host element owned by the consuming application.
   * @returns Primary HTML view owned by this editor session.
   */
  mount(element: HTMLElement): QuireMountedEditorView;
  /** Releases mounted surfaces while preserving the Core document session. */
  unmount(): void;
  /** Destroys the document session, views, and extension lifecycle once. */
  destroy(): void;
}
