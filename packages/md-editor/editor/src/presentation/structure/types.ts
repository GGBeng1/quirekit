/** Cumulative work along one immutable editor-state lineage. */
export interface ProseStructureWork {
  /** Parser nodes actually traversed to build Prose roles. */
  visitedNodes: number;
  /** New wrapper values allocated, excluding persistent range mapping. */
  wrappers: number;
}
