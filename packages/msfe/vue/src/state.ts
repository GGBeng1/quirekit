import { shallowReadonly, shallowRef, toValue, watch, type ShallowRef } from "vue";
import type { MsfeEditor } from "@quirekit/msfe-core";
import type { VueEditorSource, VueStateSelector } from "./types";

/**
 * Observes accepted state inside the current Vue scope, without cloning or serializing it.
 * @param source - An editor, ref or getter; missing and disposed instances produce undefined.
 * @returns A readonly shallow ref, cleared when either the editor or Vue scope is disposed.
 */
export function useMsfeState(source: VueEditorSource): Readonly<ShallowRef<MsfeEditor["state"] | undefined>>;
/**
 * Observes a bounded state projection, publishing only changes accepted by the selector's equality.
 * @param source - An editor, ref or getter; instance changes detach the previous subscription.
 * @param selector - Pure bounded selector and optional equality; use immutable selected values.
 * @returns A readonly shallow ref, updated synchronously and cleared on disposal.
 */
export function useMsfeState<T>(source: VueEditorSource, selector: VueStateSelector<T>): Readonly<ShallowRef<T | undefined>>;
/** @param source - Scope-owned editor source. @param selector - Fixed projection for this consumer. @returns Current accepted value. */
export function useMsfeState(source: VueEditorSource, selector: VueStateSelector<unknown> = { select: state => state }): Readonly<ShallowRef<unknown>> {
  const value = shallowRef<unknown>();
  watch(() => toValue(source), (editor, _previous, cleanup) => {
    if (!editor || editor.scope.disposed) { value.value = undefined; return; }
    const initial = selector.select(editor.state);
    const unsubscribe = editor.subscribeState({ ...selector, change: next => { value.value = next; } });
    // Either lifetime may end first. Register teardown before exposing the snapshot,
    // so synchronous Vue consumers cannot leave a subscription on an old editor.
    cleanup(editor.scope.own(() => { unsubscribe(); value.value = undefined; }));
    value.value = initial;
  }, { immediate: true, flush: "sync" });
  return shallowReadonly(value);
}
