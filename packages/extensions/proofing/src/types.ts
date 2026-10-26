import type { QuireEditor } from "@quirekit/core";
import type { EditorState, Node as PMNode } from "@quirekit/pm";

/** Category of a proofing finding. */
export type ProofingIssueKind = "spelling" | "grammar" | "style";

/** Document area a checked segment belongs to. */
export type ProofingSurface =
  | "body"
  | "header"
  | "footer"
  | "note"
  | "table-cell"
  | "comment"
  | "text-box"
  | "other";

/** How one inline node takes part in proofing text. */
export type ProofingInlineRole =
  /** Text is checked. */
  | "check"
  /** Not checked and always separates words, such as images, fields, or hidden text. */
  | "boundary"
  /** Not checked and does not separate words, such as zero-width markers or tracked deletions. */
  | "transparent";

/** Lifecycle status reported to product UI. */
export type ProofingStatus =
  /** Proofing is off or has no provider. */
  | "disabled"
  /** Every checkable block has a current result. */
  | "idle"
  /** At least one request is running or waiting. */
  | "checking"
  /** At least one request failed or timed out since the last success. */
  | "degraded"
  /** The issue limit was reached and further issues are not shown. */
  | "limited";

/** One run of same-language text handed to a provider. */
export interface ProofingSegment {
  /** Identity unique within one request; not stable across requests. */
  readonly id: string;
  /** Text to check; offsets in results are UTF-16 code units into this string. */
  readonly text: string;
  /** BCP 47 language tag, or null when unknown. */
  readonly language: string | null;
  /** Document area owning the text. */
  readonly surface: ProofingSurface;
  /**
   * Whether the segment starts its paragraph; a segment after other-language text
   * starts mid-sentence, so sentence-start rules do not apply to it.
   */
  readonly startsBlock: boolean;
}

/** Input of one provider check. */
export interface ProofingCheckRequest {
  /** Segments to check, in document order. */
  readonly segments: readonly ProofingSegment[];
  /** Language used for segments whose language is null. */
  readonly defaultLanguage: string | null;
  /** Upper bound for suggestions returned with each issue. */
  readonly maxSuggestions: number;
  /** Aborted when the result is no longer wanted or the request timed out. */
  readonly signal: AbortSignal;
}

/** One finding returned by a provider, relative to its segment. */
export interface ProofingProviderIssue {
  /** Segment the offsets refer to. */
  readonly segmentId: string;
  /** First UTF-16 offset of the finding. */
  readonly start: number;
  /** UTF-16 offset after the finding; greater than `start`. */
  readonly end: number;
  /** Finding category. */
  readonly kind: ProofingIssueKind;
  /** Optional explanation shown to the user. */
  readonly message?: string | undefined;
  /** Optional replacements, best first; omit to request them lazily through `suggest`. */
  readonly replacements?: readonly string[] | undefined;
  /** Optional provider rule identity. */
  readonly ruleId?: string | undefined;
}

/** Output of one provider check. */
export interface ProofingCheckResult {
  /** Findings for any of the requested segments. */
  readonly issues: readonly ProofingProviderIssue[];
}

/** Input of one lazy suggestion request. */
export interface ProofingSuggestRequest {
  /** Flagged text. */
  readonly text: string;
  /** Language of the flagged text, or null when unknown. */
  readonly language: string | null;
  /** Finding category. */
  readonly kind: ProofingIssueKind;
  /** Provider rule identity, when the finding carried one. */
  readonly ruleId?: string | undefined;
  /** Upper bound for returned suggestions. */
  readonly maxSuggestions: number;
  /** Aborted when the menu closes or the document changes. */
  readonly signal: AbortSignal;
}

/** Static facts a provider declares about itself. */
export interface ProofingCapabilities {
  /** Finding categories the provider can report. */
  readonly issueKinds: readonly ProofingIssueKind[];
  /**
   * Reports whether text in a language is worth sending.
   *
   * @param language - BCP 47 tag of a segment.
   * @returns Whether the provider checks that language.
   */
  readonly supportsLanguage?: ((language: string) => boolean) | undefined;
  /** Whether document text leaves the device. */
  readonly requiresNetwork?: boolean | undefined;
}

/** Replaceable proofing engine; it only inspects text and never edits the document. */
export interface ProofingProvider {
  /** Stable provider identity used in caches and diagnostics. */
  readonly id: string;
  /**
   * Declares what the provider supports.
   *
   * @returns Capabilities, read once per provider.
   */
  readonly getCapabilities?: (() => ProofingCapabilities) | undefined;
  /**
   * Checks segments; must honor `request.signal` but is cut off by a timeout either way.
   *
   * @param request - Segments and limits.
   * @returns Findings relative to the segments.
   */
  readonly check: (request: ProofingCheckRequest) => Promise<ProofingCheckResult>;
  /**
   * Produces replacements for a finding that was returned without any.
   *
   * @param request - Flagged text and limits.
   * @returns Replacements, best first.
   */
  readonly suggest?: ((request: ProofingSuggestRequest) => Promise<readonly string[]>) | undefined;
  /**
   * Shares the user dictionary so suggestions can use it; findings are filtered by the extension regardless.
   *
   * @param words - Every user dictionary word.
   */
  readonly setUserWords?: ((words: readonly string[]) => void | Promise<void>) | undefined;
  /** Releases workers, connections, or memory. */
  readonly dispose?: (() => void | Promise<void>) | undefined;
}

/** Word-level engine such as a Hunspell dictionary, adapted into a provider by the extension. */
export interface ProofingWordEngine {
  /** Stable engine identity. */
  readonly id: string;
  /**
   * Reports whether a language has a dictionary.
   *
   * @param language - BCP 47 tag.
   * @returns Whether `isCorrect` and `suggest` accept the language.
   */
  readonly supportsLanguage: (language: string) => boolean;
  /**
   * Tests words of one language.
   *
   * @param words - Distinct words.
   * @param language - BCP 47 tag accepted by `supportsLanguage`.
   * @param signal - Abort signal of the owning request.
   * @returns One verdict per word, in order.
   */
  readonly isCorrect: (
    words: readonly string[],
    language: string,
    signal: AbortSignal
  ) => Promise<readonly boolean[]>;
  /**
   * Suggests replacements for one misspelled word.
   *
   * @param word - Misspelled word.
   * @param language - BCP 47 tag accepted by `supportsLanguage`.
   * @param signal - Abort signal of the owning request.
   * @returns Replacements, best first.
   */
  readonly suggest: (word: string, language: string, signal: AbortSignal) => Promise<readonly string[]>;
  /**
   * Replaces the engine's user word list.
   *
   * @param words - Every user dictionary word.
   */
  readonly setUserWords?: ((words: readonly string[]) => void | Promise<void>) | undefined;
  /** Releases engine resources. */
  readonly dispose?: (() => void | Promise<void>) | undefined;
}

/** Tokenization rules used when adapting a word engine. */
export interface ProofingWordListOptions {
  /** Skips words written entirely in capitals, such as acronyms. Defaults to true. */
  readonly ignoreUppercase?: boolean | undefined;
  /** Skips words containing digits. Words made only of digits are always skipped. Defaults to true. */
  readonly ignoreWordsWithNumbers?: boolean | undefined;
  /** Cached verdicts kept per language before the cache is cleared. Defaults to 20000. */
  readonly maxCachedWords?: number | undefined;
}

/** Resolved run language for each Word script slot. */
export interface ProofingLanguageSlots {
  /** Language of Latin and other non-complex scripts. */
  readonly latin?: string | null | undefined;
  /** Language of East Asian scripts. */
  readonly eastAsia?: string | null | undefined;
  /** Language of right-to-left complex scripts. */
  readonly complexScript?: string | null | undefined;
}

/** Textblock being extracted. */
export interface ProofingBlockContext {
  /** Document owning the textblock. */
  readonly doc: PMNode;
  /** Textblock node. */
  readonly node: PMNode;
  /** Position immediately before the textblock. */
  readonly pos: number;
}

/** Document-model knowledge injected by the host; every member is optional. */
export interface ProofingDocumentPolicy {
  /**
   * Classifies a textblock.
   *
   * @param context - Textblock and its position.
   * @returns Owning area, or null when the block is never checked.
   */
  readonly blockSurface?: ((context: ProofingBlockContext) => ProofingSurface | null) | undefined;
  /**
   * Classifies an inline node; text nodes default to `check` and other inline nodes to `boundary`.
   *
   * @param node - Inline node inside the textblock.
   * @param context - Owning textblock.
   * @returns Participation of the node.
   */
  readonly inlineRole?: ((node: PMNode, context: ProofingBlockContext) => ProofingInlineRole) | undefined;
  /**
   * Resolves the effective languages of a text node, including style inheritance.
   *
   * @param node - Text node.
   * @param context - Owning textblock.
   * @returns Language per script slot.
   */
  readonly languages?: ((node: PMNode, context: ProofingBlockContext) => ProofingLanguageSlots) | undefined;
  /**
   * Lists intervals whose text is never checked, such as field results spanning paragraphs.
   *
   * @param state - Current editor state.
   * @returns Sorted, non-overlapping intervals.
   */
  readonly excludedRanges?: ((state: EditorState) => readonly ProofingRange[]) | undefined;
}

/** Half-open document interval. */
export interface ProofingRange {
  /** First position. */
  readonly from: number;
  /** Position after the interval. */
  readonly to: number;
}

/** Host-owned persistent user dictionary. */
export interface ProofingDictionaryStore {
  /**
   * Lists every stored word.
   *
   * @returns Stored words.
   */
  readonly list: () => readonly string[] | Promise<readonly string[]>;
  /**
   * Stores one word.
   *
   * @param word - Word to add.
   */
  readonly add: (word: string) => void | Promise<void>;
  /**
   * Removes one word.
   *
   * @param word - Word to remove.
   */
  readonly remove: (word: string) => void | Promise<void>;
}

/** Failure reported to the host. */
export interface ProofingError {
  /** Failure category. */
  readonly kind: "provider-error" | "timeout" | "validation-error";
  /** Human-readable summary. */
  readonly message: string;
  /** Underlying error, when one was thrown. */
  readonly cause?: unknown;
}

/** Underline colors per finding category. */
export interface ProofingAppearance {
  /** Spelling underline color. */
  readonly spelling: string;
  /** Grammar underline color. */
  readonly grammar: string;
  /** Style underline color. */
  readonly style: string;
}

/** Options of the Proofing extension. */
export interface ProofingExtensionOptions {
  /** Whether checking starts enabled. */
  readonly enabled: boolean;
  /** Engine; checking stays disabled while null. */
  readonly provider: ProofingProvider | null;
  /** Document-model knowledge; defaults treat every textblock as body text. */
  readonly policy: ProofingDocumentPolicy | null;
  /** Language used when a text has none. */
  readonly defaultLanguage: string | null;
  /** Quiet period after an edit before checking. */
  readonly debounceMs: number;
  /** Longest delay while edits keep arriving. */
  readonly maxWaitMs: number;
  /** Longest time one provider request may run. */
  readonly timeoutMs: number;
  /** Requests running at once. */
  readonly maxConcurrentRequests: number;
  /** Segments per request. */
  readonly maxSegmentsPerBatch: number;
  /** UTF-16 characters per request. */
  readonly maxCharactersPerBatch: number;
  /** Suggestions per finding. */
  readonly maxSuggestions: number;
  /** Findings kept for the whole document before reporting `limited`. */
  readonly maxIssues: number;
  /** Persistent user dictionary, or null for session-only ignores. */
  readonly dictionaryStore: ProofingDictionaryStore | null;
  /** Underline colors. */
  readonly appearance: ProofingAppearance;
  /** Receives provider failures, timeouts, and invalid results. */
  readonly onError: ((error: ProofingError) => void) | null;
  /**
   * Resolves the visible document interval checked right after the caret's block.
   *
   * @param editor - Editor owning the mounted view.
   * @returns Visible interval, or null when unknown.
   */
  readonly resolveVisibleRange: ((editor: QuireEditor) => ProofingRange | null) | null;
}

/** One finding in document coordinates. */
export interface ProofingIssue {
  /** Identity unique within the editor session. */
  readonly id: string;
  /** First document position. */
  readonly from: number;
  /** Document position after the finding. */
  readonly to: number;
  /** Finding category. */
  readonly kind: ProofingIssueKind;
  /** Flagged text at the time it was checked. */
  readonly text: string;
  /** Language the text was checked in. */
  readonly language: string | null;
  /** Optional explanation. */
  readonly message?: string | undefined;
  /** Replacements returned with the finding, if any. */
  readonly replacements?: readonly string[] | undefined;
  /** Provider rule identity, if any. */
  readonly ruleId?: string | undefined;
}

/** Proofing summary for product UI. */
export interface ProofingSnapshot {
  /** Whether checking is switched on. */
  readonly enabled: boolean;
  /** Lifecycle status. */
  readonly status: ProofingStatus;
  /** Findings currently kept. */
  readonly issueCount: number;
  /** Increments on every state change. */
  readonly version: number;
}

/** Editor-local asynchronous proofing operations. */
export interface ProofingController {
  /**
   * Returns replacements for a finding, requesting them lazily when needed.
   *
   * @param issue - Finding from the current state.
   * @param signal - Optional abort signal of the caller.
   * @returns Replacements, best first.
   */
  readonly suggest: (issue: ProofingIssue, signal?: AbortSignal) => Promise<readonly string[]>;
  /**
   * Switches to another provider and rechecks the document.
   *
   * @param provider - New provider, or null to stop checking.
   */
  readonly setProvider: (provider: ProofingProvider | null) => void;
}

/** Commands installed by the Proofing extension. */
export interface ProofingCommandMethods<ReturnType> {
  /**
   * Switches checking on or off.
   *
   * @param enabled - Whether to check.
   * @returns Command result.
   */
  readonly setProofingEnabled: (enabled: boolean) => ReturnType;
  /**
   * Rechecks every block.
   *
   * @returns Command result.
   */
  readonly recheckProofing: () => ReturnType;
  /**
   * Replaces a finding's text when the document still holds it.
   *
   * @param issueId - Finding identity.
   * @param replacement - Replacement text.
   * @returns Command result.
   */
  readonly replaceProofingIssue: (issueId: string, replacement: string) => ReturnType;
  /**
   * Hides one finding at its current place.
   *
   * @param issueId - Finding identity.
   * @returns Command result.
   */
  readonly ignoreProofingIssue: (issueId: string) => ReturnType;
  /**
   * Hides every finding of a word for this session.
   *
   * @param word - Word to ignore.
   * @returns Command result.
   */
  readonly ignoreProofingWord: (word: string) => ReturnType;
  /**
   * Adds a word to the user dictionary and hides its findings.
   *
   * @param word - Word to add.
   * @returns Command result.
   */
  readonly addProofingWord: (word: string) => ReturnType;
}

/** Options of a combined provider. */
export interface CombinedProofingOptions {
  /**
   * Receives the failure of one member; findings of the other members are still reported.
   *
   * @param error - Failure of the member.
   * @param provider - Failed member.
   */
  readonly onProviderError?: ((error: ProofingError, provider: ProofingProvider) => void) | undefined;
}
