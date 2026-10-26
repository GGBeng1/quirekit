import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { Ref } from "vue";
import { countPresetGalleryColumns } from "../../components/preset-gallery/geometry";

/**
 * Project public CSS grid geometry into the existing Ark selection machine.
 *
 * @param host - Stable native element containing the gallery.
 * @param layoutInputs - Reactive item count and host layout constraints.
 * @returns The current visual column count for GridCollection.
 */
export function useGalleryColumns(host: Ref<HTMLElement | undefined>, layoutInputs: () => unknown[]) {
  const columns = ref(1);
  let observer: ResizeObserver | undefined;

  /** Read the owned public anatomy after Vue has updated the items. */
  function measure(): void {
    const grid = host.value?.querySelector<HTMLElement>(".qk-preset-gallery__grid");
    if (grid) columns.value = countPresetGalleryColumns(getComputedStyle(grid).gridTemplateColumns);
  }

  // CSS lays out the first frame; measurement only updates keyboard topology.
  onMounted(() => {
    const grid = host.value?.querySelector<HTMLElement>(".qk-preset-gallery__grid");
    if (!grid) return;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(measure);
      observer.observe(grid);
    }
    measure();
  });
  watch(layoutInputs, () => { void nextTick().then(measure); }, { flush: "post" });
  onBeforeUnmount(() => observer?.disconnect());
  return columns;
}
