<script setup lang="ts">
import type { QuireKitEmptyStateScene } from "../../components/empty-state";

/** Decorative artwork selected independently from host text and actions. */
interface Props {
  /** The reusable visual motif to render on the shared canvas. */
  readonly scene: QuireKitEmptyStateScene;
}

defineProps<Props>();
</script>

<template>
  <svg class="qk-empty-state__art" :data-illustration="scene" viewBox="0 0 160 104" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
    <ellipse cx="80" cy="93" rx="55" ry="5" fill="var(--qk-color-surface-subtle)" />
    <g stroke="var(--qk-color-border-default)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <g v-if="scene === 'data'">
        <rect x="28" y="14" width="99" height="68" rx="7" fill="var(--qk-color-surface-subtle)" />
        <rect x="20" y="26" width="118" height="23" rx="5" fill="var(--qk-color-surface-page)" />
        <rect x="26" y="54" width="108" height="23" rx="5" fill="var(--qk-color-surface-page)" />
        <circle cx="34" cy="37.5" r="3" fill="var(--qk-color-border-default)" stroke="none" />
        <circle cx="40" cy="65.5" r="3" fill="var(--qk-color-border-default)" stroke="none" />
        <path d="M47 35H94M47 41H76M53 63H111M53 69H83" />
        <path d="M117 35H125M121 31V39" stroke="var(--qk-color-icon-secondary)" />
        <path d="M50 86H110" stroke-dasharray="2 5" />
      </g>
      <g v-else-if="scene === 'search'">
        <rect x="25" y="14" width="82" height="70" rx="6" fill="var(--qk-color-surface-subtle)" />
        <path d="M39 30H77M39 40H91M39 50H61M39 69H53" />
        <circle cx="98" cy="56" r="26" fill="var(--qk-color-surface-page)" />
        <circle cx="98" cy="56" r="19" stroke-dasharray="3 5" />
        <path d="m117 75 20 17" stroke="var(--qk-color-icon-secondary)" stroke-width="5" />
        <path d="M91 56H105" stroke="var(--qk-color-icon-secondary)" />
        <path d="M121 19V27M117 23H125" />
      </g>
      <g v-else-if="scene === 'create'">
        <path d="M44 15H94L115 36V88H44Z" fill="var(--qk-color-surface-page)" />
        <path d="M94 15V36H115" fill="var(--qk-color-surface-subtle)" />
        <path d="M56 49H94M56 58H84M56 67H74" />
        <rect x="101" y="60" width="34" height="34" rx="9" fill="var(--qk-color-surface-subtle)" />
        <path d="M118 69V85M110 77H126" stroke="var(--qk-color-icon-secondary)" stroke-width="2" />
        <path d="M25 36V44M21 40H29M123 20V26M120 23H126" />
        <path d="m31 75 3 3-3 3-3-3Z" />
      </g>
      <g v-else-if="scene === 'documents'">
        <path d="M32 25 79 17 92 83 45 91Z" fill="var(--qk-color-surface-subtle)" />
        <path d="m86 18 43 8-12 65-43-8Z" fill="var(--qk-color-surface-subtle)" />
        <path d="M51 10H94L111 27V89H51Z" fill="var(--qk-color-surface-page)" />
        <path d="M94 10V27H111" fill="var(--qk-color-surface-subtle)" />
        <rect x="64" y="35" width="21" height="15" rx="3" fill="var(--qk-color-surface-subtle)" />
        <path d="M64 61H98M64 69H98M64 77H83" />
        <path d="M22 62H28M25 59V65M132 52H138" />
      </g>
      <g v-else-if="scene === 'chart'">
        <rect x="23" y="16" width="115" height="71" rx="6" fill="var(--qk-color-surface-page)" />
        <path d="M36 31H124M36 48H124M36 65H124" stroke-dasharray="2 5" />
        <path d="M38 75H124M38 28V75" />
        <rect x="50" y="56" width="13" height="19" rx="2" fill="var(--qk-color-surface-subtle)" />
        <rect x="76" y="42" width="13" height="33" rx="2" fill="var(--qk-color-surface-subtle)" />
        <rect x="102" y="30" width="13" height="45" rx="2" fill="var(--qk-color-surface-subtle)" />
        <path d="m15 38 3 3-3 3-3-3ZM143 64H149M146 61V67" />
      </g>
      <g v-else>
        <rect x="23" y="18" width="114" height="69" rx="6" fill="var(--qk-color-surface-page)" />
        <path d="M29 18H131Q137 18 137 24V37H23V24Q23 18 29 18Z" fill="var(--qk-color-surface-subtle)" />
        <path d="M23 37H137M23 54H137M23 71H137M64 37V87M105 37V87" />
        <path d="M34 28H52M74 28H94M114 28H125" stroke="var(--qk-color-icon-secondary)" />
        <path d="M34 45H48M75 62H89M115 79H125" />
        <path d="M12 58H18M15 55V61M143 36H149" />
      </g>
    </g>
  </svg>
</template>
