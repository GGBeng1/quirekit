import type { QuireDocumentRange } from "@quirekit/renderer";

/** Mapped descriptor range and ownership validity. */
export interface HtmlMappedRange {
  /** Range expressed in next-document coordinates. */
  readonly range: QuireDocumentRange;
  /** Whether transaction deletion removed descriptor ownership. */
  readonly invalid: boolean;
}
