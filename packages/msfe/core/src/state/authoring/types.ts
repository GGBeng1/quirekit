import type { Annotation, ChangeDesc, EditorSelection, EditorState, Extension, StateEffect, Transaction } from "@quirekit/cm-state";
import type { SourceDocument, SourceText } from "../../source/authoring/types";

/** Typed effect factory; positional payloads must supply their mapping contract. */
export interface Effect<T> {
  /** @param value - Immutable payload in the resulting document's coordinates. @returns Transaction effect. */
  of(value: T): StateEffect<T>;
  /** @param transaction - Canonical or speculative transaction. @returns Payloads in transaction order. */
  values(transaction: Transaction): readonly T[];
}

/** Typed correlation metadata, kept separate from persistent source fields. */
export interface Metadata<T> {
  /** @param value - Correlation payload. @returns Transaction annotation. */
  of(value: T): Annotation<T>;
  /** @param transaction - Observed transaction. @returns First supplied value, following CM annotation semantics. */
  read(transaction: Transaction): T | undefined;
}

/** Pure reducer inputs; before is the explicit backend escape hatch for dependent state. */
export interface StateUpdate {
  /** State preceding this draft or accepted transaction. */
  readonly before: EditorState;
  /** Resulting text; parser-dependent semantics are read after the transaction is accepted. */
  readonly document: SourceText;
  /** Position mapping from before to resulting source. */
  readonly changes: ChangeDesc;
  /** Whether canonical text changed. */
  readonly docChanged: boolean;
  /** Whether directed selection changed. */
  readonly selectionChanged: boolean;
  /** Resulting canonical selection. */
  readonly selection: EditorSelection;
  /** @param effect - Typed token. @returns Ordered payloads. */
  effects<T>(effect: Effect<T>): readonly T[];
  /** @param metadata - Typed token. @returns Correlation value. */
  metadata<T>(metadata: Metadata<T>): T | undefined;
}

/** Transaction-owned state; initialization is per document, not per definition. */
export interface StateDefinition<T> {
  /** Unique installation key, used in conflict diagnostics. */
  readonly key: string;
  /** @param document - Initial canonical source. @returns Immutable initial value. */
  readonly create: (document: SourceDocument) => T;
  /** @param value - Prior value. @param update - Pure transaction context. @returns Next immutable value. */
  readonly update: (value: T, update: StateUpdate) => T;
  /** Optional inverse effects, expressed in pre-transaction coordinates. Omission means no effect history.
   * @param value - Pre-transaction slot value. @param update - Forward transaction. @returns Explicit inverse effects. */
  readonly invert?: (value: T, update: StateUpdate) => readonly StateEffect<unknown>[];
}

/** Installable typed state key. The backend extension is exposed for advanced consumers. */
export interface StateSlot<T> {
  /** Explicit inverse-effect requirement, used during source-provider compatibility checks. */
  readonly history?: "effects";
  /** Unique installation name. */
  readonly key: string;
  /** Compiled field and optional history contribution. */
  readonly extension: Extension;
  /** @param state - Canonical or command draft state. @returns Current slot value; rejects uninstalled slots. */
  read(state: EditorState): T;
}

/** Accepted-state subscription, with no speculative draft notifications. */
export interface StateSubscription<T> {
  /** @param state - Accepted immutable state. @returns Selected value; must be pure and bounded. */
  readonly select: (state: EditorState) => T;
  /** @param next - Changed selected value. @param previous - Previously published value. */
  readonly change: (next: T, previous: T) => void;
  /** @param a - Previous value. @param b - Next value. @returns Equality; defaults to Object.is. */
  readonly equal?: (a: T, b: T) => boolean;
}
