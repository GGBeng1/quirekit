import type { MsfeIconFactory } from "../presentation/types";
import type { SingleCommands, CanCommands, MsfeCommandChain } from "../commands/types";
import type { MsfeComponentHost } from "../views/types";
import type { ChangeSet, ChangeSpec, EditorSelection, EditorState, StateEffect, Transaction } from "@quirekit/cm-state";
import type { AnyExtension } from "../authoring/types";
import type { MsfeCommand, MsfeMode } from "../state/types";
import type { MsfeWorkCounters } from "../presentation/types";
import type { SourceAnchor, RangePolicy } from "../ranges/types";
import type { MsfeSourceRange } from "../views/types";
import type { SourceQuery } from "../source/semantics/types";
import type { StateSlot, StateSubscription } from "../state/authoring/types";
import type { TaskScope } from "../tasks/scope";
import type { CodeLanguage } from "../source/languages/types";
import type { ComponentViewRenderer } from "../views/component/types";
import type { SearchPanelProps } from "../search/types";
import type { MsfeHistory } from "../history/types";

/** An accepted source change, without an eagerly serialized document. */
export interface MsfeChangeEvent {
  /** Host-visible document identity. */
  readonly documentId: string;
  /** Accepted source revision after this change. */
  readonly revision: number;
  /** Exact mapping from preceding source to accepted source. */
  readonly changes: ChangeSet;
  /** Directed selection after the change. */
  readonly selection: EditorSelection;
  /** User, command, history or host-provided origin. */
  readonly origin: string;
}

/** Internal accepted-event dispatcher dependencies, kept independent of DOM mounting. */
export interface MsfeEventDispatchOptions {
  /** Host and extension source observers. */
  readonly listeners: ReadonlySet<(event: MsfeChangeEvent) => void>;
  /** @returns Whether this editor has been disposed. */
  readonly destroyed: () => boolean;
  /** @param error - Observer failure. */
  readonly report: (error: unknown) => void;
  /** @param editor - Accepting editor. @param transaction - Accepted transaction. */
  readonly transaction: (editor: MsfeEditor, transaction: Transaction) => void;
}

/** Captured toolbar target, valid only for its exact document revision. */
export interface MsfeTarget {
  /** Instance identity prevents applying a target captured in a different editor. */
  readonly instanceId: string;
  /** Document identity when the UI action began. */
  readonly documentId: string;
  /** Source version when the UI action began. */
  readonly revision: number;
  /** Original directed selection. */
  readonly selection: EditorSelection;
}

/** Versioned external source mutation. */
export interface MsfeExternalChange {
  /** Expected document identity. */
  readonly documentId: string;
  /** Exact revision to which the offsets refer. */
  readonly baseRevision: number;
  /** CodeMirror logical source changes. */
  readonly changes: ChangeSpec;
  /** Correlation source for host echo suppression. */
  readonly origin?: string;
}

/** Explicit mutation rejection instead of silently retargeting user intent. */
export type MsfeResult = { readonly ok: true } | {
  readonly ok: false;
  readonly reason: "destroyed" | "not-mounted" | "readonly" | "stale-target" | "not-applicable" | "invalid-change" | "composing" | "not-installed" | "source-provider-locked";
};

/** Browser editor creation options; the host owns storage and file decoding. */
export interface MsfeEditorOptions {
  /** Host element into which one CodeMirror view is mounted. */
  readonly parent: HTMLElement;
  /** Decoded initial Markdown. */
  readonly markdown?: string;
  /** Optional host document key; defaults to a fresh id. */
  readonly documentId?: string;
  /** Initial presentation, defaulting to source. */
  readonly mode?: MsfeMode;
  /** Explicit source/live readonly setting. */
  readonly readOnly?: boolean;
  /** Initial editor color theme. */
  readonly theme?: "light" | "dark";
  /** Validated feature descriptors, scoped to this instance. */
  readonly extensions?: readonly AnyExtension[];
  /** Shared design icon renderer for folding and search controls. */
  readonly icons?: MsfeIconFactory;
  /** Exact lazy fence-language catalog; omitted or unknown names remain plain text. */
  readonly codeLanguages?: readonly CodeLanguage[];
  /** Optional search UI, mounted under the existing framework/provider host. */
  readonly searchPanel?: ComponentViewRenderer<SearchPanelProps>;
  /** Framework portal store supplied by an adapter; the consumer owns its disposal. */
  readonly componentHost?: MsfeComponentHost;
  /** Accessible name of the editable region. */
  readonly label?: string;
  /** Optional incremental source change listener. */
  readonly onChange?: (event: MsfeChangeEvent) => void;
  /** Reports errors from host listeners and CodeMirror plugins. */
  readonly onError?: (error: unknown) => void;
}

/** Ephemeral view intent; canonical source writes keep using commands or versioned changes. */
export interface MsfeViewStateUpdate {
  /** Feature-owned ephemeral effects; source edits and reconfiguration are rejected after planning. */
  readonly effects: readonly StateEffect<unknown>[];
  /** Optional source selection applied atomically with the view state. */
  readonly selection?: EditorSelection;
  /** Preserve the viewport by default; false lets passive effects retain pending native navigation. */
  readonly preserveScroll?: boolean;
}

/** Framework-neutral experimental MSFE public surface. */
export interface MsfeEditor {
  /** Availability of the instance's sole content history implementation. */
  readonly history: MsfeHistory;
  /** Editor lifetime for instance resources. */
  readonly scope: TaskScope;
  /** Current document lifetime, replaced even when the host reuses its documentId. */
  readonly documentScope: TaskScope;
  /** @param range - Source range to track. @param policy - Explicit mapping choices. @returns Cancellable mapped intent. */
  captureAnchor(range: MsfeSourceRange, policy?: RangePolicy): SourceAnchor;
  /** @param name - Semantic extension name. @param range - Bounded query, default all current selections. @returns Parse-aware source matches. */
  querySource(name: string, range?: MsfeSourceRange): SourceQuery;
  /** @param name - Semantic type. @param attrs - Optional exact field constraints. @returns Whether every selection has a matching owner. */
  isActive(name: string, attrs?: Readonly<Record<string, unknown>>): boolean;
  /** @param name - Semantic type. @returns Uniform selected fields, or null for mixed, absent or pending syntax. */
  getAttributes(name: string): Readonly<Record<string, unknown>> | null;
  /** @param slot - Installed transaction state. @returns Current immutable value. */
  getState<T>(slot: StateSlot<T>): T;
  /** @param subscription - Bounded selector with equality and observer. @returns Unsubscribe callback. */
  subscribeState<T>(subscription: StateSubscription<T>): () => void;
  /** Installed typed commands; missing runtime features return not-installed. */
  readonly commands: SingleCommands;
  /** Diagnostic outcome of the last executed named command/chain; can() leaves it unchanged. */
  readonly lastCommandResult: MsfeResult | undefined;
  /** Per-extension instance storage, keyed by unique id. */
  readonly storage: Readonly<Record<string, unknown>>;
  /** Mounted editor wrapper; content DOM stays CodeMirror-owned. */
  readonly element: HTMLElement;
  /** Current immutable CodeMirror state. */
  readonly state: EditorState;
  /** Current host document identity. */
  readonly documentId: string;
  /** Monotonic instance revision, also advanced by explicit document replacement. */
  readonly revision: number;
  /** Actual presentation, excluding deferred composition requests. */
  readonly mode: MsfeMode;
  /** Snapshot of deterministic work counts. */
  readonly work: Readonly<MsfeWorkCounters>;
  /** @returns Markdown with the retained file-format policy. */
  getMarkdown(): string;
  /** @returns A versioned, directed selection target. */
  captureTarget(): MsfeTarget;
  /** @param command - Pure planner. @param target - Optional captured target. @returns Mutation result. */
  run(command: MsfeCommand, target?: MsfeTarget): MsfeResult;
  /** @param target - Optional captured intent. @returns New typed atomic chain. */
  chain(target?: MsfeTarget): MsfeCommandChain;
  /** @param commands - Atomic ordered planners. @param target - Optional captured target. @returns Mutation result. */
  chain(commands: readonly MsfeCommand[], target?: MsfeTarget): MsfeResult;
  /** @returns Typed side-effect-free command queries. */
  can(): CanCommands;
  /** @param command - Pure planner. @param target - Optional captured target. @returns Applicability without dispatch. */
  can(command: MsfeCommand, target?: MsfeTarget): boolean;
  /** @param change - Versioned external changes. @returns Accepted or rejected mutation. */
  applyChanges(change: MsfeExternalChange): MsfeResult;
  /** @param markdown - New document source. @param documentId - New host identity. @returns History/selection reset result. */
  replaceDocument(markdown: string, documentId: string): MsfeResult;
  /** @param mode - Requested mode, deferred until composition ends. */
  setMode(mode: MsfeMode): void;
  /** @param readOnly - Editing permission independent of presentation. */
  setReadOnly(readOnly: boolean): void;
  /** @param theme - Color theme, preserving the view and history. */
  setTheme(theme: "light" | "dark"): void;
  /** @param selection - Directed source ranges. */
  setSelection(selection: EditorSelection): void;
  /** @param update - Source-neutral effects and optional selection. @returns Readonly-safe acceptance, or a lifecycle/invalid-update diagnostic. */
  updateViewState(update: MsfeViewStateUpdate): MsfeResult;
  /** @param position - Logical source position to bring into view. */
  scrollTo(position: number): void;
  /** Focuses the document when requested by the host. */
  focus(): void;
  /** @returns Whether one history event was undone. */
  undo(): boolean;
  /** @returns Whether one history event was redone. */
  redo(): boolean;
  /** @param listener - Incremental change observer. @returns Unsubscribe callback. */
  onChange(listener: (event: MsfeChangeEvent) => void): () => void;
  /** Idempotently releases view plugins, resources and listeners. */
  destroy(): void;
}
