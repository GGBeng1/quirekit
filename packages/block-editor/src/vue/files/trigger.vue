<script setup lang="ts">
import { QuireIcon, QuireIconButton, QuireTooltipRoot, QuireTooltipTrigger, QuireTooltipContent } from "@quirekit/ui/vue";

defineOptions({ inheritAttrs: false });
defineProps<{
  /** Localized menu name shared by the icon button and its tooltip. */
  readonly label: string;
}>();
</script>

<template>
  <QuireTooltipRoot :trigger-id="($attrs.id as string | undefined)" placement="bottom"
    :disabled="$attrs['aria-expanded'] === true || $attrs['aria-expanded'] === 'true'">
    <QuireTooltipTrigger as-child>
      <QuireIconButton v-bind="$attrs" :label="label" size="sm" variant="ghost"><QuireIcon name="arrowUpDown" /></QuireIconButton>
    </QuireTooltipTrigger>
    <QuireTooltipContent :content="label" />
  </QuireTooltipRoot>
</template>
