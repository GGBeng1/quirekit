/** Renderer-neutral semantic role declared by an external layout provider. */
export type QuireLayoutProviderSemanticRole =
  | "document"
  | "section"
  | "group"
  | "blockquote"
  | "columns"
  | "table"
  | "row"
  | "cell"
  | "figure"
  | "object"
  | "text-box"
  | "text"
  | "media"
  | "embed"
  | "control"
  | "widget";

/** Search policy declared for one exact retained owner. */
export type QuireLayoutProviderSearchPolicy =
  | {
      /** Uses text from the exact retained source range. */
      readonly kind: "source-text";
    }
  | {
      /** Uses provider-declared text instead of source document text. */
      readonly kind: "metadata";
      /** Searchable human-readable text. */
      readonly text: string;
      /** Optional additional searchable terms. */
      readonly keywords?: readonly string[] | undefined;
    }
  | {
      /** Explicitly excludes this owner from search consumers. */
      readonly kind: "excluded";
      /** Human-readable reason for the exclusion. */
      readonly reason: string;
    };

/** Semantic facts attached to a framework-owned provider region. */
export interface QuireLayoutProviderSemanticDescriptor {
  /** Renderer-neutral role represented by the exact retained owner. */
  readonly role: QuireLayoutProviderSemanticRole;
  /** Optional accessible label that does not replace source text. */
  readonly label?: string | undefined;
  /** Optional longer accessible description. */
  readonly description?: string | undefined;
  /** Explicit search behavior for this owner. */
  readonly search: QuireLayoutProviderSearchPolicy;
}
