<script setup lang="ts">
import QuireThemePortal from "../theme-provider/portal.vue";
import { Dialog } from '@ark-ui/vue/dialog';
import { computed, nextTick, onMounted, ref, shallowRef, useSlots, watch } from 'vue';
import { QuireIconButton } from '../button';
import QuireIcon from '../icon/icon.vue';
import Stage from './stage.vue';
import Toolbar from './toolbar/toolbar.vue';
import PreviewThemeSurface from './theme-surface.vue';
import { resolveToolbarLayout } from './toolbar/layout';
import { createMaskDismiss } from './mask-dismiss';
import type { QuireKitImagePreviewItem, QuireKitImagePreviewLabels, QuireKitImagePreviewOptions } from './types';
defineOptions({ inheritAttrs: false });
const props = defineProps<{
  /** Ordered current group. */ items: readonly QuireKitImagePreviewItem[];
  /** Normalized active index. */ index: number;
  /** Whether navigation wraps. */ loop: boolean;
  /** Whether thumbnails are visible. */ thumbnails: boolean;
  /** Shared appearance and visibility options. */ options: QuireKitImagePreviewOptions;
  /** Resolved interface and accessible copy. */ labels: QuireKitImagePreviewLabels;
  /** Unique surface identity. */ id: string;
}>();
const emit = defineEmits<{ /** Index intent. */ select: [index: number]; /** Mask dismissal intent. */ close: [] }>();
const mask = createMaskDismiss(() => props.options.closeOnMaskClick !== false, () => emit('close'));
const appearance = computed(() => ({
  '--qk-preview-mask-color': props.options.maskColor ?? '#000',
  '--qk-preview-mask-opacity': Number.isFinite(props.options.maskOpacity) ? Math.max(0, Math.min(1, props.options.maskOpacity!)) : .8,
  '--qk-preview-mask-blur': `${Number.isFinite(props.options.maskBlur) ? Math.max(0, props.options.maskBlur!) : 0}px`
}));
const current = computed(() => props.items[props.index]);
const title = computed(() => current.value?.title?.trim());
const slots = useSlots();
const toolbarHasCounter = computed(() => resolveToolbarLayout(props.options.toolbar, !!slots.actions, !!slots['toolbar-item']).includes('counter'));
const stage = shallowRef<InstanceType<typeof Stage> | null>(null);
const header = shallowRef<HTMLElement | null>(null);
const strip = shallowRef<HTMLElement | null>(null);
const mounted = ref(false);
onMounted(() => { mounted.value = true; });
/** @param delta - Requested direction. */
function navigate(delta: number): void {
  const count = props.items.length; if (count < 2) return;
  const index = props.index + delta;
  emit('select', props.loop ? (index + count) % count : Math.max(0, Math.min(count - 1, index)));
}
/** @param event - Keyboard intent scoped to the open dialog. */
function keydown(event: KeyboardEvent): void {
  if (event.altKey || event.ctrlKey || event.metaKey || (event.target as HTMLElement).closest('input,textarea,select,[contenteditable=true]')) return;
  if ((event.target as HTMLElement).closest('[data-preview-thumbnails]')) return;
  const actions: Record<string, () => void> = {
    ArrowLeft: () => navigate(-1), ArrowRight: () => navigate(1),
    '+': () => stage.value?.zoomBy(1.25), '=': () => stage.value?.zoomBy(1.25), '-': () => stage.value?.zoomBy(.8),
    '0': () => stage.value?.fit(), '1': () => stage.value?.actual(), r: () => stage.value?.rotate(), R: () => stage.value?.rotate()
  };
  if (actions[event.key]) { event.preventDefault(); event.stopPropagation(); actions[event.key]!(); }
}
/** @param event - Thumbnail navigation key. @param index - Focused thumbnail index. */
function thumbnailKey(event: KeyboardEvent, index: number): void {
  let next = index;
  if (event.key === 'ArrowRight') next++;
  else if (event.key === 'ArrowLeft') next--;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = props.items.length - 1;
  else return;
  event.preventDefault(); emit('select', Math.max(0, Math.min(props.items.length - 1, next)));
  void nextTick(() => strip.value?.querySelector<HTMLButtonElement>(`[data-index="${Math.max(0, Math.min(props.items.length - 1, next))}"]`)?.focus());
}
/** Keeps the active thumbnail visible and retains keyboard ownership after navigation. */
function syncSelectedImage(): void {
  const document = header.value?.ownerDocument;
  const focused = document?.activeElement;
  const ownedFocus = focused && header.value?.parentElement?.contains(focused);
  void nextTick(() => {
    strip.value?.querySelector('[aria-current=true]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    // Reaching a boundary disables the clicked navigation button. Browsers then
    // focus body, outside the dialog's key handler; restore a stable local control.
    if (ownedFocus && focused.matches(':disabled') && document?.activeElement === document.body) {
      header.value?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    }
  });
}
watch(() => props.index, syncSelectedImage);
</script>
<template>
  <Teleport :to="options.portalTarget ?? 'body'" :disabled="!mounted">
    <QuireThemePortal>
      <PreviewThemeSurface :scheme="options.scheme ?? 'dark'">
        <Dialog.Content v-bind="$attrs" :id="id" class="qk-image-preview" :data-qk-scheme="options.scheme ?? 'dark'" :style="appearance" @keydown="keydown" @pointerdown.capture="mask.down" @pointermove.capture="mask.move" @pointerup.capture="mask.up" @pointercancel.capture="mask.cancel">
          <div class="qk-image-preview__mask" aria-hidden="true" />
          <header ref="header" class="qk-image-preview__header">
            <div class="qk-image-preview__heading"><Dialog.Title :class="title ? 'qk-image-preview__title' : 'sr-only'">{{ title || labels.title }}</Dialog.Title><span v-if="items.length && !toolbarHasCounter" class="qk-image-preview__count" role="status" aria-live="polite" :aria-label="labels.current">{{ labels.position(index + 1, items.length) }}</span></div>
            <Dialog.CloseTrigger as-child><QuireIconButton :id="`${id}-close`" :label="labels.close" :title="`${labels.close} (Esc)`" variant="text" size="md" class="qk-image-preview__close"><QuireIcon name="close" :size="20" /></QuireIconButton></Dialog.CloseTrigger>
          </header>
          <div class="qk-image-preview__body" :data-navigation="options.navigation !== false && items.length > 1">
            <Stage v-if="current" :key="`${current.id}:${current.src}`" ref="stage" :item="current" :labels="labels" @navigate="navigate" />
            <div v-else class="qk-image-preview__status" role="status">{{ labels.empty }}</div>
            <template v-if="options.navigation !== false && items.length > 1">
              <QuireIconButton class="qk-image-preview__previous" :label="labels.previous" :title="`${labels.previous} (←)`" variant="text" size="md" :disabled="!loop && index === 0" @click="navigate(-1)"><QuireIcon name="chevronLeft" :size="20" /></QuireIconButton>
              <QuireIconButton class="qk-image-preview__next" :label="labels.next" :title="`${labels.next} (→)`" variant="text" size="md" :disabled="!loop && index === items.length - 1" @click="navigate(1)"><QuireIcon name="chevronRight" :size="20" /></QuireIconButton>
            </template>
          </div>
          <footer class="qk-image-preview__footer">
            <Dialog.Description v-if="options.caption !== false && current?.description" class="qk-image-preview__caption">{{ current.description }}</Dialog.Description>
            <Toolbar v-if="options.toolbar !== false" :configuration="options.toolbar ?? true" :index="index" :count="items.length" :loop="loop" :ready="stage?.ready ?? false" :scale="stage?.scale ?? 1" :minimum="stage?.minimum ?? 1" :labels="labels" @zoom="stage?.zoomBy($event)" @fit="stage?.fit()" @rotate="stage?.rotate($event)" @navigate="navigate">
              <template v-if="$slots.actions" #default><slot name="actions" :item="current" :index="index" /></template>
              <template v-if="$slots['toolbar-item']" #item="context"><slot name="toolbar-item" v-bind="context" :item="current" :index="index" /></template>
            </Toolbar>
            <div v-if="options.toolbar === false && $slots.actions" class="qk-image-preview__tools"><slot name="actions" :item="current" :index="index" /></div>
            <nav v-if="thumbnails && items.length > 1" ref="strip" class="qk-image-preview__thumbnails" :aria-label="labels.thumbnails" data-preview-thumbnails>
              <button v-for="(item, position) in items" :key="item.id" type="button" class="qk-image-preview__thumbnail" :data-index="position" :tabindex="position === index ? 0 : -1" :aria-current="position === index || undefined" :aria-label="labels.thumbnail(position + 1, item.title || item.alt)" @click="emit('select', position)" @keydown="thumbnailKey($event, position)"><img :src="item.thumbnail || item.src" alt="" loading="lazy" draggable="false" :style="item.background ? { backgroundColor: item.background } : undefined"></button>
            </nav>
          </footer>
        </Dialog.Content>
      </PreviewThemeSurface>
    </QuireThemePortal>
  </Teleport>
</template>
