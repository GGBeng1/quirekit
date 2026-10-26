import type { EditorSelection, EditorState, Extension } from "@quirekit/cm-state";
import type { MsfeEditor, MsfeResult } from "../editor/types";
import type { MsfeMode } from "../state/types";

/** Editable presentation policy; it never changes Markdown or editing permission. */
export type SourceRevealPolicy = "selection" | "hidden";

/** Shared source-reveal timing; input and command decisions still use state.selection. */
export interface SourcePresentation {
  /** Current editor presentation mode. */
  readonly mode: MsfeMode;
  /** Whether recognized syntax is revealed at the selection or stays projected. */
  readonly reveal: SourceRevealPolicy;
  /** Source-reveal selection held during native pointer selection. */
  readonly selection: EditorSelection;
  /** Browser composition currently owns source input. */
  readonly composing: boolean;
  /** A primary-pointer gesture currently holds presentation geometry. */
  readonly selecting: boolean;
}

/** Typed presentation-only setting, independent of source write permission. */
export interface PresentationSetting<T> {
  /** @param initial - Instance preference, also read on explicit document replacement. @returns Installable configuration. */
  extension(initial: () => T): Extension;
  /** @param state - Current source state. @returns Applied value, or undefined when not installed. */
  read(state: EditorState): T | undefined;
  /** @param state - Current source state. @returns Last requested value, including an input-deferred change. */
  requested(state: EditorState): T | undefined;
  /** @param editor - Installed instance. @param value - Validated configuration. @returns Acceptance without document mutation. */
  set(editor: MsfeEditor, value: T): MsfeResult;
}

/** Deterministic work counters; timing belongs to the external browser probe. */
export interface MsfeWorkCounters {
  /** Number of visible projection rebuilds. */
  projections: number;
  /** Total parser nodes visited by visible projection traversal. */
  visitedNodes: number;
  /** Number of decorations produced in the latest rebuild. */
  decorations: number;
  /** Explicit host requests to serialize all Markdown. */
  sourceReads: number;
  /** Accepted navigation geometry reads; cancelled callbacks do no read. */
  readonly navigationMeasurements?: number;
  /** Actual native scroll corrections after asynchronous layout. */
  readonly navigationCorrections?: number;
  /** Actual structural layer evaluations, including discarded command drafts. */
  readonly blockBuilds?: number;
  /** Actual parser nodes visited by declarative layers, including speculative work. */
  readonly layerVisitedNodes?: number;
  /** Shared native syntax comparisons along the current state lineage. */
  readonly syntaxDiffBuilds?: number;
  /** Native chunks visited by shared invalidation, counted separately from feature projection. */
  readonly syntaxDiffChunks?: number;
  /** Previous-tree path checks during shared immutable chunk comparison. */
  readonly syntaxDiffComparisons?: number;
  /** Ordered adopted-range checks during shared syntax invalidation. */
  readonly syntaxDiffReuseChecks?: number;
  /** Adopted-range/unchanged-gap comparisons against exact source changes. */
  readonly syntaxDiffReuseMappings?: number;
  /** Mounted viewport layer rebuilds, excluding unchanged dependencies. */
  readonly inlineLayerBuilds?: number;
  /** Rejected lower-priority replacements in the current projection. */
  readonly projectionConflicts?: number;
}

/** Semantic control glyphs; text content and Markdown punctuation are never replaced. */
export type MsfeIconName = "chevronDown" | "chevronRight" | "ellipsis" | "close";
/** @param name - Semantic glyph. @param document - Mount owner document, including iframe hosts. @returns Non-interactive SVG wrapper. */
export type MsfeIconFactory = (name: MsfeIconName, document: Document) => HTMLElement;
