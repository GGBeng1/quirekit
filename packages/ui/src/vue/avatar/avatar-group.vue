<script setup lang="ts">
import { computed } from "vue";
import type {
  QuireKitAvatarGroupItem,
  QuireKitAvatarGroupItemSlotProps,
  QuireKitAvatarGroupOverflowSlotProps,
  QuireKitAvatarSize
} from "../../components/avatar";
import QuireAvatar from "./avatar.vue";
import { useQuireKitMessages } from "../locale-provider/context";

/** Vue Avatar Group 的公开属性。 */
interface Props {
  /** Group 中的全部成员。 */
  readonly items: readonly QuireKitAvatarGroupItem[];
  /** Avatar Group 的可访问名称，说明这组成员是谁；缺省取语言包。 */
  readonly label?: string;
  /** 直接显示的最大成员数。 */
  readonly max?: number;
  /** Group 内 Avatar 的统一尺寸。 */
  readonly size?: QuireKitAvatarSize;
}

/** Avatar Group 的可替换内容位置。 */
interface Slots {
  /** 替换每一个可见成员。 */
  readonly item?: (props: QuireKitAvatarGroupItemSlotProps) => unknown;
  /** 替换超出 max 后的计数标识。 */
  readonly overflow?: (props: QuireKitAvatarGroupOverflowSlotProps) => unknown;
}

const props = withDefaults(defineProps<Props>(), {
  max: 4,
  size: "md"
});
defineSlots<Slots>();
const text = useQuireKitMessages("avatar");

const visibleItems = computed(() => props.items.slice(0, Math.max(0, props.max)));
const overflowCount = computed(() => Math.max(0, props.items.length - visibleItems.value.length));
</script>

<template>
  <div class="qk-avatar-group" role="group" :aria-label="label ?? text.group">
    <template v-for="(item, index) in visibleItems" :key="item.id">
      <slot name="item" :item="item" :index="index" :size="size">
        <QuireAvatar
          :name="item.name"
          :src="item.src"
          :fallback="item.fallback"
          :status="item.status"
          :size="size"
        />
      </slot>
    </template>
    <slot v-if="overflowCount > 0" name="overflow" :count="overflowCount">
      <span :class="['qk-avatar-group__overflow', `qk-avatar--${size}`]" :aria-label="text.overflow(overflowCount)">
        +{{ overflowCount }}
      </span>
    </slot>
  </div>
</template>
