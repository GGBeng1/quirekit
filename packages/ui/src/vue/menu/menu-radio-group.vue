<script setup lang="ts">
import { Menu } from "@ark-ui/vue/menu";

/** Public properties for a radio-option group inside a Menu. */
interface Props {
  /** Stable group identity used by accessible relationships. */
  readonly id?: string;
  /** Optional visible label shown above the radio options. */
  readonly label?: string;
}

/** Public slots exposed by a Menu radio group. */
interface Slots {
  /** Radio items belonging to this mutually exclusive option set. */
  readonly default: () => unknown;
}

const { id, label } = defineProps<Props>();
const value = defineModel<string>({ required: true });
defineSlots<Slots>();
</script>

<template>
  <Menu.RadioItemGroup
    v-model="value"
    v-bind="id === undefined ? {} : { id }"
    class="qk-menu__group"
  >
    <Menu.ItemGroupLabel
      v-if="label"
      class="qk-menu__group-label"
    >
      {{ label }}
    </Menu.ItemGroupLabel>
    <slot />
  </Menu.RadioItemGroup>
</template>
