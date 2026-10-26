<script setup lang="ts">
import { Menu } from "@ark-ui/vue/menu";
import QuireKbd from "../kbd/kbd.vue";

/** Public properties for one radio option inside a Menu radio group. */
interface Props {
  /** Stable option value controlled by the owning radio group. */
  readonly value: string;
  /** Optional keyboard shortcut rendered in the trailing metadata column. */
  readonly shortcut?: string | readonly string[];
  /** Whether pointer and keyboard changes are unavailable. */
  readonly disabled?: boolean;
  /** Whether selecting this option closes the owning menu. */
  readonly closeOnSelect?: boolean;
  /** Whether an icon-free option reserves the independent leading icon column. */
  readonly inset?: boolean;
  /** Optional one-line explanation shown under the label; the row grows to fit it. */
  readonly description?: string;
}

/** Public slots exposed by one Menu radio option. */
interface Slots {
  /** Visible option label. */
  readonly default: () => unknown;
  /** Optional functional icon, separate from the trailing checked state. */
  readonly leading?: () => unknown;
  /** Optional trailing content that replaces the shortcut prop. */
  readonly trailing?: () => unknown;
}

const {
  value,
  shortcut,
  disabled = false,
  closeOnSelect = false,
  inset = false,
  description
} = defineProps<Props>();
defineSlots<Slots>();
</script>

<template>
  <Menu.RadioItem
    :value="value"
    :disabled="disabled"
    :close-on-select="closeOnSelect"
    class="qk-menu__item"
    :data-described="description ? '' : undefined"
  >
    <span v-if="$slots.leading || inset" class="qk-menu__leading qk-menu__indicator" aria-hidden="true">
      <slot name="leading" />
    </span>
    <span v-if="description" class="qk-menu__copy">
      <Menu.ItemText class="qk-menu__label"><slot /></Menu.ItemText>
      <span class="qk-menu__description">{{ description }}</span>
    </span>
    <Menu.ItemText v-else class="qk-menu__label"><slot /></Menu.ItemText>
    <span v-if="$slots.trailing" class="qk-menu__trailing" aria-hidden="true">
      <slot name="trailing" />
    </span>
    <span v-else-if="shortcut?.length" class="qk-menu__shortcut"><QuireKbd :keys="typeof shortcut === 'string' ? [shortcut] : shortcut" size="xs" /></span>
    <span class="qk-menu__selection-indicator qk-menu__indicator" :data-disabled="disabled || undefined" aria-hidden="true">
      <Menu.ItemIndicator>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3.5 8.2 2.7 2.7 6.3-6.2" />
        </svg>
      </Menu.ItemIndicator>
    </span>
  </Menu.RadioItem>
</template>
