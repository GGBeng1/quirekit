<script setup lang="ts">
import { QuireIcon, QuireIconButton, QuireTooltipContent, QuireTooltipRoot, QuireTooltipTrigger } from "@quirekit/ui/vue";
import type { MdDocumentPropertyActionProps } from "./types";
defineProps<MdDocumentPropertyActionProps>();
defineOptions({ inheritAttrs: false });
</script>
<template>
  <QuireTooltipRoot>
    <QuireTooltipTrigger as-child>
      <QuireIconButton v-bind="$attrs" :label="label" size="sm" :variant="primary ? 'soft' : 'ghost'" :color="primary ? 'primary' : 'neutral'">
        <QuireIcon :name="icon" />
      </QuireIconButton>
    </QuireTooltipTrigger>
    <QuireTooltipContent :content="label" />
  </QuireTooltipRoot>
</template>
