<script setup lang="ts">
import { useQuireOverlayHost } from "../overlay-provider";
import QuireThemePortal from "../theme-provider/portal.vue";
import { Menu, useMenuContext } from "@ark-ui/vue/menu";
import { useId } from "vue";
import type { QuireKitActionMenuEntry, QuireKitActionMenuIconSlotProps } from "../../components/action-menu";
import { useMenuLayerClass } from "../menu/surface/use-layer";
import Rows from "./rows.vue";
import { useQuireKitMessages } from "../locale-provider/context";

/** The single desktop Menu content, without another surface owner. */
interface Props {
  /** Task name. */
  readonly title: string;
  /** Optional task description. */
  readonly description?: string | undefined;
  /** Complete action tree. */
  readonly actions: readonly QuireKitActionMenuEntry[];
  /** Execution lock. */
  readonly busy: boolean;
  /** Current readable failure, absent before failure. */
  readonly errorText?: string | undefined;
  /** Informational update when the directory changes. */
  readonly statusText?: string | undefined;
}
/** Menu command intent. */
interface Emits {
  /** Executes one accepted leaf. */
  activate: [value: string];
}
/** Shared decoration slots. */
interface Slots {
  /** Decorative icon for a command or branch. */
  readonly icon?: (props: QuireKitActionMenuIconSlotProps) => unknown;
}
defineProps<Props>();
const emit = defineEmits<Emits>();
defineSlots<Slots>();
const host = useQuireOverlayHost();
const text = useQuireKitMessages("actionMenu");
const menu = useMenuContext();
const titleId = `${useId()}-action-menu-title`;
const { layerClass, layerStyle, portalDisabled } = useMenuLayerClass(() => true, () => menu.value.open);
</script>

<template>
  <Teleport :to="host.target.value" :disabled="portalDisabled">
    <QuireThemePortal>
      <Menu.Positioner :class="['qk-menu__positioner', layerClass]" :style="layerStyle">
        <Menu.Content class="qk-menu qk-menu--viewport qk-action-menu__surface" :aria-labelledby="titleId" :aria-busy="busy || undefined">
          <header class="qk-action-menu__header"><h2 :id="titleId" class="qk-action-menu__title">{{ title }}</h2><p v-if="description" class="qk-action-menu__description">{{ description }}</p></header>
          <Rows :actions="actions" :busy="busy" @activate="emit('activate', $event)"><template v-if="$slots.icon" #icon="slotProps"><slot name="icon" v-bind="slotProps" /></template></Rows>
          <p v-if="!actions.length" class="qk-action-sheet__empty">{{ text.empty }}</p>
          <p v-if="busy" role="status" class="qk-action-menu__feedback">{{ text.busy }}</p>
          <p v-else-if="errorText" role="alert" class="qk-action-menu__feedback">{{ errorText }}</p>
          <p v-else-if="statusText" role="status" class="qk-action-menu__feedback">{{ statusText }}</p>
        </Menu.Content>
      </Menu.Positioner>
    </QuireThemePortal>
  </Teleport>
</template>
