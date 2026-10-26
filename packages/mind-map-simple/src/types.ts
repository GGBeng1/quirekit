import type { MindMapOverview } from "./runtime/overview/types";
import type { MindMapDocument, MindMapSnapshot, MindMapLayout, MindMapStructureCommand, MindMapStylePatch, MindMapFormatting, MindMapAnnotation, MindMapTopicDetails, MindMapDetailsPatch, MindMapContentUpdate, MindMapPoint } from "@quirekit/mind-map";
import type { MindMapOutlineEntry } from "./runtime/outline/types";
export type { MindMapOutlineEntry } from "./runtime/outline/types";

export type { MindMapBounds, MindMapOverviewTopic, MindMapOverview } from "./runtime/overview/types";

/** Commands whose persistent fields are admitted by the adapter. */
export type MindMapEditorCommand = "add-child" | "add-sibling" | "add-free" | "remove" | "toggle-collapse" | "edit-text" | "undo" | "redo" | MindMapStructureCommand;

/** Derived UI state; reading it never serializes the document tree. */
export interface MindMapEditorState {
  /** Current main-root text, read directly without traversing or serializing the tree. */ readonly rootText: string;
  /** Current structure-command availability from selected parent/sibling geometry. */ readonly structure: Readonly<Record<MindMapStructureCommand, boolean>>;
  /** Layout completion generation; does not indicate a source mutation. */ readonly geometryVersion?: number;
  /** Current persisted layout, including undo/redo. */ readonly layout: MindMapLayout;
  /** Whether accepted source operations are still settling. */ readonly busy: boolean;
  /** Selected visible node identity, if any. */ readonly selectedId: string | null;
  /** Whether the selected node is the root. */ readonly selectedIsRoot: boolean;
  /** Number of selected visible topics; no source traversal required. */ readonly selectedCount: number;
  /** Changes on each selection-set notification, even with the same first node and count. */ readonly selectionVersion: number;
  /** Whether a node-text composition is active. */ readonly composing: boolean;
  /** Whether authoring is disabled. */ readonly readOnly: boolean;
  /** Whether undo is available. */ readonly canUndo: boolean;
  /** Whether redo is available. */ readonly canRedo: boolean;
  /** World-to-container scale. */ readonly scale: number;
  /** Horizontal translation in container CSS pixels. */ readonly x: number;
  /** Vertical translation in container CSS pixels. */ readonly y: number;
}

/** Presentation-only colors supplied by a host theme; never persisted on nodes. */
export interface MindMapAppearance {
  /** Brand/selection/connector color. */ readonly primary: string;
  /** Text on a solid brand background. */ readonly onPrimary: string;
  /** Ordinary node text. */ readonly text: string;
  /** Node surface color. */ readonly surface: string;
  /** Quiet branch fill. */ readonly soft: string;
  /** Node boundary color. */ readonly border: string;
  /** Product font family. */ readonly fontFamily: string;
}

/** Browser mount options. The surrounding host keeps its own document and history. */
export interface SimpleMindMapOptions {
  /** Connected, nonzero-sized container in the current document. Its existing children are preserved. */
  readonly container: HTMLElement;
  /** Validated QuireKit document; the adapter never mutates it. */
  readonly document: MindMapDocument;
  /** Prevents authoring commands for this instance. */
  readonly readOnly?: boolean;
  /** Accessible name for the independent editing surface. */
  readonly label?: string;
  /** UI language for transient hints and newly inserted topic defaults; existing content stays literal. */
  readonly locale?: string;
  /** Aborts loading or closes an existing instance. */
  readonly signal?: AbortSignal;
  /** Invalidates a draft without serializing it; selection and zoom do not call this. */
  readonly onChange?: (changeCount: number) => void;
  /** Passive draft invalidation, including uncommitted native input; does not read source or history. */
  readonly onDraftChange?: () => void;
  /** Reports errors from event-driven commands; direct method calls reject instead. */
  readonly onError?: (error: unknown) => void;
  /** @returns Completion of host-owned property drafts before native structural edits or snapshots. */
  readonly beforeMutation?: () => Promise<void>;
  /** @returns Captured property patches for synchronous native clipboard projection only. */
  readonly pendingContent?: () => MindMapContentUpdate;
  /** Theme projection independent of source data. */
  readonly appearance?: MindMapAppearance;
  /** Constant-sized selection/history/viewport state updates. */
  readonly onStateChange?: (state: MindMapEditorState) => void;
}

/** Browser editor with no exposed vendor objects or commands. */
export interface MindMapEditor {
  /** @returns Passive detached source including stable native text; null during composition or queued edits. Never commits or changes focus/history. */
  captureDraft(): MindMapDocument | null;
  /** @param document - Validated replacement content. @returns One undoable replacement preserving the host revision. */
  replaceDocument(document: MindMapDocument): Promise<void>;
  /** @returns Single-topic content, or null when selection is empty/ambiguous. */
  getDetails(): MindMapTopicDetails | null;
  /** @param update - Captured property drafts. @returns One atomic source/history update. */
  applyContent(update: MindMapContentUpdate): Promise<void>;
  /** @param patch - Explicit content edits. @param ids - Optional captured topic IDs. @returns One atomic content change. */
  setDetails(patch: MindMapDetailsPatch | null, ids?: readonly string[]): Promise<void>;
  /** @returns Only current selected identities; never traverses the source tree. */
  getSelectedTopicIds(): readonly string[];
  /** @returns Detached semantic annotations without committing active text. */
  getAnnotations(): readonly MindMapAnnotation[];
  /** @param annotation - Complete object with stable identity. @returns One undoable insert or update. */
  putAnnotation(annotation: MindMapAnnotation): Promise<void>;
  /** @param id - Annotation identity. @returns One undoable removal. */
  removeAnnotation(id: string): Promise<void>;
  /** @returns Selected explicit formatting; null is mixed and absence is theme default. */
  getFormatting(): MindMapFormatting;
  /** @param patch - Explicit fields to apply to selected nodes; null clears every explicit field. @returns One undoable formatting change. */
  format(patch: MindMapStylePatch | null): Promise<void>;
  /** @returns Cached plain-text outline, built only on explicit demand after source changes; never commits active text. */
  getOutline(): readonly MindMapOutlineEntry[];
  /** @param id - Stable target, including folded descendants. @param focus - Whether canvas focus follows.
   * @returns Whether the target was revealed; hidden readonly targets are left unchanged. */
  reveal(id: string, focus?: boolean): Promise<boolean>;
  /** @param target - Context event origin. @returns Whether a canvas menu may open after selecting its target. */
  prepareContextMenu(target: EventTarget | null): boolean;
  /** @param layout - Supported source layout. @returns One undoable layout change preserving the viewport. */
  setLayout(layout: MindMapLayout): Promise<void>;
  /** @param id - Stable branch identity. @returns One undoable fold of other branches. */
  focusBranch(id: string): Promise<void>;
  /** @returns Completion of fitting current visible selected subtrees. */
  fitSelection(): Promise<boolean>;
  /** @returns One cached visible geometry index per layout; never snapshots source or history. */
  getOverview(): MindMapOverview;
  /** @param point - Natural world point to place at the viewport center. */
  panTo(point: MindMapPoint): void;
  /** @returns Derived selection, history and viewport state without reading the tree. */
  getState(): MindMapEditorState;
  /** @param readOnly - Authoring mode; rejects while native composition is active. */
  setReadOnly(readOnly: boolean): void;
  /** @param locale - UI language; updates labels without ending composition or changing source/history. */
  setLocale(locale: string): void;
  /** Focuses the surface without changing its selected node. */
  focus(): void;
  /** @param scale - Absolute zoom ratio, clamped to 10%–300%. */
  setZoom(scale: number): void;
  /** @returns Completion of fitting the latest content into the current viewport. */
  fit(): Promise<void>;
  /** @returns Completion of centering the latest content while preserving zoom. */
  center(): Promise<void>;
  /** @param appearance - Theme projection. @returns Completion of appearance rendering. */
  setAppearance(appearance: MindMapAppearance): Promise<void>;
  /**
   * Commits active text editing and reads a detached canonical document.
   * @returns Current source with the original host revision; rejects during composition.
   */
  getDocument(): Promise<MindMapDocument>;
  /**
   * Selects a visible node, optionally keeping the host's current focus.
   * @param id - Stable node identity.
   * @param focus - Whether to focus the surface; defaults to true.
   * @returns Whether the node was found among rendered nodes.
   */
  select(id: string, focus?: boolean): boolean;
  /**
   * Runs one admitted command against the current selection.
   * @param command - QuireKit command name.
   * @returns Resolves after layout; rejects for readonly or closed editors.
   */
  execute(command: MindMapEditorCommand): Promise<void>;
  /**
   * Captures natural content bounds after current text and layout settle.
   * @returns Derived SVG snapshot; never returns after this instance closes.
   */
  exportSvg(): Promise<MindMapSnapshot>;
  /**
   * Re-measures the host container after a resize.
   * @returns Resolves after the new layout is ready.
   */
  resize(): Promise<void>;
  /**
   * Stops interaction immediately and releases resources after pending layout completes.
   * @returns The same completion promise on repeated calls.
   */
  destroy(): Promise<void>;
}
