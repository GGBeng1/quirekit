import type { QuireEditor } from "../Editor";
import type { QuireAnyExtension, QuireEditorState } from "../types";

/** Exact current state supplied after ProseMirror apply and storage synchronization. */
export interface QuireLayoutDependencyContext {
  /** Editor that owns the layout operation. */
  readonly editor: QuireEditor;
  /** Exact committed or speculative state being laid out. */
  readonly state: QuireEditorState;
  /** Current configured owner when the dependency belongs to a style field. */
  readonly extension?: QuireAnyExtension | undefined;
}

/**
 * Explicit promise that layout output depends on document and Engine inputs.
 *
 * Every additional mutable dependency must be represented by getVersion.
 * This describes one concrete implementation, never all callbacks with its name.
 */
export interface QuireLayoutDependency {
  /** Document plus explicit Engine constraints own the reusable result. */
  readonly kind: "document";
  /**
   * Reads additional dependencies after current PM state has been applied.
   *
   * Return a primitive or an immutable identity token. A top-level array is a
   * bounded value vector: its elements are copied and compared individually.
   * Mutable objects must expose a changing revision rather than their identity.
   * No value from a previous invocation is reused when this callback throws.
   *
   * @param context - Exact current owner and state.
   * @returns Version token or bounded vector covering every extra dependency.
   */
  readonly getVersion?: ((context: QuireLayoutDependencyContext) => unknown) | undefined;
}

/** Complete dependency evidence for one editor's layout contributions. */
export type QuireLayoutAuthoritySnapshot =
  | {
      /** All installed contributions supplied dependency evidence. */
      readonly known: true;
      /** Owner identities and copied version values, compared with Object.is. */
      readonly tokens: readonly unknown[];
    }
  | {
      /** At least one contribution cannot prove stable layout output. */
      readonly known: false;
      /** Diagnostic reason; never used as an admission whitelist. */
      readonly reason: string;
    };
