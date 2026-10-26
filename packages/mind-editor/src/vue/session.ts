import { useMindEditorMessages } from "./messages";
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch, type ComputedRef, type Ref } from "vue";
import type { QuireKitTheme } from "@quirekit/ui";
import type { MindMapEditor, MindMapEditorState } from "@quirekit/mind-map-simple";
import { serializeMindMap, type MindMapDocument } from "@quirekit/mind-map";
import { createMindEditorDrafts } from "../runtime/drafts/session";
import { bindMindEditorDrafts } from "../runtime/drafts/controller";
import type { MindEditorDrafts } from "../runtime/drafts/types";
import { createMindEditor } from "../runtime/create";
import { mindEditorAppearance } from "../theme/appearance";
import type { MindEditorProps } from "./workspace/types";
import { emptyMindMapStructureState } from "../ui/structure";
import { useMindEditorRecovery } from "./recovery/session";

/**
 * Owns one component's cancellable mount and small reactive state projections.
 * @param props - Host source and permission props.
 * @param container - Vue mount element.
 * @param theme - Public semantic theme.
 * @param ready - Initialized-controller callback.
 * @param changed - Source invalidation callback.
 * @param failed - Failure callback.
 * @returns Component lifetime and derived state.
 */
export function useMindEditorSession(props: MindEditorProps, container: Ref<HTMLElement | undefined>,
  theme: ComputedRef<QuireKitTheme>, ready: (editor: MindMapEditor) => void,
  changed: (count: number) => void, failed: (error: unknown) => void) {
  const { locale, failure } = useMindEditorMessages();
  const editor = shallowRef<MindMapEditor>();
  const drafts = shallowRef<MindEditorDrafts>();
  const draftVersion = ref(0);
  const loading = ref(true), dirty = ref(false), error = ref(""), sourceVersion = ref(0);
  const state = reactive<MindMapEditorState>({ rootText: props.document.root.text,
    selectedId: null, selectedIsRoot: false, selectedCount: 0, selectionVersion: 0, composing: false,
    layout: props.document.layout, busy: false, structure: emptyMindMapStructureState,
    readOnly: props.readOnly === true, canUndo: false, canRedo: false, scale: 1, x: 0, y: 0 });
  let generation = 0, editGeneration = 0, saveGeneration = 0;
  let abort: AbortController | undefined;
  let appliedTheme = theme.value;
  /** @param reason - Current-lifetime error. */
  function report(reason: unknown): void {
    error.value = failure(reason); failed(reason);
  }
  /** Marks edits in O(1); full source comparison belongs only to explicit save. */
  function markDirty(): void { editGeneration++; dirty.value = true; }
  const recovery = useMindEditorRecovery(report, () => props.readOnly !== true);
  /** @returns Completion of replacing the explicitly supplied document. */
  async function mount(): Promise<void> {
    const ticket = ++generation;
    recovery.detach();
    abort?.abort();
    const previous = editor.value;
    editor.value = undefined; drafts.value = undefined; loading.value = true; dirty.value = false; error.value = "";
    Object.assign(state, { rootText: props.document.root.text });
    const controller = new AbortController(); abort = controller;
    let pending: MindEditorDrafts | undefined;
    try {
      await previous?.destroy(); await nextTick();
      if (ticket !== generation || !container.value) return;
      appliedTheme = theme.value;
      const instance = await createMindEditor({ container: container.value, document: props.document,
        readOnly: props.readOnly === true || !!props.recovery, theme: appliedTheme, locale: locale.value,
        signal: controller.signal,
        beforeMutation: () => pending?.settled() ?? Promise.resolve(),
        pendingContent: () => pending?.snapshot() ?? {},
        /** @param count - Current invalidation count. */
        onChange(count) { if (ticket === generation && !loading.value) { markDirty(); sourceVersion.value++; changed(count); } },
        /** Invalidates local persistence without serializing native input. */
        onDraftChange() { if (ticket === generation && !loading.value) { markDirty(); recovery.change(); } },
        /** @param value - Derived UI state with no serialized tree. */
        onStateChange(value) { if (ticket === generation) Object.assign(state, value); },
        /** @param reason - Live event error. */
        onError(reason) { if (ticket === generation) report(reason); },
      });
      if (ticket !== generation) { await instance.destroy(); return; }
      pending = createMindEditorDrafts(update => instance.applyContent(update), () => {
        if (ticket === generation && !loading.value) { markDirty(); draftVersion.value++; recovery.change(); }
      });
      drafts.value = pending;
      editor.value = bindMindEditorDrafts(instance, pending);
      instance.setLocale(locale.value);
      // Loading is asynchronous: reconcile current host props before publishing ready.
      // Once published here, later changes are owned by the existing live watchers.
      if (theme.value !== appliedTheme) {
        appliedTheme = theme.value;
        await instance.setAppearance(mindEditorAppearance(appliedTheme));
      }
      await instance.fit();
      if (ticket !== generation) { await instance.destroy(); return; }
      await recovery.begin(instance, pending, props.document, props.title ?? props.document.root.text, props.recovery, container.value.ownerDocument);
      if (ticket !== generation) { await instance.destroy(); return; }
      if (instance.getState().readOnly !== (props.readOnly === true || recovery.blocked.value)) instance.setReadOnly(props.readOnly === true || recovery.blocked.value);
      Object.assign(state, instance.getState());
      if (!props.readOnly && !recovery.blocked.value) instance.select(props.document.root.id, false);
      ready(editor.value);
    } catch (reason) {
      if (ticket === generation && !controller.signal.aborted) report(reason);
    } finally { if (ticket === generation) loading.value = false; }
  }
  onMounted(() => { void mount(); });
  watch(locale, value => editor.value?.setLocale(value));
  watch(() => [props.document, props.recovery], () => { void mount(); });
  watch(() => [props.readOnly, state.composing, recovery.blocked.value], () => {
    if (editor.value && !state.composing && editor.value.getState().readOnly !== (props.readOnly === true || recovery.blocked.value)) editor.value.setReadOnly(props.readOnly === true || recovery.blocked.value);
  });
  watch(() => [theme.value, state.composing], () => {
    if (editor.value && !state.composing && theme.value !== appliedTheme) {
      appliedTheme = theme.value;
      void editor.value.setAppearance(mindEditorAppearance(appliedTheme)).catch(report);
    }
  });
  onBeforeUnmount(() => {
    recovery.detach();
    generation++; abort?.abort();
    void editor.value?.destroy().catch(() => undefined);
  });
  /** @param document - Exact host-accepted source. @returns New local baseline without resetting native history. */
  async function acceptRecoverySave(document: MindMapDocument): Promise<void> {
    const instance = editor.value, pending = drafts.value, ticket = generation, save = ++saveGeneration;
    if (!instance || !pending || !container.value) return;
    const edits = editGeneration, current = instance.captureDraft();
    const accepted = !!current && !pending.pending() && serializeMindMap(current) === serializeMindMap(document);
    /** @returns Whether this completion still owns the live save boundary. */
    function active(): boolean { return ticket === generation && save === saveGeneration; }
    // A storage failure disables automatic drafts for this mounted lifetime.
    // A successful manual save must not immediately reopen the same error popup.
    if (recovery.state.value.status === "unavailable") {
      await recovery.finish();
      if (active()) dirty.value = !accepted || edits !== editGeneration;
      return;
    }
    if (!await recovery.finish() || !active()) return;
    recovery.detach();
    await recovery.begin(instance, pending, document, props.title ?? document.root.text, props.recovery, container.value.ownerDocument, true);
    if (!active()) return;
    // The host accepted an immutable snapshot, not input arriving during storage
    // latency. Re-admit those invalidations under its new baseline without flush,
    // focus transfer, readonly toggles or a replacement of native history.
    dirty.value = !accepted || edits !== editGeneration;
    if (dirty.value) recovery.change();
  }
  return { editor, drafts, draftVersion, state, loading, dirty, error, report, sourceVersion, recovery, acceptRecoverySave };
}
