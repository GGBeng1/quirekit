<script setup lang="ts">
import type { QuireKitToolbarRendererScope, QuireKitToolbarRenderers } from "./types";
import QuirePopoverContent from "../../popover/content.vue";
defineProps<{
  /** Live entry state and execution bridge. */
  scope: QuireKitToolbarRendererScope;
  /** Named application popup bodies. */
  renderers: QuireKitToolbarRenderers;
}>();
defineSlots<{
  /** Application fallback when no registered body is provided. */
  content?: (scope: QuireKitToolbarRendererScope) => unknown;
}>();
</script>
<template>
  <QuirePopoverContent v-bind="{ ...scope.item.overlayProps?.contentAttributes,
    ...(scope.item.overlayProps?.portalTarget === undefined ? {} : { portalTarget: scope.item.overlayProps.portalTarget }) }"
    :aria-label="scope.item.label" :show-arrow="false"
    :style="scope.item.contentPadding === 'none' ? { '--qk-popover-padding': '0px' } : undefined">
    <template v-if="scope.expanded">
    <component v-if="scope.item.contentRenderer && renderers[scope.item.contentRenderer]"
      :is="renderers[scope.item.contentRenderer]" :scope="scope" />
    <slot v-else name="content" v-bind="scope" />
    </template>
  </QuirePopoverContent>
</template>
