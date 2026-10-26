import { nextTick, onBeforeUnmount, ref, shallowRef, watch, type Ref } from "vue";
import { copyFlowchartSelection, type FlowchartSnapshot } from "@quirekit/flowchart";
import type { FlowchartEditor } from "@quirekit/flowchart-x6";
import type { QuireKitTheme } from "@quirekit/ui";
import { createFlowEditor } from "../../runtime/create";
import type { FlowExportRequest } from "./types";
/** @param mount - Inert measurement surface. @param request - Opening source and selection. @param range - Explicit range choice. @param theme - Opening display theme. @param signal - Optional session-close lifetime, independent of popup animations. @returns A cancellable vector snapshot, rebuilt only for a range change. */
export function useFlowExportPreview(mount: Ref<HTMLElement | undefined>, request: FlowExportRequest, range: Ref<string>, theme: QuireKitTheme, signal?: AbortSignal) {
  const snapshot = shallowRef<FlowchartSnapshot>(), url = ref(""), error = ref(""), loading = ref(false);
  let generation = 0, abort: AbortController | undefined, instance: FlowchartEditor | undefined;
  /** Invalidates the temporary renderer and releases its source-bound preview. */
  function stop(): void { generation++; abort?.abort(); instance?.destroy(); instance = undefined; snapshot.value = undefined; if (url.value) URL.revokeObjectURL(url.value); url.value = ""; }
  /** @returns Completion of one isolated projection; the live graph is never hidden or mutated. */
  async function render(): Promise<void> {
    stop(); if (signal?.aborted) return;
    const ticket = generation, controller = new AbortController(); abort = controller; error.value = ""; loading.value = true;
    let renderer: FlowchartEditor | undefined;
    try {
      const source = range.value === "selection" ? copyFlowchartSelection(request.document, request.ids) : request.document;
      await nextTick(); if (ticket !== generation || !mount.value) return;
      renderer = await createFlowEditor({ container: mount.value, document: source, theme, readOnly: true, signal: controller.signal, label: "图片导出渲染" });
      if (ticket !== generation) return;
      instance = renderer; const result = await renderer.exportSvg();
      if (ticket !== generation) return;
      snapshot.value = result; url.value = URL.createObjectURL(new Blob([result.svg], { type: "image/svg+xml" }));
    } catch (reason) { if (ticket === generation && !controller.signal.aborted) error.value = reason instanceof Error ? reason.message : String(reason); }
    finally { renderer?.destroy(); if (ticket === generation) { instance = undefined; loading.value = false; } }
  }
  signal?.addEventListener("abort", stop, { once: true });
  watch(range, () => { void render(); }, { immediate: true }); onBeforeUnmount(() => { signal?.removeEventListener("abort", stop); stop(); });
  return { snapshot, url, loading, error, retry: render };
}
