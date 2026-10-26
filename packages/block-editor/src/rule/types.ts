import type { Editor } from "@quirekit/core";
import type { Node } from "@quirekit/pm";

/** Exact selected rule, retained while a control owns native focus. */
export interface BlockRuleTarget {
  /** Accepted immutable document. */ readonly doc: Node;
  /** Position before the rule. */ readonly pos: number;
  /** Canonical rule node. */ readonly node: Node;
}

/** Public toolbar renderer context for rule controls. */
export interface BlockRuleContext {
  /** Canonical command owner. */ readonly editor: Editor;
  /** Selected source, never substituted by a later unrelated selection. */ readonly target: BlockRuleTarget;
}
