<script setup lang="ts">
import { QuireToolbarDisclosure } from "@quirekit/ui/vue";
import { computed, nextTick, ref, watch } from "vue";
import { resolveClassicEditorText } from "@classic/localization";
import type {
  ClassicEditorObjectActionProjection,
  ClassicEditorObjectMenuControl,
  ClassicEditorObjectWorkspaceController,
  ClassicEditorObjectWorkspaceLayout
} from "@classic/types";
import { ClassicEditorCommandPopover } from "@classic/ui/command-popover";

import SvgIcon from "../svg-icon.vue";
import ClassicEditorObjectMenuSurface from "./menu-surface.vue";

/** Exposed focus contract of the reusable menu surface. */
interface ClassicEditorObjectMenuSurfaceExposed {
  /** Focuses the first enabled exact action. */
  focusFirst(): void;
}

/** Inputs for one WPS-shaped compact object action picker. */
interface ClassicEditorObjectMenuControlProps {
  /** Shared exact-target controller. */
  readonly controller: ClassicEditorObjectWorkspaceController;
  /** Current responsive Quick Bar recipe. */
  readonly layout: ClassicEditorObjectWorkspaceLayout;
  /** Representative retained action projection. */
  readonly item: ClassicEditorObjectActionProjection;
  /** Owner-supplied menu groups and current-state facts. */
  readonly control: ClassicEditorObjectMenuControl;
}

const props = defineProps<ClassicEditorObjectMenuControlProps>();
const visible = ref(false);
const surface = ref<ClassicEditorObjectMenuSurfaceExposed>();
const locale = computed(() => props.controller.context.locale);
const label = computed(() => resolveClassicEditorText(
  props.control.label,
  locale.value
));
const triggerTitle = computed(() => props.item.reason === null
  ? label.value
  : resolveClassicEditorText(props.item.reason.message, locale.value));

watch(visible, (next) => {
  if (!next) return;
  void nextTick(() => surface.value?.focusFirst());
});

/**
 * Opens or closes the controlled picker from the public Toolbar trigger.
 *
 * @param event - Native disclosure activation shared by pointer and keyboard.
 */
function toggleMenu(event: MouseEvent): void {
  event.preventDefault();
  event.stopImmediatePropagation();
  if (!props.item.state.canExecute || props.item.busy) return;
  visible.value = !visible.value;
}

/** @param shouldClose - Whether the reusable surface completed a closing action. */
function handleExecuted(shouldClose: boolean): void {
  if (shouldClose) visible.value = false;
}

/** Closes the picker and restores its exact trigger focus. */
function closeAndRestoreFocus(): void {
  visible.value = false;
  void nextTick(() => props.controller.context.root
    .querySelector<HTMLButtonElement>(`[data-object-menu-control="${CSS.escape(props.control.id)}"]`)
    ?.focus({ preventScroll: true }));
}
</script>

<template>
  <ClassicEditorCommandPopover
    v-model:show="visible"
    :disabled="!item.state.canExecute || item.busy"
    :placement="layout === 'wide' ? 'bottom-start' : 'top-start'"
    padding="none"
    :theme-root="controller.context.root"
    :label="label"
    :overlay-family="`object-menu-${control.id}`"
    role="menu"
    surface-class="qk-object-picker"
  >
    <template #trigger>
      <QuireToolbarDisclosure
        v-model:expanded="visible"
        :toggle-on-click="false"
        :label="label"
        :tooltip="triggerTitle"
        popup="menu"
        :disabled="!item.state.canExecute || item.busy"
        v-bind="item.reason ? { disabledReason: triggerTitle } : {}"
        data-object-toolbar-control
        :data-object-action="item.action.id"
        :data-object-menu-control="control.id"
        :data-mixed="control.mixed || undefined"
        @click.capture="toggleMenu"
      >
        <SvgIcon :name="control.icon" />
      </QuireToolbarDisclosure>
    </template>
    <ClassicEditorObjectMenuSurface
      ref="surface"
      :controller="controller"
      :control="control"
      source="contextual-popup"
      @executed="handleExecuted"
      @request-close="closeAndRestoreFocus"
    />
  </ClassicEditorCommandPopover>
</template>
