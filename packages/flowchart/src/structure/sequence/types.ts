/** Explicit creation intent; its resulting edges remain ordinary editable connections. */
export type SequenceMessageKind = "request" | "reply" | "async" | "self";
/** Combined-fragment annotation operators, without execution semantics. */
export type SequenceFragmentKind = "alt" | "opt" | "loop";
/** Explicit editing of an existing sequence event row. */
export type SequenceEdit = "sequence-insert-before" | "sequence-insert-after" | "sequence-move-up" | "sequence-move-down" | "sequence-remove-message";
/** A message expressed in world time coordinates before reprojection. */
export interface SequenceEvent {
  /** Original connection and styling. */ readonly edge: import("../../model/types").FlowchartEdge;
  /** Sending participant, resolved through an activation if necessary. */ readonly from: import("../../model/types").FlowchartNode;
  /** Receiving participant. */ readonly to: import("../../model/types").FlowchartNode;
  /** Source endpoint world Y. */ readonly sourceY: number;
  /** Target endpoint world Y. */ readonly targetY: number;
  /** Earliest event endpoint. */ readonly y: number;
  /** Time occupied by this event. */ readonly duration: number;
}
/** Concurrent messages sharing an event baseline. */
export interface SequenceRow {
  /** Original slot start, in world pixels. */ readonly y: number;
  /** Reserved time including the next-row gap. */ readonly span: number;
  /** Simultaneous messages, in source order. */ readonly events: readonly SequenceEvent[];
}
