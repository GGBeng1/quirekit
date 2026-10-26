<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import type { QuireKitTypographyProps } from "../../components/typography";
import { QuireTooltipContent, QuireTooltipRoot, QuireTooltipTrigger } from "../tooltip";

const props = defineProps<Pick<QuireKitTypographyProps, "title">>();
defineOptions({ inheritAttrs: false });
defineSlots<{
  /** Abbreviated text; the expansion belongs to the shared Tooltip. */
  default?: () => unknown;
}>();
const expansion = computed(() => props.title?.trim());
</script>

<template>
  <QuireTooltipRoot v-if="expansion" :trigger-id="$attrs.id as string | undefined">
    <QuireTooltipTrigger as-child>
      <abbr v-bind="$attrs" :tabindex="($attrs.tabindex as HTMLAttributes['tabindex']) ?? 0" data-qk-abbr><slot /></abbr>
    </QuireTooltipTrigger>
    <QuireTooltipContent :content="expansion" />
  </QuireTooltipRoot>
  <abbr v-else v-bind="$attrs"><slot /></abbr>
</template>
