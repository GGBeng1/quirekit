<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, shallowRef, useId, watch } from 'vue';
import Media from './media.vue';
import { QuireImagePreview } from '../image-preview';
import QuireIcon from '../icon/icon.vue';
import { QuireButton } from '../button';
import { imagePreviewGroupKey } from '../image-preview/group/context';
import type { ImageLoadState } from '../image-preview/types';
import type { QuireKitImageProps } from './types';
import { useQuireKitMessages } from '../locale-provider/context';
const props = withDefaults(defineProps<QuireKitImageProps>(), { fit: 'cover', position: 'center', loading: 'lazy', decoding: 'async', fetchpriority: 'auto', preview: false, previewHint: true });
const emit = defineEmits<{
  /** 当前资源加载成功。 */ load: [image: HTMLImageElement];
  /** 当前资源加载失败。 */ error: [event: Event];
  /** Before opening preview; preventDefault lets a virtualized host supply its complete gallery. */ preview: [event: MouseEvent];
}>();
defineSlots<{
  /** 自定义加载占位。 */ placeholder?(props: { src: string; fallback: boolean }): unknown;
  /** 自定义错误提示和重试入口。 */ error?(props: { retry: () => void; src: string; fallback: boolean }): unknown;
}>();
defineOptions({ inheritAttrs: false });
const text = useQuireKitMessages('image');
const status = ref<ImageLoadState>('loading');
const attempt = ref(0);
const usingFallback = ref(false);
const selectedSource = ref('');
const root = shallowRef<HTMLElement | null>(null);
const group = inject(imagePreviewGroupKey, null);
const memberId = useId();
const source = computed(() => usingFallback.value ? props.fallback! : props.src);
watch(() => [props.src, props.srcset, props.sizes, props.fallback, props.crossorigin, props.referrerpolicy], retry);
/** @param image - Loaded original or fallback resource. */
function loaded(image: HTMLImageElement): void {
  if (!usingFallback.value) selectedSource.value = image.currentSrc || image.src;
  emit('load', image);
}
/** @param event - Failure of the current request generation. */
function failed(event: Event): void {
  emit('error', event);
  if (!usingFallback.value && props.fallback && props.fallback !== props.src) {
    usingFallback.value = true; status.value = 'loading'; attempt.value++;
  }
}
/** @param value - CSS length or pixel dimension. @returns CSS length. */
function length(value: number | string | undefined): string | undefined { return typeof value === 'number' ? `${value}px` : value; }
const style = computed(() => ({ width: length(props.width), height: length(props.height), aspectRatio: props.aspectRatio,
  minWidth: props.width !== undefined ? 0 : undefined, minHeight: props.height !== undefined ? 0 : undefined }));
const previewItem = computed(() => ({ id: props.src, src: props.previewSrc || selectedSource.value || props.src, alt: props.alt, ...(props.title ? { title: props.title } : {}) }));
const items = computed(() => [previewItem.value]);
let unregister: (() => void) | undefined;
onMounted(() => { unregister = group?.register({ id: memberId, element: root, item: previewItem, enabled: computed(() => props.preview && !usingFallback.value && status.value !== 'error') }); });
onBeforeUnmount(() => { unregister?.(); });
/** @param open - Existing single-image preview action. @param event - Original pointer or keyboard click. */
function openPreview(open: (index: number) => void, event: MouseEvent): void {
  emit('preview', event);
  if (event.defaultPrevented) return;
  if (!group?.open(memberId, event.currentTarget as HTMLElement, props.previewOptions)) open(0);
}
/** Reissues the failed resource request. */
function retry(): void { usingFallback.value = false; selectedSource.value = ''; status.value = 'loading'; attempt.value++; }
</script>
<template>
  <QuireImagePreview v-bind="previewOptions" :items="items">
    <template #default="{ open }">
      <span ref="root" v-bind="$attrs" class="qk-image" :style="style" :data-state="status" :data-fallback="usingFallback || undefined" :aria-busy="status === 'loading' || undefined">
        <Media :key="`${source}:${attempt}`" :src="source" :alt="alt" :srcset="usingFallback ? undefined : srcset" :sizes="usingFallback ? undefined : sizes" :loading="loading" :decoding="decoding" :fetchpriority="fetchpriority" :crossorigin="crossorigin" :referrerpolicy="referrerpolicy" :width="typeof width === 'number' ? width : undefined" :height="typeof height === 'number' ? height : undefined" class="qk-image__media" :style="{ objectFit: fit, objectPosition: position }" @state="status = $event" @load="loaded" @error="failed" />
        <span v-if="status === 'loading'" class="qk-image__placeholder" role="status"><slot name="placeholder" :src="source" :fallback="usingFallback"><QuireIcon name="image" :size="24" /><span class="sr-only">{{ text.loading }}</span></slot></span>
        <span v-if="status === 'error'" class="qk-image__error" role="status"><slot name="error" :retry="retry" :src="source" :fallback="usingFallback"><QuireIcon name="image" :size="24" /><span>{{ text.failed }}</span><QuireButton variant="outline" @click="retry">{{ text.retry }}</QuireButton></slot></span>
        <button v-if="preview && !usingFallback && status === 'loaded'" type="button" class="qk-image__trigger" :aria-label="text.preview(title || alt || undefined)" @click="openPreview(open, $event)"><span v-if="previewHint" class="qk-image__hint"><QuireIcon name="zoomIn" :size="16" />{{ text.previewHint }}</span></button>
      </span>
    </template>
  </QuireImagePreview>
</template>
