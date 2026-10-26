<script setup lang="ts">
import { computed } from 'vue';
import { resolveQuireKitFileIdentity } from '../../components/file-icon';
import type { QuireKitFileIconProps } from '../../components/file-icon';

const props = withDefaults(defineProps<QuireKitFileIconProps>(), { size: 32 });
const identity = computed(() => resolveQuireKitFileIdentity(props));
const width = computed(() => Number.isFinite(props.size) && props.size > 0 ? props.size : 32);
</script>

<template>
  <svg class="qk-file-icon" :data-kind="identity.kind" viewBox="0 0 32 40" :width="width" :height="width * 1.25"
    :role="label ? 'img' : undefined" :aria-label="label" :aria-hidden="label ? undefined : true" focusable="false">
    <path fill="currentColor" d="M5 0h15l12 12v23a5 5 0 0 1-5 5H5a5 5 0 0 1-5-5V5a5 5 0 0 1 5-5Z" />
    <path fill="white" fill-opacity=".32" d="M20 0v8a4 4 0 0 0 4 4h8Z" />
    <text class="qk-file-icon__badge" x="16" y="28" text-anchor="middle" :font-size="identity.badge.length === 1 ? 17 : 9">{{ identity.badge }}</text>
  </svg>
</template>
