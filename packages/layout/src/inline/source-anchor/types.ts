import type {
  QuireDocumentPosition,
  QuireDocumentRange
} from "@quirekit/renderer";

/** Logical non-text inline source retained before visual-instance compilation. */
export interface QuireInlineSourceAnchor {
  /** Snapshot-stable source id derived from the owning textblock and child offset. */
  readonly id: string;
  /** Document node type represented by this source anchor. */
  readonly nodeType: string;
  /** Exact source document range occupied by the inline node. */
  readonly range: QuireDocumentRange;
  /** Logical source position used to resolve shared caret-derived geometry. */
  readonly position: QuireDocumentPosition;
  /** Boundary affinity used when adjacent text exposes two valid caret stops. */
  readonly affinity: "before" | "after";
}
