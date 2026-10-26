/** Built-in local diagram languages. */
export type TextDiagramLanguage = "mermaid" | "plantuml" | "dot";

/** Source is the sole editable authority; preview pixels are derived. */
export interface TextDiagramSource {
  /** Accepted grammar, never inferred from source text. */ readonly language: TextDiagramLanguage;
  /** Exact Unicode source, including user whitespace. */ readonly source: string;
  /** Host revision incremented once per accepted save. */ readonly revision: number;
}
/** Portable inert image, suitable for document content and fixed layout. */
export interface TextDiagramPreview {
  /** Self-contained PNG, without network access. */ readonly dataUrl: string;
  /** Intrinsic raster width. */ readonly width: number;
  /** Intrinsic raster height. */ readonly height: number;
}
/** Versioned object retained by structured document hosts. */
export interface TextDiagramEmbed {
  /** Stable protocol discriminator. */ readonly type: "quirekit-text-diagram";
  /** Envelope version. */ readonly version: 1;
  /** Host object identity. */ readonly id: string;
  /** Plain accessible name. */ readonly title: string;
  /** Editable source and its host revision. */ readonly document: TextDiagramSource;
  /** Exact-source preview; absent on an uncommitted new draft. */ readonly preview: TextDiagramPreview | null;
}
/** SVG bound to an immutable source snapshot. */
export interface TextDiagramSnapshot {
  /** Exact rendered grammar. */ readonly language: TextDiagramLanguage;
  /** Exact rendered source. */ readonly source: string;
  /** Sanitized static SVG. */ readonly svg: string;
  /** Natural width in CSS pixels. */ readonly width: number;
  /** Natural height in CSS pixels. */ readonly height: number;
}
/** Frozen source and its raster; hosts commit both together. */
export interface TextDiagramRaster extends TextDiagramPreview {
  /** Exact rendered grammar. */ readonly language: TextDiagramLanguage;
  /** Exact rendered source. */ readonly source: string;
}
/** A host's atomic acceptance decision. */
export type TextDiagramCommitResult = "saved" | "conflict" | "readonly" | "missing";
/** A mapped host target; UI never writes the host directly. */
export interface TextDiagramEditRequest {
  /** Detached baseline. */ readonly document: TextDiagramEmbed;
  /** @param document - Complete proposed source and preview. @returns Atomic acceptance. */
  readonly commit: (document: TextDiagramEmbed) => TextDiagramCommitResult;
  /** Releases the mapped target without modifying content. */ readonly release: () => void;
}
/** A real editable example in a named grammar. */
export interface TextDiagramTemplate {
  /** Stable template identity. */ readonly id: string;
  /** Visible name in the requested language. */ readonly label: string;
  /** Diagram grammar. */ readonly language: TextDiagramLanguage;
  /** Actual source consumed by the rendering engine. */ readonly source: string;
}
