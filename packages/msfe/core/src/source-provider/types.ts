import type { ChangeSpec, EditorSelection, EditorState, Extension, Transaction } from "@quirekit/cm-state";
import type { MarkdownInput } from "../state/types";
import type { MsfeHistoryDriver } from "../history/types";

/** An authorized source projection; ordinary origin annotations cannot create this capability. */
export interface MsfeSourceUpdate {
  /** Incremental edits in the current binding's UTF-16 coordinates. */
  readonly changes?: ChangeSpec;
  /** Optional directed selection for local history restoration. */
  readonly selection?: EditorSelection;
  /** Shared updates and local selective history have distinct public event origins. */
  readonly origin: "remote" | "history";
}

/** Scoped access granted only to the selected source provider until its lease is released. */
export interface MsfeSourceBinding {
  /** @returns The current accepted immutable state. */
  state(): EditorState;
  /** @param update - Provider-authenticated shared projection, bypassing local text filters. */
  dispatch(update: MsfeSourceUpdate): void;
  /** Refreshes permission and history state without editing content. */
  refresh(): void;
}

/** One synchronous installation and commit lease, owned by an editor instance. */
export interface MsfeSourceLease {
  /** Fixed host document identity. */
  readonly documentId: string;
  /** Current logical source and immutable file export format. */
  readonly source: MarkdownInput;
  /** Optional provider state fields, without another content-history implementation. */
  readonly extensions?: Extension;
  /** Effective source-owner permission; host readOnly remains an additional constraint. */
  readonly writable: boolean;
  /** The sole content history implementation. */
  readonly history: MsfeHistoryDriver;
  /** @param binding - Scoped root transaction owner. */
  attach(binding: MsfeSourceBinding): void;
  /** @param transaction - Fully reduced, locally accepted transaction. @param apply - Commits its CM state, exactly once before returning. */
  commit(transaction: Transaction, apply: () => void): void;
  /** @param notify - Publishes accepted source/history observations after the provider's transaction and history phases settle. */
  publish?(notify: () => void): void;
  /** @param error - Unexpected consistency failure, requiring recovery. */
  fault(error: unknown): void;
  /** Idempotently releases this editor binding, retaining host-owned session state. */
  release(): void;
}

/** Optional extension contribution replacing source and history together. */
export interface MsfeSourceProvider {
  /** @returns A synchronous lease from already-prepared state; fails before DOM allocation if unavailable. */
  acquire(): MsfeSourceLease;
}
