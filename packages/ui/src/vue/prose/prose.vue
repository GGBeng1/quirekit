<script setup lang="ts">
import { provide, shallowRef } from "vue";
import { QuireImagePreview } from "../image-preview";
import { useImagePreviewGroup } from "../image-preview/group/use";
import { proseImageGroupKey } from "./shared/image-group";
import type { QuireKitProseProps } from "./types";
const props = withDefaults(defineProps<QuireKitProseProps>(), { as: "div", density: "comfortable", tableWidth: "fill" });
defineOptions({ inheritAttrs: false });
const root = shallowRef<HTMLElement | null>(null);
const gallery = useImagePreviewGroup(ownsImage);
provide(proseImageGroupKey, gallery.context);
/** @param element - Registered Image root. @returns Whether it belongs to this article outside embedded UI islands. */
function ownsImage(element: HTMLElement): boolean {
  return element.parentElement?.closest('.qk-prose, [data-qk-not-prose]:not(.qk-prose-image), [data-qk-not-typography]:not(.qk-prose-image)') === root.value;
}
defineSlots<{
  /** Native document content. Isolate interactive islands with data-qk-not-prose. */
  default?: () => unknown;
}>();
</script>
<template>
  <component :is="as" ref="root" v-bind="$attrs" class="qk-prose" :class="{ 'qk-prose--compact': density === 'compact', 'qk-prose--table-content': tableWidth === 'content' }"><slot /></component>
  <QuireImagePreview v-bind="{ ...props.imagePreviewOptions, ...gallery.options.value }" :items="gallery.items.value"
    v-model:open="gallery.opened.value" v-model:index="gallery.index.value" :final-focus-el="gallery.finalFocusEl" />
</template>
