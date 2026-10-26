<script setup lang="ts">
import QuireThemePortal from "../theme-provider/portal.vue";
import { Drawer } from "@ark-ui/vue/drawer";
import { computed, inject } from "vue";
import type { DrawerContentFrameProps as Props } from "./types";
import QuireIcon from "../icon/icon.vue";
import { drawerInteractionKey, drawerSideKey } from "./context";
import { useQuireKitMessages } from "../locale-provider/context";

/** Drawer Content 的固定内容区域。 */
interface Slots {
  /** Complete fixed header; internal task templates supply one header element. */
  readonly header?: () => unknown;
  /** 独立滚动的面板正文。 */
  readonly default: () => unknown;
  /** 标题区右侧的附加动作。 */
  readonly headerActions?: () => unknown;
  /** 固定在正文下方的操作区。 */
  readonly footer?: () => unknown;
}

const props = withDefaults(defineProps<Props>(), {
  size: "medium",
  draggable: undefined,
  showGrabber: undefined,
  showBackdrop: true,
  portalTarget: "body",
  portalled: true,
  showClose: true
});
defineSlots<Slots>();
const text = useQuireKitMessages("drawer");

const side = inject(drawerSideKey);
const interaction = inject(drawerInteractionKey);
if (side === undefined || interaction === undefined) {
  throw new Error("QuireDrawerContent must be used inside QuireDrawerRoot.");
}
const contentDraggable = computed(() => interaction.dragEnabled.value && (props.draggable ?? side.value !== "bottom"));
const grabberVisible = computed(() => interaction.dragEnabled.value && (props.showGrabber ?? side.value === "bottom"));
</script>

<template>
  <Teleport :to="portalTarget" :disabled="!portalled">
    <QuireThemePortal>
      <Drawer.Backdrop v-if="showBackdrop" class="qk-drawer__backdrop" />
      <Drawer.Positioner :class="['qk-drawer__positioner', `qk-drawer__positioner--${side}`]">
        <Drawer.Content
          :inert="contentInert || undefined"
          :aria-hidden="contentInert || undefined"
          :draggable="contentDraggable"
          :class="['qk-drawer__content', `qk-drawer__content--${side}`, `qk-drawer__content--${size}`, contentClass]"
          :style="contentStyle"
        >
          <slot name="header">
            <header :class="['qk-drawer__header', side === 'bottom' && 'qk-drawer__header--bottom']">
              <Drawer.Grabber v-if="grabberVisible" aria-hidden="true" class="qk-drawer__grabber">
                <Drawer.GrabberIndicator class="qk-drawer__grabber-indicator" />
              </Drawer.Grabber>
              <span class="qk-drawer__heading">
                <Drawer.Title class="qk-drawer__title">{{ title }}</Drawer.Title>
                <Drawer.Description v-if="description" class="qk-drawer__description">{{ description }}</Drawer.Description>
              </span>
              <span v-if="$slots.headerActions || showClose" class="qk-drawer__header-actions">
                <slot name="headerActions" />
                <Drawer.CloseTrigger v-if="showClose" :aria-label="text.close" :class="['qk-drawer__close-trigger', side === 'bottom' && 'qk-drawer__close-trigger--touch']">
                  <QuireIcon name="close" :size="16" />
                </Drawer.CloseTrigger>
              </span>
            </header>
          </slot>
          <div :class="['qk-drawer__body', side === 'bottom' && 'qk-drawer__body--bottom']" :style="bodyStyle"><slot /></div>
          <footer v-if="$slots.footer" :class="['qk-drawer__footer', side === 'bottom' && 'qk-drawer__footer--bottom']"><slot name="footer" /></footer>
        </Drawer.Content>
      </Drawer.Positioner>
    </QuireThemePortal>
  </Teleport>
</template>
