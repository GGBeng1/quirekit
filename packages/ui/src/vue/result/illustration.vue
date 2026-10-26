<script setup lang="ts">
import type { QuireKitResultStatus } from './types';

defineProps<{ /** Result meaning, supplied by the host component. */ readonly status: QuireKitResultStatus }>();
</script>

<template>
  <svg class="qk-result__art" :data-illustration="status" viewBox="0 0 160 104" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <ellipse cx="80" cy="93" rx="55" ry="5" fill="var(--qk-color-surface-subtle)" />
    <g stroke="var(--qk-color-border-default)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <!-- Opaque surfaces hide rear edges; only the final status mark carries the accent. -->
      <g v-if="status === 'success'">
        <rect x="35" y="20" width="66" height="68" rx="6" fill="var(--qk-color-surface-subtle)" transform="rotate(-8 68 54)" />
        <path d="M51 11H96L112 27V85Q112 89 108 89H55Q51 89 51 85Z" fill="var(--qk-color-surface-page)" />
        <path d="M96 11V27H112" fill="var(--qk-color-surface-subtle)" />
        <path d="M64 37H91M64 47H98M64 57H87M64 73H77" />
        <circle cx="112" cy="72" r="19" fill="var(--qk-color-surface-page)" />
        <path d="m103 72 6 6 12-13" stroke="var(--qk-result-accent)" stroke-width="2" />
        <path d="M25 35H31M28 32V38M126 23L131 18" />
      </g>
      <g v-else-if="status === 'error'">
        <path d="M38 14H84L99 29V47L88 43 77 53 66 46 55 54 38 48Z" fill="var(--qk-color-surface-page)" />
        <path d="M84 14V29H99M51 30H70M51 39H79" />
        <path d="m36 58 17 6 11-8 11 7 11-10 11 4v29a5 5 0 0 1-5 5H41a5 5 0 0 1-5-5Z" fill="var(--qk-color-surface-subtle)" />
        <path d="M50 76H77M50 83H65" />
        <circle cx="116" cy="69" r="20" fill="var(--qk-color-surface-page)" />
        <path d="m109 62 14 14m0-14-14 14" stroke="var(--qk-result-accent)" stroke-width="2" />
        <path d="M113 32L117 27M123 40H130M20 70H26" />
      </g>
      <g v-else-if="status === 'warning'">
        <rect x="35" y="19" width="75" height="70" rx="6" fill="var(--qk-color-surface-subtle)" />
        <rect x="42" y="23" width="61" height="60" rx="3" fill="var(--qk-color-surface-page)" />
        <rect x="56" y="13" width="33" height="13" rx="4" fill="var(--qk-color-surface-page)" />
        <path d="M54 41H60M68 41H90M54 53H60M68 53H82M54 65H60M68 65H76" />
        <path d="M110 51Q113 46 116 51L136 85Q139 90 133 90H93Q87 90 90 85Z" fill="var(--qk-color-surface-page)" />
        <path d="M113 62V74" stroke="var(--qk-result-accent)" stroke-width="2" />
        <circle cx="113" cy="81" r="1.5" fill="var(--qk-result-accent)" stroke="none" />
        <path d="M20 43H26M23 40V46M123 24H130" />
      </g>
      <g v-else-if="status === 'forbidden'">
        <path d="M44 90V17Q44 12 49 12H101Q106 12 106 17V90" fill="var(--qk-color-surface-subtle)" />
        <path d="M53 90V22H97V90Z" fill="var(--qk-color-surface-page)" />
        <rect x="62" y="31" width="26" height="25" rx="3" fill="var(--qk-color-surface-subtle)" />
        <path d="M85 64H89M35 90H116" />
        <path d="M105 65V56a10 10 0 0 1 20 0v9" stroke="var(--qk-color-icon-secondary)" />
        <rect x="98" y="64" width="34" height="27" rx="5" fill="var(--qk-color-surface-page)" />
        <circle cx="115" cy="75" r="3" stroke="var(--qk-result-accent)" />
        <path d="M115 78V82" stroke="var(--qk-result-accent)" stroke-width="2" />
        <path d="M25 32H31M126 29H132M129 26V32" />
      </g>
      <g v-else-if="status === 'not-found'">
        <path d="M39 24H78L92 38V89H39Z" fill="var(--qk-color-surface-subtle)" />
        <path d="M63 12H106L122 28V84H63Z" fill="var(--qk-color-surface-page)" stroke-dasharray="4 4" />
        <path d="M106 12V28H122M77 40H106M77 49H96" stroke-dasharray="3 4" />
        <circle cx="101" cy="68" r="19" fill="var(--qk-color-surface-page)" />
        <path d="m115 82 12 12" stroke="var(--qk-color-icon-secondary)" stroke-width="3" />
        <path d="M94 68H108" stroke="var(--qk-result-accent)" stroke-width="2" />
        <path d="M25 50H31M28 47V53M45 11H51" />
      </g>
      <g v-else>
        <rect x="33" y="17" width="94" height="64" rx="6" fill="var(--qk-color-surface-subtle)" />
        <path d="M29 29H122Q128 29 128 35V77Q128 83 122 83H65L52 93V83H29Q23 83 23 77V35Q23 29 29 29Z" fill="var(--qk-color-surface-page)" />
        <path d="M37 44H75M37 54H65M37 69H78" />
        <circle cx="104" cy="55" r="16" fill="var(--qk-color-surface-subtle)" />
        <circle cx="104" cy="47" r="1.5" fill="var(--qk-result-accent)" stroke="none" />
        <path d="M102 54H104V64M101 64H107" stroke="var(--qk-result-accent)" stroke-width="2" />
        <path d="M137 38H143M140 35V41M17 17H23" />
      </g>
    </g>
  </svg>
</template>
