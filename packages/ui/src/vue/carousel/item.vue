<script setup lang="ts">
import { useCarouselContext } from '@ark-ui/vue/carousel';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import type { CarouselItemProps } from './types';
const props = defineProps<CarouselItemProps>();
const api = useCarouselContext();
const element = ref<HTMLElement>();
const inView = ref(props.initiallyVisible);
let observer: IntersectionObserver | undefined;
onMounted(() => {
  const node = element.value;
  if (!node?.parentElement) return;
  // Observe each item's own lifetime: upstream's initial-only observer misses appended slides.
  observer = new IntersectionObserver(entries => {
    const entry = entries[0];
    if (!entry) return;
    const visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
    if (!visible && node.contains(document.activeElement)) {
      const root = node.closest('[data-scope="carousel"][data-part="root"]');
      root?.querySelector<HTMLElement>('[data-part="indicator"][data-current], [data-part="next-trigger"]:not(:disabled), [data-part="prev-trigger"]:not(:disabled)')?.focus({ preventScroll: true });
    }
    inView.value = visible;
  }, { root: node.parentElement, threshold: [0, 0.5] });
  observer.observe(node);
});
onBeforeUnmount(() => observer?.disconnect());
</script>
<template>
  <div ref="element" v-bind="api.getItemProps({ index })" class="qk-carousel__item"
    :aria-label="label" :aria-hidden="!inView" :inert="!inView"
    :data-inview="inView ? '' : undefined">
    <slot :in-view="inView" />
  </div>
</template>
