import type { EditorState, SelectionRange, TransactionSpec } from "@quirekit/cm-state";
import type { SyntaxNode } from "@lezer/common";

/** Semantic gestures mapped from Enter, Shift-Enter and Mod-Enter. */
export type BlockInputIntent = "enter" | "lineBreak" | "exit";

/** One atomic source edit, delegation to an ancestor, or native keyboard fallback. */
export type BlockInputResult = TransactionSpec | "parent" | "native";

/** A selection endpoint and the current syntax owner resolved by the shared router. */
export interface BlockInputTarget {
  /** Original full range, retaining selection direction. */
  readonly range: SelectionRange;
  /** Endpoint in the unchanged source document. */
  readonly position: number;
  /** Nearest participating block for this endpoint. */
  readonly node: SyntaxNode;
}

/** Immutable whole-selection input; handlers plan without dispatching or mutating storage. */
export interface BlockInputContext {
  /** Canonical source state before any input changes. */
  readonly state: EditorState;
  /** Requested semantic keyboard gesture. */
  readonly intent: BlockInputIntent;
  /** All endpoints, resolved to owners sharing this handler; nonempty ranges contribute both ends. */
  readonly targets: readonly BlockInputTarget[];
}

/** @param context - Validated whole-selection input. @returns A pure decision for the entire gesture. */
export type BlockInputHandler = (context: BlockInputContext) => BlockInputResult;

/** A planner or a fixed ownership decision, requiring no per-key callback. */
export type BlockInputBehavior = BlockInputHandler | "parent" | "native";

/** Unique syntax ownership; omitted intents delegate, while unregistered block nodes stop routing. */
export interface BlockInputRule {
  /** Exact syntax node names owned by this declaration. */
  readonly nodes: readonly string[];
  /** Enter behavior, decided from current source rather than a key-press counter. */
  readonly enter?: BlockInputBehavior;
  /** Shift-Enter behavior for an explicit line break. */
  readonly lineBreak?: BlockInputBehavior;
  /** Mod-Enter behavior for leaving a block. */
  readonly exit?: BlockInputBehavior;
}
