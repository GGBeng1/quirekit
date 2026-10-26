<script setup lang="ts">
import { onMounted, ref, shallowRef, watch } from 'vue';
import type { ImageLoadState } from '../image-preview/types';
const props = defineProps<{
  /** Requested source; parent keys each request generation. */ src: string;
  /** Image alternative text. */ alt: string;
}>();
const emit = defineEmits<{
  /** Loaded intrinsic dimensions. */ load: [image: HTMLImageElement];
  /** Native resource error. */ error: [event: Event];
  /** Current resource state. */ state: [state: ImageLoadState];
}>();
const element = shallowRef<HTMLImageElement | null>(null);
const status = ref<ImageLoadState>('loading');
let loadedSource = '';
/** @param image - Current native image, possibly already cached. */
function complete(image: HTMLImageElement): void {
  if (image !== element.value || !image.naturalWidth) return;
  const source = image.currentSrc || image.src;
  if (status.value === 'loaded' && source === loadedSource) return;
  loadedSource = source;
  status.value = 'loaded'; emit('state', 'loaded'); emit('load', image);
}
/** @param event - Native load event. */
function loaded(event: Event): void { complete(event.currentTarget as HTMLImageElement); }
/** @param event - Native failure from the currently mounted resource. */
function failed(event: Event): void {
  if (event.currentTarget !== element.value) return;
  status.value = 'error'; emit('state', 'error'); emit('error', event);
}
watch(() => props.src, () => { loadedSource = ''; status.value = 'loading'; emit('state', 'loading'); });
onMounted(() => {
  if (!element.value?.complete) return;
  if (element.value.naturalWidth) complete(element.value);
  else { status.value = 'error'; emit('state', 'error'); emit('error', new Event('error')); }
});
</script>
<template><img ref="element" :src="src" :alt="alt" decoding="async" :data-load-state="status" @load="loaded" @error="failed"></template>
