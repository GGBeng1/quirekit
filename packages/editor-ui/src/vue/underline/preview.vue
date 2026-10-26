<script setup lang="ts">
import { computed } from "vue";
const props = defineProps<{
  /** Standard underline token illustrated by this sample. */
  value: string;
}>();
const heavy = computed(() => /heavy|thick/iu.test(props.value));
const wave = computed(() => /wav/iu.test(props.value));
const double = computed(() => props.value === "double" || props.value === "wavyDouble");
const dash = computed(() => /dotted/iu.test(props.value) ? '1 2' : /dotdot|dotdotheavy/iu.test(props.value) ? '6 2 1 2 1 2'
  : /dotdash|dashdot/iu.test(props.value) ? '6 2 1 2' : /long/iu.test(props.value) ? '10 3' : /dash/iu.test(props.value) ? '5 3' : undefined);
</script>
<template>
  <svg viewBox="0 0 72 20" class="qk-editor-underline-sample" aria-hidden="true">
    <text v-if="value === 'none'" x="36" y="14" text-anchor="middle" fill="currentColor" font-size="12">—</text>
    <template v-else>
      <g v-for="line in double ? 2 : 1" :key="line" :transform="`translate(0, ${(line - 1) * 5})`" fill="none" stroke="currentColor" :stroke-width="heavy ? 2 : 1">
        <path vector-effect="non-scaling-stroke" v-if="wave" d="M4 8 Q6 4 8 8 T16 8 T24 8 T32 8 T40 8 T48 8 T56 8 T64 8 T68 8" />
        <path vector-effect="non-scaling-stroke" v-else-if="value === 'words'" d="M4 10 H28 M40 10 H68" />
        <path vector-effect="non-scaling-stroke" v-else d="M4 8 H68" :stroke-dasharray="dash" />
      </g>
    </template>
  </svg>
</template>
