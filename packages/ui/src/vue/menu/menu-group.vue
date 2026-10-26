<script setup lang="ts">
import { Menu } from "@ark-ui/vue/menu";

/** Public properties for a labeled Menu item group. */
interface Props {
  /** Stable group identity used by accessible relationships. */
  readonly id?: string;
  /** Optional visible label shown above the group rows. */
  readonly label?: string;
  /** Whether the label aligns with rows that reserve an indicator column. */
  readonly inset?: boolean;
}

/** Public slots exposed by a Menu item group. */
interface Slots {
  /** Rows contained by this visual and semantic group. */
  readonly default: () => unknown;
}

const { id, label, inset = false } = defineProps<Props>();
defineSlots<Slots>();
</script>

<template>
  <Menu.ItemGroup v-bind="id === undefined ? {} : { id }" class="qk-menu__group">
    <Menu.ItemGroupLabel
      v-if="label"
      :class="['qk-menu__group-label', { 'qk-menu__group-label--inset': inset }]"
    >
      {{ label }}
    </Menu.ItemGroupLabel>
    <slot />
  </Menu.ItemGroup>
</template>
