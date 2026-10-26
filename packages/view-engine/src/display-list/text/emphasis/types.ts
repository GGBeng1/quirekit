import type { QuireDocumentRange } from "@quirekit/renderer";

/** Geometry for one visible grapheme receiving an emphasis mark. */
export interface EmphasisMarkTarget {
  /** Document range represented by the grapheme. */
  readonly range: QuireDocumentRange;
  /** Horizontal center in document-layout coordinates. */
  readonly centerX: number;
}
