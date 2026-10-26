import type { MindMapAnnotation } from "../annotations/types";
import type { MindMapDetailsPatch } from "../details/types";

/** Explicit fields bound to a stable set of topic identities. */
export interface MindMapTopicContentUpdate {
  /** Captured topic identities, independent of later selection. */
  readonly ids: readonly string[];
  /** Explicit changed fields; null clears the topic content. */
  readonly patch: MindMapDetailsPatch | null;
}

/** Captured content edits published as one validated source change. */
export interface MindMapContentUpdate {
  /** Explicit topic fields; entries are applied in order to stable identities. */
  readonly details?: MindMapTopicContentUpdate[];
  /** Complete semantic annotations to insert or replace. */
  readonly annotations?: readonly MindMapAnnotation[];
}
