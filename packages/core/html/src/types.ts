import type { QuireAnyExtension, QuireJSONContent } from "@quirekit/core";
import type { ParseOptions } from "@quirekit/pm";

/** Extensions used to create the schema for HTML parse/serialize helpers. */
export type QuireHTMLExtensions = readonly QuireAnyExtension[];

/** JSON content accepted by HTML serialization helpers. */
export type QuireHTMLJSONContent = QuireJSONContent;

/** Options passed to HTML parse helpers. */
export type QuireHTMLParseOptions = ParseOptions;

/** DOM document provider used by serializer helpers. */
export interface QuireHTMLDocumentProvider {
  /** DOM document used by ProseMirror DOM serializer/parser calls. */
  readonly document: Document;
}

/** Disposable DOM environment used by server helpers. */
export interface QuireHTMLDocumentScope extends QuireHTMLDocumentProvider {
  /**
   * Releases any resources held by the document provider.
   */
  dispose(): void;
}
