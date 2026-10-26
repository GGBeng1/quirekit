<script setup lang="ts">
import { computed, useId } from "vue";
import type { QuireKitBadgeColor, QuireKitBadgeSize, QuireKitBadgeVariant } from "../../components/badge";
import { badgeCount } from "./count";
import { useQuireKitMessages } from "../locale-provider/context";
/** Noninteractive count or dot, optionally attached to a host element. */
interface Props {
  /** Existing semantic color family. */
  readonly color?: QuireKitBadgeColor;
  /** Marker appearance. */
  readonly variant?: QuireKitBadgeVariant;
  /** Marker density, independent of its host's control size. */
  readonly size?: QuireKitBadgeSize;
  /** Count to display; omitted counts produce no marker unless dot is true. */
  readonly count?: number;
  /** Largest visually untruncated count. */
  readonly max?: number;
  /** Render a dot instead of a number. */
  readonly dot?: boolean;
  /** Keep a normalized zero count visible. */
  readonly showZero?: boolean;
  /** Complete readable meaning, especially for dots and truncated counts. */
  readonly label?: string;
}
const props = withDefaults(defineProps<Props>(), { color: "danger", variant: "solid", size: "sm", max: 99, dot: false, showZero: false });
defineSlots<{
  /** Host button, icon or avatar; bind descriptionId to its aria-describedby if interactive. */
  default?: (context: { descriptionId: string | undefined }) => unknown;
}>();
const text = useQuireKitMessages("badge");
const id = `qk-badge-${useId()}`;
const formatted = computed(() => badgeCount(props.count ?? 0, props.max));
const visible = computed(() => props.dot || (props.count !== undefined && (props.showZero || formatted.value.accessible !== "0")));
const description = computed(() => props.label || (props.dot ? text.value.dot : formatted.value.accessible));
</script>
<template>
  <span class="qk-badge">
    <slot :description-id="visible ? id : undefined" />
    <span v-if="visible" aria-hidden="true" :class="['qk-badge__indicator', `qk-badge--${color}`, `qk-badge--${variant}`, `qk-badge--${size}`, { 'qk-badge__indicator--attached': !!$slots.default, 'qk-badge__indicator--dot': dot }]">{{ dot ? '' : formatted.visual }}</span>
    <span v-if="visible" :id="id" class="sr-only">{{ description }}</span>
  </span>
</template>
