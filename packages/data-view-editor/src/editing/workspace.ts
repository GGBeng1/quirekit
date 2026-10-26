import { v4 as uuidv4 } from "uuid";
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import { createDataViewDraft, validateDataViewBindings, type DataOperation, type DataSet, type DataSourceSession, type DataView, type DataViewSave, type DataViewMutationOptions } from "@quirekit/data-view";
import type { DataViewWorkspaceProps } from "../types";

/** Owns one local task and a cancellable external read, never document persistence.
 * @param props - Source and host capabilities captured on mount.
 * @returns Reactive state and atomic authoring actions.
 */
export function useDataViewWorkspace(props: DataViewWorkspaceProps) {
  const draft = createDataViewDraft(props.value), value = shallowRef(draft.read());
  const activeId = ref(value.value.defaultViewId), error = ref(""), loading = ref(false), revision = ref(0);
  const external = shallowRef<DataSet | null>(null), controller = new AbortController();
  let session: DataSourceSession | undefined;
  const data = computed(() => value.value.source.kind === "inline" ? value.value.source.dataset : external.value);
  const view = computed(() => value.value.views.find(item => item.id === activeId.value) ?? value.value.views[0]!);
  const writable = computed(() => !props.readOnly && !props.busy && value.value.source.kind === "inline");
  const canUndo = computed(() => { revision.value; return draft.canUndo; });
  const canRedo = computed(() => { revision.value; return draft.canRedo; });
  /** @param failure - Validation or provider failure. */
  function report(failure: unknown): void { error.value = failure instanceof Error ? failure.message : String(failure); }
  /** @param action - Atomic local change. @returns Whether the draft accepted the operation. */
  function change(action: () => void): boolean {
    if (props.readOnly || props.busy) return false;
    try { action(); value.value = draft.read(); revision.value++; error.value = ""; return true; } catch (failure) { report(failure); return false; }
  }
  /** @param operations - Complete inline mutation batch. @param options - Same-step view changes. @returns Whether the canonical draft accepted the change. */
  function apply(operations: readonly DataOperation[], options?: DataViewMutationOptions): boolean {
    if (!writable.value || !data.value) return false;
    return change(() => draft.apply(operations, {baseRevision: data.value!.revision, revision: uuidv4()}, options));
  }
  /** @param next - Authored view configuration. */
  function replaceView(next: DataView): void { change(() => draft.replaceView(next)); }
  /** Restores one local state. */
  function undo(): void { change(() => { draft.undo(); }); }
  /** Restores one undone local state. */
  function redo(): void { change(() => { draft.redo(); }); }
  /** @returns Exact source precondition and complete embed. */
  function prepare(): DataViewSave { const save = draft.prepare(); return {...save, value: {...save.value, defaultViewId: activeId.value}}; }
  onMounted(async () => {
    if (value.value.source.kind === "inline") return;
    if (!props.provider) { error.value = "此数据源需要宿主提供加载服务；引用已保留。"; return; }
    loading.value = true;
    try {
      const opened = await props.provider.open(value.value.source, controller.signal);
      if (controller.signal.aborted) { opened.dispose(); return; }
      session = opened;
      const description = await session.describe(controller.signal);
      if (!description.capabilities.read || !description.capabilities.consistentSnapshot || !session.snapshot) throw new Error("当前工作区需要完整且版本一致的只读快照。");
      const snapshot = await session.snapshot(description.revision, controller.signal);
      if (controller.signal.aborted) return;
      validateDataViewBindings(value.value, snapshot); external.value = snapshot;
    } catch (failure) { if (!controller.signal.aborted) report(failure); }
    finally { loading.value = false; }
  });
  onBeforeUnmount(() => { controller.abort(); session?.dispose(); draft.dispose(); external.value = null; });
  return {value, activeId, data, view, writable, canUndo, canRedo, error, loading, report, apply, replaceView, undo, redo, prepare};
}
