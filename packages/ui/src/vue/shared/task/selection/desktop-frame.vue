<script setup lang="ts">
import PopoverContent from "../../../popover/content.vue";
import { usePopoverContext } from "@ark-ui/vue/popover";

/** Private surface styling seam shared by choice and preview task templates. */
interface Props {
  /** Additional classes on the real Popover Content. */
  readonly contentClass?: string;
  /** Presence of the real Popover Description in the fixed header. */
  readonly description?: string;
}
defineProps<Props>();

/** Private fixed-header/body/footer frame for the anchored choice task. */
interface Slots {
  /** Full fixed title, search and dismiss region. */
  readonly header: () => unknown;
  /** Sole scrollable selection body. */
  readonly default: () => unknown;
  /** Fixed task feedback and confirmation actions. */
  readonly footer: () => unknown;
}
defineOptions({ inheritAttrs: false });
defineSlots<Slots>();
const context = usePopoverContext();
</script>

<template>
  <PopoverContent :show-arrow="false" :aria-labelledby="context.getTitleProps().id" :aria-describedby="description ? context.getDescriptionProps().id : undefined"
    :class="['qk-task__surface qk-choice-picker__surface qk-choice-picker__surface--desktop', contentClass]">
    <slot name="header" />
    <div class="qk-choice-picker__body"><slot /></div>
    <footer class="qk-choice-picker__footer"><slot name="footer" /></footer>
  </PopoverContent>
</template>
