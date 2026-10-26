import type { ClassicEditorRenderContext } from "../../../types";
import type { ComputedRef } from "vue";

/** One private identity-keyed presentation query node. */
export interface ClassicEditorPresentationQueryNode {
  /** Descendants keyed by action, source, payload or another identity. */
  readonly children: Map<unknown, ClassicEditorPresentationQueryNode>;
  /** Lazy result preserving callback dependencies for subsequent Vue consumers. */
  value?: ComputedRef<unknown> | undefined;
}

/** Authorities and memoized queries for one runtime-created context. */
export interface ClassicEditorPresentationScope {
  /** PM state identity, including selection and plugin metadata. */
  readonly pm: ClassicEditorRenderContext["editor"]["state"]["pm"] | undefined;
  /** Immutable product UI state identity. */
  readonly ui: ClassicEditorRenderContext["ui"]["state"];
  /** Current command editability, including option-only changes. */
  readonly editable: boolean;
  /** Current immutable contribution registry. */
  readonly registry: ClassicEditorRenderContext["instance"]["registry"];
  /** Private query namespaces and occurrence keys. */
  readonly queries: ClassicEditorPresentationQueryNode;
}
