import type { MaybeRefOrGetter } from "vue";
import type { MsfeEditor, MsfeEditorOptions, MsfeNodeViewProps, StateSubscription } from "@quirekit/msfe-core";

/** Initial mount options; onError also receives creation failures, leaving editor undefined. Subsequent changes use the stable editor API. */
export type VueEditorOptions = Omit<MsfeEditorOptions, "parent" | "componentHost">;

/** A borrowed editor, shallow ref or reactive getter; undefined/null represents an unavailable instance. */
export type VueEditorSource = MaybeRefOrGetter<MsfeEditor | null | undefined>;

/** Fixed pure projection using core subscription equality (Object.is by default); it never mutates or serializes state implicitly. */
export type VueStateSelector<T> = Pick<StateSubscription<T>, "select" | "equal">;

/** Props accepted by a source-bound Vue component. */
export interface VueNodeViewComponentProps<Attrs extends object, Resource = unknown> {
  /** Source-derived snapshot and guarded actions. */
  readonly nodeView: MsfeNodeViewProps<Attrs, Resource>;
}
