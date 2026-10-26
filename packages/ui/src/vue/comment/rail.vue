<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef } from "vue";
import { layoutQuireCommentRail } from "../../components/comment-rail";
import type { QuireKitCommentRailItem, QuireKitCommentRailProps } from "./types";

const props = withDefaults(defineProps<QuireKitCommentRailProps>(), { height: 0, gap: 12 });
defineSlots<{
  /** One card; positioned by the rail at its anchor or just below the previous card. */
  item: (props: { readonly item: QuireKitCommentRailItem }) => unknown;
}>();
const heights = shallowRef<ReadonlyMap<string, number>>(new Map());
const elements = new Map<Element, string>();
const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(entries => {
  // One batched update per observer callback; layout is a single pass over the items.
  const next = new Map(heights.value);
  for (const entry of entries) {
    const id = elements.get(entry.target);
    if (id !== undefined) next.set(id, entry.borderBoxSize?.[0]?.blockSize ?? entry.target.getBoundingClientRect().height);
  }
  heights.value = next;
});
const layout = computed(() => layoutQuireCommentRail(props.items.map(item => ({ anchorTop: item.anchorTop, cardHeight: heights.value.get(item.id) ?? 0 })), props.height, props.gap));
onBeforeUnmount(() => observer?.disconnect());

/** Tracks one card wrapper for height changes. @param element - Mounted wrapper, or null on unmount. @param id - Item id. */
function track(element: unknown, id: string): void {
  for (const [known, value] of elements) if (value === id && known !== element) { observer?.unobserve(known); elements.delete(known); }
  if (element instanceof Element && !elements.has(element)) { elements.set(element, id); observer?.observe(element); }
}
</script>

<template>
  <div class="qk-comment-rail" :style="{ minHeight: `${layout.railHeight}px` }">
    <div v-for="(item, index) in items" :key="item.id" :ref="element => track(element, item.id)" class="qk-comment-rail__item"
      :data-measured="heights.has(item.id) || undefined" :style="{ insetBlockStart: `${layout.cardTops[index]}px` }">
      <slot name="item" :item="item" />
    </div>
  </div>
</template>
