import { useFlowMessages } from "./messages";
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch, type ComputedRef, type Ref } from "vue";
import type { FlowchartPoint } from "@quirekit/flowchart";
import type { QuireKitTheme } from "@quirekit/ui";
import type { FlowchartEditor, FlowchartEditorState } from "@quirekit/flowchart-x6";
import { createFlowEditor } from "../runtime/create";
import { flowEditorAppearance } from "../theme/appearance";
import type { FlowEditorProps } from "./types";

/** @param props - Host-owned source and permission. @param container - Mount target. @param theme - Current public theme. @param ready - Mount callback. @param changed - Source invalidation. @param failed - Error callback. @returns Instance lifetime and small UI projections. */
export function useFlowEditorSession(props: FlowEditorProps, container: Ref<HTMLElement | undefined>, theme: ComputedRef<QuireKitTheme>,
  ready: (editor: FlowchartEditor) => void, changed: (count: number) => void, failed: (error: unknown) => void) {
  const { locale } = useFlowMessages();
  const editor = shallowRef<FlowchartEditor>(), loading = ref(true), dirty = ref(false), error = ref("");
  const state = reactive<FlowchartEditorState>({ presenting: false, formatKind: null, paintingFormat: false, selectionLocked: false, selectedIds: [], selectedKind: null, selectedShapes: [], selectedStyle: { fontSize: null, bold: null, textAlign: null, verticalAlign: null, padding: null, nodeCount: 0, edgeCount: 0, fill: null, stroke: null, color: null,
    width: null, dashed: null, routing: null, connector: null, crossing: null, sourceArrow: null, targetArrow: null }, composing: false, readOnly: !!props.readOnly,
    canUndo: false, canRedo: false, scale: 1, x: 0, y: 0 });
  const contextPoint = shallowRef<FlowchartPoint>(), contentVersion = ref(0), imageEditId = ref<string>();
  let generation = 0, abort: AbortController | undefined, appliedTheme = theme.value;
  /** @param reason - Current-lifetime error. */
  function report(reason: unknown): void { error.value = reason instanceof Error ? reason.message : String(reason); failed(reason); }
  /** @returns Completion of opening the explicitly provided source. */
  async function mount(): Promise<void> {
    const ticket = ++generation;
    abort?.abort(); editor.value?.destroy(); editor.value = undefined;
    const controller = new AbortController(); abort = controller;
    contextPoint.value = undefined;
    loading.value = true; dirty.value = false; error.value = "";
    try {
      await nextTick(); if (ticket !== generation || !container.value) return;
      appliedTheme = theme.value;
      const instance = await createFlowEditor({ container: container.value, document: props.document, theme: appliedTheme,
        readOnly: !!props.readOnly || props.mode === "presentation", signal: controller.signal, locale: locale.value,
        /** @param count - Content invalidation sequence. */
        onChange(count) { if (ticket === generation) { dirty.value = true; contentVersion.value = count; contextPoint.value = undefined; changed(count); } },
        /** @param value - Small state projection. */
        onStateChange(value) { if (ticket === generation) Object.assign(state, value); },
        /** @param point - Viewport menu anchor after graph selection. */
        onContextMenu(point) { if (ticket === generation) contextPoint.value = point; },
        /** @param id - Selected image from native content editing. */
        onImageEdit(id) { if (ticket === generation) imageEditId.value = id; },
        /** @param reason - Active input error. */
        onError(reason) { if (ticket === generation) report(reason); },
      });
      if (ticket !== generation) { instance.destroy(); return; }
      editor.value = instance; instance.setLocale(locale.value);
      instance.setReadOnly(!!props.readOnly || props.mode === "presentation");
      if (theme.value !== appliedTheme) { appliedTheme = theme.value; instance.setAppearance(flowEditorAppearance(appliedTheme)); }
      instance.fit(); ready(instance);
    } catch (reason) { if (ticket === generation && !controller.signal.aborted) report(reason); }
    finally { if (ticket === generation) loading.value = false; }
  }
  watch(locale, value => editor.value?.setLocale(value));
  onMounted(() => { void mount(); });
  watch(() => props.document, () => { void mount(); });
  watch(() => [props.readOnly, props.mode] as const, ([value, mode]) => editor.value?.setReadOnly(!!value || mode === "presentation"));
  watch(() => [theme.value, state.composing], () => {
    if (!editor.value || state.composing || theme.value === appliedTheme) return;
    try { editor.value.setAppearance(flowEditorAppearance(theme.value)); appliedTheme = theme.value; }
    catch (reason) { report(reason); }
  });
  onBeforeUnmount(() => { generation++; abort?.abort(); editor.value?.destroy(); });
  return { editor, loading, dirty, error, state, report, contextPoint, contentVersion, imageEditId };
}
