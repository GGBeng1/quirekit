import type { EditorState, Node } from "@quirekit/pm";
import type { QuireEditorInputBindingOptions } from "../types";

/** Bounded native text backed by one immutable canonical document. */
export interface QuireNativeTextContext {
  /** Document against which every source position was compiled. */
  readonly doc: Node;
  /** Text exposed to native text services, without generated descriptions. */
  readonly text: string;
  /** Native UTF-16 anchor offset. */
  readonly anchor: number;
  /** Native UTF-16 moving endpoint. */
  readonly head: number;
  /** Source position for each UTF-16 boundary; null refuses an unmappable boundary. */
  readonly positions: readonly (number | null)[];
}

/** Supplies native context without owning browser listeners or transactions. */
export interface QuireTextContextProvider {
  /** Accessible name of the existing native text host. */
  readonly label: string;
  /** Optional explanation when the canonical selection has no supported native context. */
  readonly unavailableDescription?: string;
  /**
   * Projects a bounded window for the current canonical selection.
   * @param state - Latest accepted editor state.
   * @returns Context, or null when the complete selection cannot be represented.
   */
  read(state: EditorState): QuireNativeTextContext | null;
}

/** Exclusive lease on a mounted input host's native context policy. */
export interface QuireTextContextLease {
  /** Whether this lease still owns a browser composition session. */
  readonly composing: boolean;
  /** Updates native context after an accepted state change without disturbing composition. */
  refresh(): void;
  /** Releases the policy after active composition ends, or immediately while idle. */
  dispose(): void;
}

/** Mounted input capability exposed to optional services. */
export interface QuireTextContextHost {
  /**
   * Acquires the native context policy; concurrent policy owners are rejected.
   * @param provider - Context compiler owned by the installing service.
   * @returns Lease released with the service or mounted view.
   */
  attachTextContext(provider: QuireTextContextProvider): QuireTextContextLease;
}

/** Canonical replacement inferred from a native value change. */
export interface NativeTextReplacement {
  /** Canonical replacement start. */
  readonly from: number;
  /** Canonical replacement end. */
  readonly to: number;
  /** Newly inserted text, excluding unchanged native context. */
  readonly text: string;
}

/** Internal dependencies of the optional native text context session. */
export interface NativeTextContextSessionOptions {
  /** Existing mounted input authority. */
  readonly binding: QuireEditorInputBindingOptions;
  /** Compiler that owns the native text window. */
  readonly provider: QuireTextContextProvider;
  /** Whether installation must wait for an already active native composition. */
  readonly waitForComposition: boolean;
  /** Cancels the existing controller/IME session without committing preedit. */
  readonly cancelInput: () => void;
  /** Removes the disposed session from its binding. */
  readonly onDispose: () => void;
}
