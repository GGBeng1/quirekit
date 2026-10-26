export * from "./source-flow";
export type { QuireTerminalRegionConstraint, QuireTerminalPlacement } from "./terminal";
export type { QuirePaginationReferenceFacts, QuirePaginationOccurrenceFacts } from "./reference-types";
export { resolveQuireAcceptedSourceFlowBand } from "./accepted-source-band";
export {
  QuireRetainedPaginationCheckpointStore,
  createQuirePaginationCheckpointStore,
  readQuirePreparedPaginationResult,
  writeQuirePreparedPaginationResult
} from "./cache";
export {
  createQuirePaginationCheckpoint,
  createQuirePaginationItemAnchor,
  findQuirePaginationCheckpointConvergence,
  getQuirePaginationCheckpointEndInfo,
  isQuirePaginationItemAnchorAligned,
  rebaseQuirePaginationCheckpoint
} from "./checkpoint";
export { paginateQuireMeasuredContainer } from "./container";
export { resolveQuirePageGeometryForIndex, createQuirePaginationGeometryKey, createQuirePaginatedDocumentRect } from "./geometry";
export { groupQuireTextFragmentsIntoLines } from "./lines";
export {
  findQuirePageBodyProjectionForRange,
  findQuirePageBodyProjectionIntersectingRange
} from "./ranges";
export { driveQuireMeasuredContainerPages } from "./page-driver";
export { appendQuireEndNotes } from "./end-notes";
export { createQuirePaginationQueryIndex } from "./query-index";
export { createQuireMeasuredRowLineSlices } from "./row-measurement";
export {
  doesQuireTextFragmentBaselineBelongToFlowBand,
  doesQuireTextFragmentBaselineBelongToRectY,
  doesQuireTextFragmentStartInFlowBand,
  resolveQuireTextFragmentFlowOffsetY
} from "./text-ownership";
export type { QuireAcceptedSourceFlowBand } from "./accepted-source-band";
export type { QuirePaginationCheckpointStoreCounters } from "./cache";
export type {
  QuirePaginationCheckpoint,
  QuirePaginationCheckpointConvergence,
  QuirePaginationCheckpointDelta,
  QuirePaginationCheckpointReusePlan,
  QuirePaginationCheckpointStore,
  QuirePaginationCheckpointStoreReadOptions,
  QuirePaginationCheckpointStoreWriteOptions,
  QuirePaginationItemAnchor,
  QuirePaginationPageRecord
} from "./checkpoint";
export type {
  QuireMeasuredContainer,
  QuireMeasuredContainerAcceptedResult,
  QuireMeasuredContainerBacktrackResult,
  QuireMeasuredContainerBreakAfter,
  QuireMeasuredContainerBreakBefore,
  QuireMeasuredContainerDoneResult,
  QuireMeasuredContainerItem,
  QuireMeasuredContainerPageLeadingBand,
  QuireMeasuredContainerPaginationOptions,
  QuireMeasuredContainerPaginationResult,
  QuireMeasuredContainerPlaceAndOverflowResult,
  QuireMeasuredContainerNote,
  QuirePageNote,
  QuireMeasuredContainerSourceFragment,
  QuireMeasuredContainerSourceFragmentKind,
  QuireMeasuredContainerSpillResult
} from "./container";
export type {
  QuirePageBodyRectVariants,
  QuirePageColumn,
  QuirePageColumnTemplate,
  QuirePageGeometry,
  QuireResolvedPageGeometry,
  QuirePaginationGeometryKeyOptions
} from "./geometry";
export type {
  QuireMeasuredContainerDriveContinuation,
  QuireMeasuredContainerDriveResult,
  QuireMeasuredContainerPageDriveOptions
} from "./page-driver";
export type {
  QuirePaginationQueryIndex,
  QuirePaginationSourceFragmentMatch
} from "./query-types";
export type {
  QuireMeasuredRowGeometry,
  QuireMeasuredRowLineFlowBand,
  QuireMeasuredRowLineInput,
  QuireMeasuredRowLineSlice
} from "./row-measurement";
export type { QuireTextLineGroup } from "./lines";
export type { QuireDocumentRangePageOwner } from "./ranges";
export type { QuireTextOwnershipBand } from "./text-ownership";
export type { QuireEndNotePlacementOptions } from "./end-notes";
export type { QuireEndNoteArea, QuirePageColumnFragment, QuirePageEndInfo, QuirePageFragment } from "./types";
