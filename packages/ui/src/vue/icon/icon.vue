<script setup lang="ts">
import { computed, inject } from "vue";
import type {
  QuireKitIconData,
  QuireKitIconSize
} from "../../components/icon";
import { quireKitIconRegistryKey } from "./context";

/** Public properties for the Vue SVG icon renderer. */
interface Props {
  /** Registered product icon name. Ignored when data is supplied directly. */
  readonly name?: string | undefined;
  /** Normalized SVG icon data rendered directly without a registry lookup. */
  readonly data?: QuireKitIconData | undefined;
  /** Optical icon box size in CSS pixels. */
  readonly size?: QuireKitIconSize | undefined;
  /** Accessible name for a meaningful standalone icon; omit for decoration. */
  readonly label?: string | undefined;
  /** Optional runtime color applied to the icon's accent geometry. */
  readonly accentColor?: string | undefined;
  /** Whether stateful artwork should replace its accent with an empty-state mark. */
  readonly empty?: boolean | undefined;
}

const props = withDefaults(defineProps<Props>(), {
  name: undefined,
  data: undefined,
  size: 16,
  label: undefined,
  accentColor: undefined,
  empty: false
});
const providedRegistry = inject(quireKitIconRegistryKey, undefined);
const resolved = computed<QuireKitIconData | undefined>(() =>
  props.data
    ?? (props.name === undefined
      ? undefined
      : providedRegistry?.value.resolve(props.name))
);
const missing = computed(() =>
  props.data === undefined
  && props.name !== undefined
  && !(providedRegistry?.value.has(props.name) ?? false)
);
const iconStyle = computed(() => ({
  ...(props.accentColor === undefined ? {} : { "--qk-icon-accent": props.accentColor }),
  "--qk-icon-optical-scale": String(resolved.value?.opticalScale ?? 1)
}));
</script>

<template>
  <span
    :class="['qk-icon', `qk-icon--${size}`]"
    :role="label === undefined ? undefined : 'img'"
    :aria-label="label"
    :aria-hidden="label === undefined ? 'true' : undefined"
    :data-icon-name="name"
    :data-icon-source="resolved?.source"
    :data-icon-missing="missing ? 'true' : undefined"
    :data-icon-empty="empty ? 'true' : undefined"
    :data-mirror-rtl="resolved?.mirrorInRtl ? 'true' : undefined"
    :style="iconStyle"
    v-html="resolved?.svg ?? ''"
  />
</template>
