export { combineProofingProviders } from "./combine/provider";
export { Proofing } from "./extension";
export { normalizeProofingWord } from "./plugin/issues";
export {
  getProofingIssueAt,
  getProofingIssues,
  getProofingSnapshot,
  hasProofing,
  proofingPluginKey
} from "./plugin/state";
export { getProofingController } from "./session/registry";
export { createWordListProofingProvider } from "./word-list/provider";
export type {
  CombinedProofingOptions,
  ProofingAppearance,
  ProofingBlockContext,
  ProofingCapabilities,
  ProofingCheckRequest,
  ProofingCheckResult,
  ProofingCommandMethods,
  ProofingController,
  ProofingDictionaryStore,
  ProofingDocumentPolicy,
  ProofingError,
  ProofingExtensionOptions,
  ProofingInlineRole,
  ProofingIssue,
  ProofingIssueKind,
  ProofingLanguageSlots,
  ProofingProvider,
  ProofingProviderIssue,
  ProofingRange,
  ProofingSegment,
  ProofingSnapshot,
  ProofingStatus,
  ProofingSuggestRequest,
  ProofingSurface,
  ProofingWordEngine,
  ProofingWordListOptions
} from "./types";
