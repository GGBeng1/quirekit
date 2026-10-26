<script setup lang="ts">
import { QuireIconButton } from "../button";
import QuireIcon from "../icon/icon.vue";
import { QuireTooltipRoot, QuireTooltipTrigger, QuireTooltipContent } from "../tooltip";
defineOptions({ inheritAttrs: false });
defineProps<{
  /** Visible tooltip and accessible action. */ label: string;
  /** Registered media glyph. */ icon: string;
  /** Strong visual role of the primary play action. */ primary?: boolean;
  /** Current toggle state, when meaningful. */ pressed?: boolean;
}>();
</script>
<template>
  <QuireTooltipRoot :trigger-id="($attrs.id as string|undefined)">
    <QuireTooltipTrigger as-child>
      <QuireIconButton v-bind="$attrs" :label="label" :aria-pressed="pressed" :color="primary?'primary':'neutral'" :variant="primary?'solid':'ghost'" size="sm" :shape="primary?'circle':'rounded'"><QuireIcon :name="icon" /></QuireIconButton>
    </QuireTooltipTrigger>
    <QuireTooltipContent :content="label" />
  </QuireTooltipRoot>
</template>
