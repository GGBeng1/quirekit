import type { WhiteboardDocument, WhiteboardDiagramPatch } from "@quirekit/whiteboard";

/** Agent input locating one current source revision. */
export interface WhiteboardAgentUpdate extends WhiteboardDiagramPatch {
  /** Whiteboard identity from the read view. */ readonly id: string;
  /** Expected source revision from the read view. */ readonly revision: number;
}

/** Prepared value with a captured compare-and-swap baseline. */
export interface PreparedWhiteboardUpdate {
  /** Proposed complete next source and matching PNG. */ readonly document: WhiteboardDocument;
  /** Exact serialized baseline, checked again after asynchronous preparation. */ readonly expected: string;
}
