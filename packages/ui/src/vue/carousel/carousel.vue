<script setup lang="ts" generic="Item extends QuireKitCarouselItem">
import { Carousel, useCarousel } from '@ark-ui/vue/carousel';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useAttrs, watch } from 'vue';
import QuireButton from '../button/button.vue';
import QuireIcon from '../icon/icon.vue';
import CarouselItem from './item.vue';
import CardStage from './card-stage.vue';
import { useQuireKitMessages } from '../locale-provider/context';
import type { QuireKitCarouselItem, QuireKitCarouselProps, QuireKitCarouselSlots } from './types';

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<QuireKitCarouselProps<Item>>(), {
  defaultPage: 0, loop: true, orientation: 'horizontal', slidesPerPage: 1, slidesPerMove: 1,
  arrows: true, dots: true, draggable: true, disabled: false,
  effect: 'slide', autoplay: false, cardWidth: '50%'
});
const text = useQuireKitMessages('carousel');
/** Current zero-based page, synchronized with Ark's measured snap points. */
const page = defineModel<number>('page');
defineSlots<QuireKitCarouselSlots<Item>>();
const attrs = useAttrs();
const viewport = ref<HTMLElement>();
const inheritedDirection = ref<'ltr' | 'rtl'>('ltr');
const reducedMotion = ref(false);
const perPage = computed(() => Math.min(Math.max(1, props.items.length), positiveInteger(props.slidesPerPage)));
const perMove = computed(() => positiveInteger(props.slidesPerMove));
const direction = computed(() => props.dir ?? inheritedDirection.value);
const api = useCarousel(computed(() => ({
  dir: direction.value,
  slideCount: props.items.length,
  // The card stage owns its page; Ark only drives the scrolling effect.
  page: props.effect === 'card' || page.value === undefined ? undefined : Math.max(0, Math.floor(page.value || 0)),
  defaultPage: Math.max(0, Math.floor(props.defaultPage || 0)),
  loop: props.loop && props.items.length > perPage.value,
  orientation: props.orientation,
  slidesPerPage: perPage.value,
  slidesPerMove: perMove.value,
  spacing: 'var(--qk-space-surface-compact)',
  allowMouseDrag: props.draggable && !props.disabled && !reducedMotion.value,
  autoplay: props.effect === 'slide' && !props.disabled && !reducedMotion.value && props.autoplay !== false && props.autoplay !== 0
    ? { delay: typeof props.autoplay === 'number' ? props.autoplay : 4000 } : false,
  translations: { prevTrigger: text.value.previous, nextTrigger: text.value.next, indicator: pageName },
  onPageChange: ({ page: value }) => { if (props.effect !== 'card') page.value = value; }
})));
const viewportProps = computed(() => {
  const { onFocusin: _focus, onFocusout: _blur, ...rest } = api.value.getItemGroupProps();
  // Keyboard navigation belongs to indicators; slide editors keep their own arrow/Home/End keys.
  return { ...rest, style: [rest.style, { ...(api.value.isDragging ? { scrollSnapType: 'none' } : {}), ...(props.orientation === 'vertical' ? { height: props.height ?? '20rem' } : {}), ...(props.disabled ? { overflow: 'hidden' } : {}) }] };
});
const indicatorGroupProps = computed(() => ({
  ...api.value.getIndicatorGroupProps(),
  ...(props.disabled ? { onKeydown: blockNavigation } : {})
}));
const pageCount = computed(() => api.value.pageSnapPoints.length);
const previousIcon = computed(() => props.orientation === 'vertical' ? 'chevronUp' : direction.value === 'rtl' ? 'chevronRight' : 'chevronLeft');
const nextIcon = computed(() => props.orientation === 'vertical' ? 'chevronDown' : direction.value === 'rtl' ? 'chevronLeft' : 'chevronRight');
let motionQuery: MediaQueryList | undefined;
// The card stage owns its own page; it reads and writes the same public model.
const localCardPage = ref(Math.max(0, Math.floor(props.defaultPage || 0)));
const cardPage = computed({
  get: () => Math.min(Math.max(0, page.value ?? localCardPage.value), Math.max(0, props.items.length - 1)),
  set: (value: number) => { localCardPage.value = value; page.value = value; }
});

/** Normalizes public slide counts without allowing invalid CSS grid dimensions.
 * @param value - Caller supplied count.
 * @returns A finite positive integer.
 */
function positiveInteger(value: number): number { return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : 1; }
/** @param index - Zero-based destination page. @returns Localized indicator name. */
function pageName(index: number): string { return text.value.page(index); }
/** @param item - Original content item. @param index - Item position. @returns Localized slide name. */
function slideName(item: Item, index: number): string { return text.value.slide(item.label, index, props.items.length); }
/** @param event - Navigation event ignored while the carousel is disabled. */
function blockNavigation(event: Event): void { event.preventDefault(); }
/** @param destination - Destination page or the previous/next command. */
function navigate(destination: number | 'previous' | 'next'): void {
  if (props.disabled) return;
  if (destination === 'previous') api.value.scrollPrev(reducedMotion.value);
  else if (destination === 'next') api.value.scrollNext(reducedMotion.value);
  else api.value.scrollTo(destination, reducedMotion.value);
}
/** @param destination - Logical direction. @returns Upstream button anatomy with one motion-aware action. */
function triggerProps(destination: 'previous' | 'next') {
  const upstream = destination === 'previous' ? api.value.getPrevTriggerProps() : api.value.getNextTriggerProps();
  return { id: upstream.id, dir: upstream.dir, 'aria-label': upstream['aria-label'],
    'aria-controls': upstream['aria-controls'], 'data-scope': 'carousel',
    'data-part': destination === 'previous' ? 'prev-trigger' : 'next-trigger',
    onClick: () => navigate(destination) };
}
/** @param destination - Page represented by this indicator. @returns Upstream anatomy with the motion-aware click adapter. */
function indicatorProps(destination: number) {
  return { ...api.value.getIndicatorProps({ index: destination }), onClick: () => navigate(destination), disabled: props.disabled,
    ...(destination === api.value.page ? { 'aria-current': 'true' as const } : {}),
    tabindex: destination === api.value.page && !props.disabled ? 0 : -1 };
}
/** Reads the current OS motion preference without adding another animation controller. */
function updateMotion(): void { reducedMotion.value = motionQuery?.matches ?? false; }
onMounted(() => {
  const parent = viewport.value?.parentElement?.parentElement;
  inheritedDirection.value = parent && getComputedStyle(parent).direction === 'rtl' ? 'rtl' : 'ltr';
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  updateMotion();
  motionQuery.addEventListener('change', updateMotion);
});
onBeforeUnmount(() => motionQuery?.removeEventListener('change', updateMotion));
watch([() => api.value.page, () => props.items.length], async () => {
  if (props.effect === 'card') return;
  await nextTick();
  // Ark's keyboard handler keeps its navigation semantics; refresh cancels smooth drift for reduced motion.
  if (reducedMotion.value) api.value.refresh();
  if (!props.items.length && page.value !== undefined) page.value = 0;
}, { flush: 'post' });
</script>
<template>
  <CardStage v-if="effect === 'card'" v-model:page="cardPage" v-bind="attrs" :items="items" :label="label" :loop="loop" :dir="direction"
    :height="height" :card-width="cardWidth" :arrows="arrows" :dots="dots" :disabled="disabled" :autoplay="autoplay">
    <template #default="{ item, index, inView }"><slot :item="(item as Item)" :index="index" :in-view="inView">{{ item.label }}</slot></template>
    <template v-if="$slots.empty" #empty><slot name="empty" /></template>
    <template v-if="$slots.page" #page="slotProps"><slot name="page" v-bind="slotProps" /></template>
  </CardStage>
  <Carousel.RootProvider v-else v-bind="attrs" :value="api" class="qk-carousel" :aria-label="label"
    :data-disabled="disabled ? '' : undefined">
    <div ref="viewport" v-bind="viewportProps" class="qk-carousel__viewport" tabindex="-1">
      <CarouselItem v-for="(item, index) in items" :key="item.key" :index="index" :label="slideName(item, index)"
        :initially-visible="index >= api.page * perMove && index < api.page * perMove + perPage">
        <template #default="{ inView }"><slot :item="item" :index="index" :in-view="inView">{{ item.label }}</slot></template>
      </CarouselItem>
      <div v-if="!items.length" class="qk-carousel__empty"><slot name="empty">{{ text.empty }}</slot></div>
    </div>
    <div v-if="items.length" class="qk-carousel__footer">
      <span class="qk-carousel__progress"><slot name="page" :page="api.page" :page-count="pageCount">{{ api.page + 1 }} / {{ pageCount }}</slot></span>
      <div v-if="dots && pageCount > 1" v-bind="indicatorGroupProps" role="group" :aria-label="text.pages" class="qk-carousel__indicators">
        <button v-for="(_, index) in api.pageSnapPoints" :key="index" v-bind="indicatorProps(index)" class="qk-carousel__indicator"><span aria-hidden="true" /></button>
      </div>
      <div v-if="arrows || !dots" v-bind="api.getControlProps()" :class="['qk-carousel__controls', !arrows && 'qk-carousel__controls--keyboard']">
        <QuireButton v-bind="triggerProps('previous')" :disabled="disabled || !api.canScrollPrev || pageCount <= 1" variant="outline" size="sm"><QuireIcon :name="previousIcon" :size="16" /></QuireButton>
        <QuireButton v-bind="triggerProps('next')" :disabled="disabled || !api.canScrollNext || pageCount <= 1" variant="outline" size="sm"><QuireIcon :name="nextIcon" :size="16" /></QuireButton>
      </div>
    </div>
  </Carousel.RootProvider>
</template>
