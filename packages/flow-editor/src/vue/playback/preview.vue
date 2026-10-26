<script setup lang="ts">
defineProps<{ /** Finite preset to illustrate; this thumbnail has no independent clock. */ value: string }>();
</script>
<template>
  <svg class="qk-flow-playback__effect-preview" viewBox="0 0 64 28" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
    <template v-if="value.startsWith('flow-') || ['dot','beam','token','vector'].includes(value)">
      <path d="M4 22 H22 Q30 22 30 14 V10 Q30 6 38 6 H60" opacity=".24" />
      <path v-if="value.startsWith('flow-')" d="M4 22 H22 Q30 22 30 14 V10 Q30 6 38 6 H60" :stroke-width="value === 'flow-dot' ? 2.8 : 1.5" :stroke-dasharray="value === 'flow-dot' ? '.01 10' : value === 'flow-beam' ? '10 24' : '4 5'" />
      <circle v-else-if="value === 'dot'" cx="30" cy="14" r="2.5" fill="currentColor" stroke="none" />
      <path v-else-if="value === 'beam'" d="M24 22 Q30 22 30 14 V10" stroke-width="2" />
      <g v-else><rect x="22" y="6" width="22" height="16" rx="3" /><path v-if="value === 'vector'" d="M27 16 V13 M31 16 V10 M35 16 V14 M39 16 V8" /><text v-else x="33" y="18" stroke="none" fill="currentColor" font-size="10" text-anchor="middle">A</text></g>
    </template>
    <template v-else-if="value === 'halo'"><circle cx="32" cy="14" r="4" /><circle cx="32" cy="14" r="9" opacity=".5" /><circle cx="32" cy="14" r="13" opacity=".2" /></template>
    <template v-else><rect x="18" y="5" width="28" height="18" rx="3" :opacity="value === 'appear' ? .4 : 1" /><rect v-if="value === 'pulse'" x="18" y="5" width="28" height="18" rx="3" fill="currentColor" opacity=".12" /></template>
  </svg>
</template>
