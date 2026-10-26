<script setup lang="ts">
import { Collapsible } from "@ark-ui/vue/collapsible";
import { computed, shallowRef, watch } from "vue";
import type { QuireKitCollapsibleSize, QuireKitCollapsibleVariant, QuireKitCollapsibleTriggerVariant } from "../../components/collapsible";
import QuireIcon from "../icon/icon.vue";

/** Vue Collapsible 的公开属性。 */
interface Props {
  /** 展开触发器的主要文字。 */
  readonly title: string;
  /** 标题下方的可选说明。 */
  readonly description?: string;
  /** 未受控使用时的初始展开状态。 */
  readonly defaultOpen?: boolean;
  /** 触发器高度与排版尺寸。 */
  readonly size?: QuireKitCollapsibleSize;
  /** outline 保留独立表面；plain 适合内容中的紧凑展开行。 */
  readonly variant?: QuireKitCollapsibleVariant;
  /** ghost 保留背景反馈；text 保持透明，适合正文中的轻量展开入口。 */
  readonly triggerVariant?: QuireKitCollapsibleTriggerVariant;
  /** end 将箭头置于末端；inline 紧跟标题，适合内容摘要。 */
  readonly indicatorPlacement?: 'end' | 'inline';
  /** 是否禁止展开或收起。 */
  readonly disabled?: boolean;
  /** 是否延迟挂载首次未展开的内容。 */
  readonly lazyMount?: boolean;
  /** 收起后是否卸载内容。 */
  readonly unmountOnExit?: boolean;
}

/** Collapsible 的可替换内容位置。 */
interface Slots {
  /** 替换触发器文字，同时保留按钮与指示图标。 */
  readonly trigger?: () => unknown;
  /** 展开区域内容。 */
  readonly default?: () => unknown;
}

const props = withDefaults(defineProps<Props>(), {
  defaultOpen: false,
  size: "sm",
  variant: "outline",
  triggerVariant: "ghost",
  indicatorPlacement: "end",
  disabled: false,
  lazyMount: false,
  unmountOnExit: false
});
const open = defineModel<boolean | undefined>("open", { default: undefined });
defineSlots<Slots>();
const content = shallowRef<HTMLElement | null>(null);

const optionalRootProps = computed(() => ({
  ...(open.value === undefined ? { defaultOpen: props.defaultOpen } : { open: open.value })
}));

watch(open, value => {
  const element = content.value;
  if (value === false && element?.contains(element.ownerDocument.activeElement)) {
    element.closest('.qk-collapsible')?.querySelector<HTMLButtonElement>('[data-part="trigger"]')?.focus({ preventScroll: true });
  }
});

/** 把 Ark 的下一展开状态同步给可选的 v-model。
 * @param value - Ark 请求的新状态。
 */
function updateOpen(value: boolean): void {
  open.value = value;
}

/** Keeps pointer collapse focus on the still-visible controller, including Safari.
 * @param event - Trigger activation.
 */
function focusTrigger(event: MouseEvent): void {
  (event.currentTarget as HTMLElement).focus({ preventScroll: true });
}
</script>

<template>
  <Collapsible.Root
    v-bind="optionalRootProps"
    :disabled="disabled"
    :lazy-mount="lazyMount"
    :unmount-on-exit="unmountOnExit"
    :class="['qk-collapsible', variant === 'plain' && 'qk-collapsible--plain']"
    @update:open="updateOpen"
  >
    <Collapsible.Trigger
      :disabled="disabled"
      :class="['qk-collapsible__trigger', `qk-collapsible__trigger--${size}`, `qk-collapsible__trigger--${triggerVariant}`, variant === 'plain' && 'qk-collapsible__trigger--plain', indicatorPlacement === 'inline' && 'qk-collapsible__trigger--inline']"
      @click="focusTrigger"
    >
      <span :class="['qk-collapsible__heading', indicatorPlacement === 'inline' && 'qk-collapsible__heading--inline']">
        <slot name="trigger">{{ title }}</slot>
        <span v-if="description !== undefined" class="qk-collapsible__description">{{ description }}</span>
      </span>
      <Collapsible.Indicator class="qk-collapsible__indicator">
        <QuireIcon name="chevronRight" :size="16" />
      </Collapsible.Indicator>
    </Collapsible.Trigger>
    <Collapsible.Content :class="['qk-collapsible__content', variant === 'plain' && 'qk-collapsible__content--plain']">
      <div ref="content" :class="['qk-collapsible__content-inner', variant === 'plain' && 'qk-collapsible__content-inner--plain']">
        <slot />
      </div>
    </Collapsible.Content>
  </Collapsible.Root>
</template>
