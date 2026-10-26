<script setup lang="ts">
import { computed, inject, onMounted, provide, ref, shallowRef } from "vue";
import { QuireImage } from "../../image";
import { imagePreviewGroupKey } from "../../image-preview/group/context";
import { proseImageGroupKey } from "../shared/image-group";
import { definedProseProps } from "../shared/props";
import { useQuireKitMessages } from "../../locale-provider/context";
import type { QuireKitProseImageProps, QuireKitProseImageState, QuireKitProseImageErrorState } from "./types";
const props = withDefaults(defineProps<QuireKitProseImageProps>(), { preview: true, fit: "contain" });
defineOptions({ inheritAttrs: false });
const text = useQuireKitMessages("prose");
const emit = defineEmits<{
  /** 当前原图或备用图完成加载。 */
  load: [image: HTMLImageElement];
  /** 当前资源加载失败。 */
  error: [event: Event];
  /** Before preview; preventDefault delegates to a host-owned complete gallery. */
  preview: [event: MouseEvent];
}>();
defineSlots<{
  /** 替换加载占位。 */
  placeholder?: (props: QuireKitProseImageState) => unknown;
  /** 替换失败反馈；外层为链接或按钮时只呈现静态反馈。 */
  error?: (props: QuireKitProseImageErrorState) => unknown;
}>();
const root = shallowRef<HTMLElement | null>(null);
provide(imagePreviewGroupKey, inject(proseImageGroupKey, null));
const insideAction = ref(false);
// Native image state starts at loading in SSR. Resolve the surrounding action
// once at mount, before a cached image can expose preview or retry controls.
onMounted(() => { insideAction.value = !!root.value?.closest("a,button,[role=link],[role=button]"); });

/** @param value - Native dimension or CSS length. @returns A finite positive intrinsic dimension, when supplied. */
function intrinsic(value: string | number | undefined): number | undefined {
  if (typeof value === "string" && !/^\d+(?:\.\d+)?$/.test(value)) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : undefined;
}
const imageProps = computed(() => {
  const width = intrinsic(props.width);
  const height = intrinsic(props.height);
  return {
    ...definedProseProps(props),
    preview: props.preview && !insideAction.value,
    // Markdown dimensions describe an intrinsic ratio; the reading column may shrink.
    ...(width && height && props.aspectRatio === undefined ? { width, height: "auto", aspectRatio: `${width} / ${height}` } : {})
  };
});
</script>
<template>
  <span ref="root" v-bind="$attrs" class="qk-prose-image" data-qk-not-prose data-qk-not-typography>
    <QuireImage v-bind="imageProps" @load="emit('load', $event)" @error="emit('error', $event)" @preview="emit('preview', $event)">
      <template v-if="$slots.placeholder" #placeholder="context"><slot name="placeholder" v-bind="context" /></template>
      <template v-if="insideAction || $slots.error" #error="context">
        <span v-if="insideAction">{{ text.imageFailed }}</span>
        <slot v-else name="error" v-bind="context" />
      </template>
    </QuireImage>
  </span>
</template>
