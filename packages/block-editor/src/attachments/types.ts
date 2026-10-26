/** Persistent attachment presentation; inline is a real inline node. */
export type BlockAttachmentView = "inline" | "card";

/** One committed @ query; acceptance is bound to this immutable document. */
export interface BlockAttachmentQuery {
  /** Source document. */ readonly doc: import("@quirekit/pm").Node;
  /** Trigger's @ position. */ readonly from: number;
  /** Caret after the query. */ readonly to: number;
  /** Name or URL fragment following @. */ readonly query: string;
}
