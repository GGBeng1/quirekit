import { nextTick, onBeforeUnmount, onMounted, ref, shallowReactive, watch, type Ref } from "vue";
import { createFlowchart } from "@quirekit/flowchart";
import type { QuireKitTheme } from "@quirekit/ui";
import type { FlowchartEditor } from "@quirekit/flowchart-x6";
import { createFlowEditor } from "../../runtime/create";
import { createFlowchartTemplate, flowchartTemplates } from "../../templates/catalog";
import type { FlowchartTemplateId } from "../../templates/types";

/** @param container - Inert, offscreen preview mount. @param theme - Current theme getter. @param locale - Current interface and built-in content language. @returns Cancellable SVG image cache for this gallery lifetime only. */
export function useTemplatePreviews(container: Ref<HTMLElement | undefined>, theme: () => QuireKitTheme, locale: () => string) {
  const urls = shallowReactive<Partial<Record<FlowchartTemplateId, string>>>({}), loading = ref(true), error = ref("");
  let generation = 0, abort: AbortController | undefined, instance: FlowchartEditor | undefined;
  /** Invalidates pending exports and releases their graph, observers and object URLs. */
  function stop(): void {
    generation++; abort?.abort(); instance?.destroy(); instance = undefined;
    for (const id of Object.keys(urls) as FlowchartTemplateId[]) { URL.revokeObjectURL(urls[id]!); delete urls[id]; }
  }
  /** @returns Completion of one bounded, serial catalog rendering pass. */
  async function render(): Promise<void> {
    stop(); const ticket = generation, controller = new AbortController(); abort = controller;
    loading.value = true; error.value = "";
    let renderer: FlowchartEditor | undefined;
    try {
      await nextTick(); if (ticket !== generation || !container.value) return;
      // A single isolated graph owns routes, label metrics and sketch strokes.
      // Never serialize or subscribe to the user's authoring instance for previews.
      renderer = await createFlowEditor({ container: container.value, document: createFlowchart(), theme: theme(), locale: locale(), signal: controller.signal, label: "模板预览渲染" });
      if (ticket !== generation) return;
      instance = renderer;
      for (const item of flowchartTemplates) {
        if (item.id === "blank") continue;
        controller.signal.throwIfAborted();
        renderer.replaceDocument(createFlowchartTemplate(item.id, `preview-${item.id}`, locale()));
        const snapshot = await renderer.exportSvg();
        if (ticket !== generation) return;
        urls[item.id] = URL.createObjectURL(new Blob([snapshot.svg], { type: "image/svg+xml" }));
        // Yield between recipes so pointer/keyboard dismissal can abort the
        // bounded queue even when the export promise resolves in a microtask.
        await new Promise<void>(resolve => setTimeout(resolve, 0));
      }
    } catch (reason) { if (ticket === generation && !controller.signal.aborted) error.value = reason instanceof Error ? reason.message : String(reason); }
    finally { renderer?.destroy(); if (ticket === generation) { instance = undefined; loading.value = false; } }
  }
  onMounted(() => { void render(); });
  watch([theme, locale], () => { void render(); });
  onBeforeUnmount(stop);
  return { urls, loading, error, retry: render };
}
