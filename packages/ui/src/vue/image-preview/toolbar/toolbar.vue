<script setup lang="ts">
import { computed, useSlots } from 'vue';
import { QuireButton, QuireIconButton } from '../../button';
import QuireIcon from '../../icon/icon.vue';
import { resolveToolbarLayout } from './layout';
import type { QuireKitImagePreviewLabels } from '../types';
import type { QuireKitImagePreviewToolbar } from './types';
const props = defineProps<{
  /** Public toolbar configuration. */ configuration: QuireKitImagePreviewToolbar;
  /** Whether transform actions are available. */ ready: boolean;
  /** Natural image scale. */ scale: number;
  /** Smallest permitted scale, independent of fit. */ minimum: number;
  /** Current zero-based group position. */ index: number;
  /** Number of images. */ count: number;
  /** Whether navigation wraps at group boundaries. */ loop: boolean;
  /** Resolved control and position copy. */ labels: QuireKitImagePreviewLabels;
}>();
const slots = useSlots();
const layout = computed(() => resolveToolbarLayout(props.configuration, !!slots.default, !!slots.item));
const emit = defineEmits<{
  /** Relative zoom intent. */ zoom: [factor: number];
  /** Fit entire image. */ fit: [];
  /** Rotation direction. */ rotate: [direction: number];
  /** Relative group navigation. */ navigate: [direction: number];
}>();
const buttons = computed(() => ({
  zoomOut: { label: props.labels.zoomOut, title: `${props.labels.zoomOut} (-)`, icon: 'zoomOut', disabled: !props.ready || props.scale <= props.minimum + .001, run: () => emit('zoom', .8) },
  zoomIn: { label: props.labels.zoomIn, title: `${props.labels.zoomIn} (+)`, icon: 'zoomIn', disabled: !props.ready || props.scale >= 8, run: () => emit('zoom', 1.25) },
  fit: { label: props.labels.fit, title: `${props.labels.fit} (0)`, icon: 'scan', disabled: !props.ready, run: () => emit('fit') },
  rotateLeft: { label: props.labels.rotateLeft, title: props.labels.rotateLeft, icon: 'rotateCcw', disabled: !props.ready, run: () => emit('rotate', -1) },
  rotateRight: { label: props.labels.rotateRight, title: `${props.labels.rotateRight} (R)`, icon: 'rotateCw', disabled: !props.ready, run: () => emit('rotate', 1) },
  previous: { label: props.labels.previous, title: `${props.labels.previous} (←)`, icon: 'chevronLeft', disabled: props.count < 2 || (!props.loop && props.index <= 0), run: () => emit('navigate', -1) },
  next: { label: props.labels.next, title: `${props.labels.next} (→)`, icon: 'chevronRight', disabled: props.count < 2 || (!props.loop && props.index >= props.count - 1), run: () => emit('navigate', 1) }
} as const));
</script>
<template>
  <div v-if="layout.length" class="qk-image-preview__tools" role="group" :aria-label="labels.toolbar">
    <template v-for="(part, position) in layout" :key="typeof part === 'object' ? `slot:${part.slot}` : part === 'separator' ? `separator:${position}` : part">
      <slot v-if="typeof part === 'object'" name="item" :slot="part.slot" :scale="scale" :ready="ready" :count="count" />
      <slot v-else-if="part === 'actions'" />
      <span v-else-if="part === 'separator'" class="qk-image-preview__divider" aria-hidden="true" />
      <span v-else-if="part === 'counter'" class="qk-image-preview__count" role="status" aria-live="polite" :aria-label="labels.current">{{ labels.position(count ? index + 1 : 0, count) }}</span>
      <QuireButton v-else-if="part === 'scale'" class="qk-image-preview__scale" variant="text" size="md" :title="`${labels.fit} (0)`" :style="{ textDecoration: 'none' }" :disabled="!ready" :aria-label="labels.fit" @click="emit('fit')">{{ ready ? `${Math.round(scale * 100)}%` : '—' }}</QuireButton>
      <QuireIconButton v-else :label="buttons[part].label" :title="buttons[part].title" variant="text" size="md" :disabled="buttons[part].disabled" @click="buttons[part].run()"><QuireIcon :name="buttons[part].icon" :size="20" /></QuireIconButton>
    </template>
  </div>
</template>
