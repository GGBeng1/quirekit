<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import Media from '../image/media.vue';
import { QuireButton } from '../button';
import { useImageTransform } from './use-transform';
import { usePreviewGestures } from './use-gestures';
import type { ImageLoadState, QuireKitImagePreviewItem, QuireKitImagePreviewLabels } from './types';
const props = defineProps<{
  /** Current keyed resource. */ item: QuireKitImagePreviewItem;
  /** Resolved loading, failure, and recovery copy. */ labels: QuireKitImagePreviewLabels;
}>();
const emit = defineEmits<{ /** Adjacent image intent. */ navigate: [delta: number] }>();
const element = shallowRef<HTMLElement | null>(null);
const viewport = ref({ width: 0, height: 0 });
const status = ref<ImageLoadState>('loading');
const attempt = ref(0);
const transform = useImageTransform(viewport);
const { ready, scale, angle, fitRatio, offset, imageStyle } = transform;
const gestures = usePreviewGestures(element, transform, delta => emit('navigate', delta));
let observer: ResizeObserver | undefined;
onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    if (entry) viewport.value = { width: Math.max(1, entry.contentRect.width - 32), height: Math.max(1, entry.contentRect.height - 48) };
  });
  if (element.value) observer.observe(element.value);
});
onBeforeUnmount(() => observer?.disconnect());
/** @param image - Current loaded native resource. */
function loaded(image: HTMLImageElement): void { transform.load({ width: image.naturalWidth, height: image.naturalHeight }); }
/** Restarts the native image request without retaining the failed transform. */
function retry(): void { ready.value = false; status.value = 'loading'; attempt.value++; }
defineExpose({ ...transform });
</script>
<template>
  <div ref="element" class="qk-image-preview__stage" :data-zoom="scale" :data-angle="angle" :data-x="offset.x" :data-y="offset.y" :data-ready="ready" :data-zoomed="scale > fitRatio + .001" :data-dragging="gestures.dragging.value"
    @pointerdown="gestures.down" @pointermove="gestures.move" @pointerup="gestures.end" @pointercancel="gestures.end" @lostpointercapture="gestures.end" @wheel="gestures.wheel" @dblclick="gestures.doubleClick">
    <Media :key="`${props.item.src}:${attempt}`" :src="item.src" :alt="item.alt" class="qk-image-preview__image" :style="[imageStyle, item.background ? { backgroundColor: item.background } : {}]" draggable="false" @dragstart.prevent @load="loaded" @state="status = $event" />
    <div v-if="status === 'loading'" class="qk-image-preview__status" role="status"><span class="qk-image-preview__loading" aria-hidden="true" />{{ labels.loading }}</div>
    <div v-else-if="status === 'error'" class="qk-image-preview__status" role="alert"><span>{{ labels.unavailable }}</span><QuireButton variant="outline" @pointerdown.stop @dblclick.stop @click="retry">{{ labels.retry }}</QuireButton></div>
  </div>
</template>
