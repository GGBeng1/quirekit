<script setup lang="ts">
import { computed } from 'vue';
import type { QuireKitShimmerProps } from '../../components/shimmer';

const props = withDefaults(defineProps<QuireKitShimmerProps>(), { active: true });
const style = computed(() => ({
  '--qk-shimmer-duration': props.duration !== undefined && Number.isFinite(props.duration) && props.duration > 0
    ? `${props.duration}ms` : undefined
}));
</script>

<template>
  <span class="qk-shimmer" :data-active="active" :style="style">{{ text }}</span>
</template>
