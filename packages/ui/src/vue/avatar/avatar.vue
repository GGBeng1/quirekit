<script setup lang="ts">
import { Avatar } from "@ark-ui/vue/avatar";
import { computed } from "vue";
import type {
  QuireKitAvatarFallbackSlotProps,
  QuireKitAvatarShape,
  QuireKitAvatarSize,
  QuireKitAvatarStatus,
  QuireKitAvatarStatusChangeDetails,
  QuireKitAvatarStatusSlotProps
} from "../../components/avatar";
import { useQuireKitMessages } from "../locale-provider/context";

/** Vue Avatar 适配器的公开属性。 */
interface Props {
  /** Avatar 对应的人员或对象名称。 */
  readonly name: string;
  /** 图片地址；缺失或加载失败时显示 fallback。 */
  readonly src?: string | undefined;
  /** 自定义回退短文本；默认从 name 计算。 */
  readonly fallback?: string | undefined;
  /** 控件视觉尺寸。 */
  readonly size?: QuireKitAvatarSize | undefined;
  /** 圆形或圆角方形轮廓。 */
  readonly shape?: QuireKitAvatarShape | undefined;
  /** 可选的人员状态标识。 */
  readonly status?: QuireKitAvatarStatus | undefined;
  /** 浏览器图片加载策略。 */
  readonly loading?: "eager" | "lazy" | undefined;
}

/** Avatar 的可替换内容位置。 */
interface Slots {
  /** 替换图片加载前或失败后的回退内容。 */
  readonly fallback?: (props: QuireKitAvatarFallbackSlotProps) => unknown;
  /** 替换状态标识。 */
  readonly status?: (props: QuireKitAvatarStatusSlotProps) => unknown;
}

/** Avatar 发出的公开语义事件。 */
interface Emits {
  /** 图片完成加载或加载失败时触发。 */
  statusChange: [details: QuireKitAvatarStatusChangeDetails];
}

const props = withDefaults(defineProps<Props>(), {
  size: "md",
  shape: "circle",
  status: "none",
  loading: "lazy"
});
const emit = defineEmits<Emits>();
defineSlots<Slots>();

const text = useQuireKitMessages("avatar");

/**
 * 从中英文名称中提取最多两个可识别字符。
 *
 * @param name - 完整名称。
 * @returns 适合 Avatar fallback 的短文本。
 */
function getFallback(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "?";
  const words = trimmed.split(/\s+/u);
  if (words.length > 1) {
    return words.slice(0, 2).map((word) => Array.from(word)[0]).join("").toUpperCase();
  }
  const characters = Array.from(trimmed);
  return characters.slice(Math.max(0, characters.length - 2)).join("").toUpperCase();
}

const fallbackText = computed(() => props.fallback ?? getFallback(props.name));
const fallbackGlyphs = computed(() => Array.from(fallbackText.value).length);
const visibleStatus = computed(() => props.status === "none" ? undefined : props.status);
const accessibleName = computed(() => visibleStatus.value === undefined
  ? props.name
  : text.value.withStatus(props.name, text.value[visibleStatus.value]));

/**
 * 向宿主公开 Ark 图片加载状态。
 *
 * @param details - 图片加载结果。
 */
function handleStatusChange(details: QuireKitAvatarStatusChangeDetails): void {
  emit("statusChange", details);
}
</script>

<template>
  <span
    :class="['qk-avatar', `qk-avatar--${size}`, `qk-avatar--${shape}`]"
    role="img"
    :aria-label="accessibleName"
  >
    <Avatar.Root class="qk-avatar__surface" @status-change="handleStatusChange">
      <Avatar.Fallback
        class="qk-avatar__fallback"
        aria-hidden="true"
        :data-single-glyph="fallbackGlyphs === 1 ? '' : undefined"
      >
        <slot name="fallback" v-bind="{ name, fallback: fallbackText }">
          {{ fallbackText }}
        </slot>
      </Avatar.Fallback>
      <!-- Keep a layout box for native lazy loading; the recipe hides pending pixels
           using Ark's data-state while the fallback remains visible. -->
      <Avatar.Image v-if="src" class="qk-avatar__image" :hidden="false" aria-hidden="true" :src="src" alt="" :loading="loading" />
    </Avatar.Root>
    <slot v-if="visibleStatus" name="status" :status="visibleStatus" :label="text[visibleStatus]">
      <span :class="['qk-avatar__status', `qk-avatar__status--${visibleStatus}`]" aria-hidden="true" />
    </slot>
  </span>
</template>
