/** Shared persistent identity and presentation for semantic annotations. */
export interface MindMapAnnotationBase {
  /** Document-local annotation identity, separate from topic identities. */ readonly id: string;
  /** Literal caption, at most 160 UTF-16 code units. */ readonly text: string;
  /** Explicit six-digit color; absence follows the host theme. */ readonly color?: string;
}

/** Directed relationship between two existing topics. */
export interface MindMapRelation extends MindMapAnnotationBase {
  /** Discriminator. */ readonly kind: "relation";
  /** Starting topic identity. */ readonly from: string;
  /** Different ending topic identity. */ readonly to: string;
}

/** Semantic grouping following topic identities across structural moves. */
export interface MindMapTopicGroup extends MindMapAnnotationBase {
  /** Bracket with caption, or enclosing frame. */ readonly kind: "summary" | "boundary";
  /** Unique members; their visible descendants participate in geometry. */ readonly topicIds: readonly string[];
}

/** Renderer-neutral annotation whose geometry is always derived. */
export type MindMapAnnotation = MindMapRelation | MindMapTopicGroup;
