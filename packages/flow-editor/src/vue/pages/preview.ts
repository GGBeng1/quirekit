import { computed, onBeforeUnmount, ref, watch, type Ref } from "vue";
import { planFlowchartPages, type FlowchartPageSettings, type FlowchartSnapshot } from "@quirekit/flowchart";
import { flowPrintBounds, flowPrintPageSvg } from "../../print/document";

/** @param snapshot - One frozen source projection. @param settings - Valid draft settings or temporary invalid input. @param index - Current page only. @returns Bounded pure pagination and one disposable preview image. */
export function useFlowPagePreview(snapshot: Ref<FlowchartSnapshot | undefined>, settings: Ref<FlowchartPageSettings | undefined>, index: Ref<number>) {
  const url = ref("");
  // Bounds are measured only when the source snapshot changes. Paper edits
  // perform constant-time planning plus at most 100 crop records, never X6 work.
  const bounds = computed(() => snapshot.value ? flowPrintBounds(snapshot.value, document) : undefined);
  const planned = computed(() => {
    if (!bounds.value || !settings.value) return undefined;
    try { return { plan: planFlowchartPages(bounds.value, settings.value), error: "" }; }
    catch (reason) { return { plan: undefined, error: reason instanceof Error ? reason.message : String(reason) }; }
  });
  const plan = computed(() => planned.value?.plan), error = computed(() => planned.value?.error ?? "");
  /** Releases exactly the current preview's URL. */
  function release(): void { if (url.value) URL.revokeObjectURL(url.value); url.value = ""; }
  watch([snapshot, plan, index], () => {
    release(); const source = snapshot.value, pages = plan.value;
    if (!source || !pages) return;
    if (index.value >= pages.pages.length) { index.value = 0; return; }
    url.value = URL.createObjectURL(new Blob([flowPrintPageSvg(source, pages, index.value, document)], { type: "image/svg+xml" }));
  }, { immediate: true });
  onBeforeUnmount(release);
  return { plan, error, url };
}
