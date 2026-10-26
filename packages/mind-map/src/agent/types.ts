import type { MindMapLayout } from "../model/types";

/** One topic an Agent creates or changes, addressed by id. */
export interface MindMapDiagramTopicPatch {
  /** Stable topic id; a new id creates the topic. */ readonly id: string;
  /** Literal topic text. */ readonly text?: string;
  /** Parent topic id; required for a new topic, and moves an existing one. */ readonly parent?: string;
  /** Position among the parent's children, counted from 0; new topics default to last. */ readonly index?: number;
  /** Plain note, or null to clear it. */ readonly note?: string | null;
  /** http, https or mailto link, or null to clear it. */ readonly link?: string | null;
  /** Priority marker, or null to clear it. */ readonly marker?: "priority-1" | "priority-2" | "priority-3" | null;
  /** Whether the branch is collapsed. */ readonly collapsed?: boolean;
}

/** Incremental Agent edit of a mind map. */
export interface MindMapDiagramPatch {
  /** Plain title of the embedding. */ readonly title?: string;
  /** Topics to create or change, applied in order. */ readonly topics?: readonly MindMapDiagramTopicPatch[];
  /** Topic ids to delete with their branches; the main topic cannot be deleted. */ readonly remove?: readonly string[];
  /** Whole-map layout. */ readonly layout?: MindMapLayout;
}
