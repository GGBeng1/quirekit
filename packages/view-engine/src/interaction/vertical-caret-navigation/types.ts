import type { QuireLayoutRegionRef } from "@quirekit/layout/identity";
import type { QuireLayoutQueryProductOwner } from "@quirekit/layout/products";
import type { QuireDocumentPosition, QuireRect } from "@quirekit/renderer";


/** Retained caret candidate used by visual-line keyboard navigation. */
export interface QuireVerticalCaretCandidate {
  /** Document position represented by the candidate. */
  readonly position: QuireDocumentPosition;
  /** Caret rectangle in document coordinates. */
  readonly rect: QuireRect;
  /** Shared visual-line baseline in document coordinates. */
  readonly lineBaseline: number;
  /** Enclosing independent story; absent for ordinary body and nested flow. */
  readonly storyRegion?: QuireLayoutRegionRef | undefined;
  /** Optional retained query-product owner that produced the candidate. */
  readonly queryOwner?: QuireLayoutQueryProductOwner | undefined;
}
