<script setup lang="ts">
import { computed } from 'vue';
import QuireIcon from '../icon/icon.vue';
import { useQuireKitMessages } from '../locale-provider/context';
import type { QuireKitTimelineItem, QuireKitTimelineProps, QuireKitTimelineSlots } from './types';

const props = withDefaults(defineProps<QuireKitTimelineProps>(), {
  reverse: false, density: 'regular', timePosition: 'inline', timeWidth: '9em'
});
const text = useQuireKitMessages('timeline');
defineSlots<QuireKitTimelineSlots>();
const records = computed(() => {
  const ordered = props.items.map((item, index) => ({ item, index }));
  return props.reverse ? ordered.reverse() : ordered;
});

/** Resolve decorative symbols without deriving a business workflow from record position.
 * @param item - Original event.
 * @returns Registered icon name, or undefined for an ordinary neutral ring.
 */
function eventIcon(item: QuireKitTimelineItem): string | undefined {
  return item.icon ?? ({ neutral: undefined, info: 'circleInfo', success: 'check', warning: 'triangleAlert', danger: 'close' }[item.status ?? 'neutral']);
}

/** Give state a textual equivalent alongside the decorative indicator.
 * @param item - Original event.
 * @returns Localized host label or the status fallback.
 */
function statusText(item: QuireKitTimelineItem): string | undefined {
  return item.statusLabel ?? (item.status ? text.value.status[item.status] : undefined);
}
</script>

<template>
  <div class="qk-timeline" :data-density="density" :data-time-position="timePosition"
    :style="{ '--qk-timeline-time-width': timeWidth }">
    <ol v-if="records.length" class="qk-timeline__list" role="list" :aria-label="label ?? text.label">
      <li v-for="{ item, index } in records" :key="item.key" class="qk-timeline__item" :data-key="item.key"
        :data-indicator="$slots.indicator ? 'custom' : eventIcon(item) ? 'icon' : 'dot'"
        :data-status="item.status ?? 'neutral'" :data-has-time="Boolean(item.time || $slots.time) || undefined">
        <div class="qk-timeline__rail" aria-hidden="true">
          <span class="qk-timeline__indicator">
            <slot name="indicator" :item="item" :index="index">
              <QuireIcon v-if="eventIcon(item)" :name="eventIcon(item)" :size="16" />
              <svg v-else class="qk-timeline__dot" viewBox="0 0 8 8" fill="none" focusable="false">
                <circle cx="4" cy="4" r="3.25" stroke="currentColor" stroke-width="1.5" />
              </svg>
            </slot>
          </span>
          <span class="qk-timeline__connector" />
        </div>
        <component :is="item.dateTime ? 'time' : 'div'" v-if="item.time || $slots.time" class="qk-timeline__time"
          :datetime="item.dateTime || undefined"><slot name="time" :item="item" :index="index">{{ item.time }}</slot></component>
        <div class="qk-timeline__body">
          <div class="qk-timeline__heading">
            <div class="qk-timeline__title"><slot name="title" :item="item" :index="index">{{ item.title }}</slot></div>
            <span v-if="statusText(item)" class="qk-timeline__status">{{ statusText(item) }}</span>
          </div>
          <div v-if="item.description || $slots.description" class="qk-timeline__description">
            <slot name="description" :item="item" :index="index">{{ item.description }}</slot>
          </div>
          <div v-if="$slots.content" class="qk-timeline__content"><slot name="content" :item="item" :index="index" /></div>
        </div>
      </li>
    </ol>
    <div v-else class="qk-timeline__empty"><slot name="empty">{{ text.empty }}</slot></div>
  </div>
</template>
