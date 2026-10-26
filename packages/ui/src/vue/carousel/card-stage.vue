<script lang="ts">
import type { QuireKitCarouselItem } from './types';

/** Private card stage props, resolved from the public carousel props. */
export interface CarouselCardStageProps {
  /** Content items. */
  readonly items: readonly QuireKitCarouselItem[];
  /** Accessible region name. */
  readonly label: string;
  /** Whether navigation wraps at the ends. */
  readonly loop: boolean;
  /** Resolved reading direction. */
  readonly dir: 'ltr' | 'rtl';
  /** Fixed stage height as a CSS length; omitted, the stage fits the tallest card. */
  readonly height?: string | undefined;
  /** Centered card width as a CSS length. */
  readonly cardWidth: string;
  /** Whether to show the side arrows. */
  readonly arrows: boolean;
  /** Whether to show the item indicators. */
  readonly dots: boolean;
  /** Pauses navigation and autoplay. */
  readonly disabled: boolean;
  /** Autoplay setting from the public props. */
  readonly autoplay: boolean | number;
}
</script>
<script setup lang="ts" generic="Item extends QuireKitCarouselItem">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import QuireIconButton from '../button/icon-button.vue';
import QuireIcon from '../icon/icon.vue';
import { useQuireKitMessages } from '../locale-provider/context';
import type { QuireKitCarouselSlots } from './types';

defineOptions({ inheritAttrs: false });
const props = defineProps<CarouselCardStageProps>();
/** Items with the caller's own fields, as received by the public carousel. */
const items = computed(() => props.items as readonly Item[]);
defineSlots<QuireKitCarouselSlots<Item>>();
/** Current zero-based item; the card effect moves one item per page. */
const page = defineModel<number>('page', { required: true });
const text = useQuireKitMessages('carousel');
const count = computed(() => items.value.length);
const reducedMotion = ref(false);
const paused = ref(false);
const rtl = computed(() => props.dir === 'rtl');

/** @param index - Item position. @returns Signed distance to the current item, wrapped around the ring when looping. */
function offset(index: number): number {
  let distance = index - page.value;
  if (props.loop && count.value > 2) {
    if (distance > count.value / 2) distance -= count.value;
    if (distance < -count.value / 2) distance += count.value;
  }
  return distance;
}
/** @param index - Item position. @returns Stage placement: centered current card, neighbors receding by depth. */
function cardStyle(index: number): Record<string, string | number> {
  const distance = offset(index), depth = Math.abs(distance);
  const side = (rtl.value ? -1 : 1) * Math.sign(distance);
  const shift = depth === 0 ? 0 : 38 + (depth - 1) * 22;
  return {
    transform: `translateX(${side * shift}%) scale(${1 - Math.min(depth, 3) * 0.14})`,
    zIndex: 10 - Math.min(depth, 9),
    opacity: depth > 2 ? 0 : 1
  };
}
const canPrevious = computed(() => !props.disabled && count.value > 1 && (props.loop || page.value > 0));
const canNext = computed(() => !props.disabled && count.value > 1 && (props.loop || page.value < count.value - 1));
/** @param destination - Target item, or one step back or forward. */
function navigate(destination: number | 'previous' | 'next'): void {
  if (props.disabled || !count.value) return;
  const step = destination === 'previous' ? -1 : destination === 'next' ? 1 : 0;
  const next = step === 0 ? (destination as number) : page.value + step;
  page.value = props.loop ? (next + count.value) % count.value : Math.min(count.value - 1, Math.max(0, next));
  restart();
}
/** @param event - Arrow, Home and End keys on the stage move between cards in reading direction. */
function onKeydown(event: KeyboardEvent): void {
  const forward = rtl.value ? 'ArrowLeft' : 'ArrowRight', backward = rtl.value ? 'ArrowRight' : 'ArrowLeft';
  const action = event.key === forward ? 'next' : event.key === backward ? 'previous' : event.key === 'Home' ? 0 : event.key === 'End' ? count.value - 1 : null;
  if (action === null) return;
  event.preventDefault();
  navigate(action);
}

// Autoplay advances one card per interval; hover, focus, disabled and reduced motion stop it.
let timer: ReturnType<typeof setInterval> | undefined;
const delay = computed(() => props.autoplay === true ? 4000 : typeof props.autoplay === 'number' && props.autoplay > 0 ? props.autoplay : 0);
/** Restarts the interval so a manual step receives a full dwell. */
function restart(): void {
  if (timer) clearInterval(timer);
  timer = undefined;
  if (!delay.value || reducedMotion.value || props.disabled || count.value < 2) return;
  timer = setInterval(() => { if (!paused.value && (props.loop || page.value < count.value - 1)) navigate('next'); }, delay.value);
}
let motionQuery: MediaQueryList | undefined;
/** Applies the current OS motion preference. */
function updateMotion(): void { reducedMotion.value = motionQuery?.matches ?? false; restart(); }
onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  motionQuery.addEventListener('change', updateMotion);
  updateMotion();
});
onBeforeUnmount(() => { if (timer) clearInterval(timer); motionQuery?.removeEventListener('change', updateMotion); });
watch([delay, () => props.disabled, count], restart);
watch(count, value => { if (page.value > Math.max(0, value - 1)) page.value = Math.max(0, value - 1); });
</script>
<template>
  <section v-bind="$attrs" class="qk-carousel qk-carousel--card" role="region" aria-roledescription="carousel" :aria-label="label"
    :data-disabled="disabled ? '' : undefined" :data-reduced-motion="reducedMotion ? '' : undefined" :dir="dir"
    @pointerenter="paused = true" @pointerleave="paused = false" @focusin="paused = true" @focusout="paused = false">
    <div class="qk-carousel__stage" :style="{ height, '--qk-carousel-card-width': cardWidth }" :data-fixed="height ? '' : undefined" tabindex="-1" @keydown="onKeydown">
      <div v-for="(item, index) in items" :key="item.key" class="qk-carousel__card" role="group" aria-roledescription="slide"
        :aria-label="text.slide(item.label, index, count)" :aria-hidden="index !== page" :data-current="index === page ? '' : undefined"
        :style="cardStyle(index)" @click="index !== page && navigate(index)">
        <div class="qk-carousel__card-body" :inert="index !== page"><slot :item="item" :index="index" :in-view="index === page">{{ item.label }}</slot></div>
      </div>
      <div v-if="!items.length" class="qk-carousel__empty"><slot name="empty">{{ text.empty }}</slot></div>
      <template v-if="arrows && items.length > 1">
        <QuireIconButton class="qk-carousel__nav qk-carousel__nav--previous" :label="text.previous" :disabled="!canPrevious" variant="outline" size="lg" shape="circle" @click="navigate('previous')">
          <QuireIcon :name="rtl ? 'chevronRight' : 'chevronLeft'" :size="20" />
        </QuireIconButton>
        <QuireIconButton class="qk-carousel__nav qk-carousel__nav--next" :label="text.next" :disabled="!canNext" variant="outline" size="lg" shape="circle" @click="navigate('next')">
          <QuireIcon :name="rtl ? 'chevronLeft' : 'chevronRight'" :size="20" />
        </QuireIconButton>
      </template>
    </div>
    <div v-if="items.length" class="qk-carousel__footer qk-carousel__footer--card">
      <span class="qk-carousel__progress"><slot name="page" :page="page" :page-count="count">{{ page + 1 }} / {{ count }}</slot></span>
      <div v-if="dots && count > 1" role="group" :aria-label="text.pages" class="qk-carousel__indicators">
        <button v-for="(item, index) in items" :key="item.key" type="button" class="qk-carousel__indicator" :aria-label="text.page(index)"
          :aria-current="index === page ? 'true' : undefined" :data-current="index === page ? '' : undefined" :disabled="disabled"
          :tabindex="index === page && !disabled ? 0 : -1" @click="navigate(index)"><span aria-hidden="true" /></button>
      </div>
    </div>
  </section>
</template>
