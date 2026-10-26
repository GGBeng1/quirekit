<script setup lang="ts">
import { QuireColorPicker, QuireToolbarColorPickerDisclosure } from "@quirekit/ui/vue";
import { computed, ref, watch } from "vue";
import {
  resolveClassicEditorText
} from "@classic/localization";
import type {
  ClassicEditorObjectActionProjection,
  ClassicEditorObjectColorControl,
  ClassicEditorObjectWorkspaceController,
  ClassicEditorObjectWorkspaceLayout
} from "@classic/types/object-workspace";
import { useClassicEditorOverlay } from "../../overlays/registry";

import SvgIcon from "../svg-icon.vue";
import { resolveObjectWorkspaceMessages } from "./localization";

/** Inputs for one typed object color action control. */
interface ClassicEditorObjectColorControlProps {
  /** Shared exact-target controller. */
  readonly controller: ClassicEditorObjectWorkspaceController;
  /** Current responsive Quick Bar recipe. */
  readonly layout: ClassicEditorObjectWorkspaceLayout;
  /** Retained apply/clear direct action projection. */
  readonly item: ClassicEditorObjectActionProjection;
  /** Owner-supplied current and mixed color facts. */
  readonly control: ClassicEditorObjectColorControl;
}

const props = defineProps<ClassicEditorObjectColorControlProps>();
const visible = ref(false);
const locale = computed(() => props.controller.context.locale);
const objectMessages = computed(() => resolveObjectWorkspaceMessages(
  locale.value
));
const label = computed(() => resolveClassicEditorText(
  props.item.action.label,
  locale.value
));
const noFillLabel = computed(() => (
  locale.value === "zh-CN" ? "无填充" : "No fill"
));
const triggerLabel = computed(() => {
  const value = props.control.mixed
    ? objectMessages.value.mixed
    : props.control.value ?? noFillLabel.value;
  return locale.value === "zh-CN"
    ? `${label.value}：${value}`
    : `${label.value}: ${value}`;
});
const triggerTitle = computed(() => props.item.reason === null
  ? triggerLabel.value
  : resolveClassicEditorText(props.item.reason.message, locale.value));
const triggerIcon = computed(() => (
  props.control.value === null && !props.control.mixed
    ? "tableCellFillNone"
    : props.item.action.icon ?? "tableCellFill"
));

const draft = ref(props.control.value ?? "#000000");
const dirty = ref(false);
const recentColors = ref<string[]>([]);
const disabled = computed(() => !props.item.state.canExecute || props.item.busy);
const overlay = useClassicEditorOverlay("object-color", visible, props.controller.context.root.ownerDocument,
  { resolveRoot: () => props.controller.context.root },
  { dismissOnEscape: () => false, dismissOnOutsidePointer: () => false });
watch(() => props.control.value, value => { if (value !== null && !dirty.value) draft.value = value; });
watch(disabled, value => { if (value) { dirty.value = false; overlay.close(); } });

/** @param value - Current color draft; channel typing does not create per-keystroke transactions. */
function preview(value: string): void { draft.value = value; dirty.value = true; }

/** @param value - Explicit picker selection. @returns Completion after the retained target accepts it. */
async function commit(value: string): Promise<void> {
  if (disabled.value) return;
  dirty.value = false;
  draft.value = value;
  const handled = await props.controller.execute(props.item.action, "contextual-popup", { value });
  if (handled) recentColors.value = [value, ...recentColors.value.filter(color => color !== value)].slice(0, 8);
}

/** Clears the exact object's color through the same command authority. */
async function clear(): Promise<void> {
  dirty.value = false;
  if (!disabled.value) await props.controller.execute(props.item.action, "contextual-popup", { value: null });
}

/** @param open - Public picker visibility, coordinated with sibling Classic overlays. */
function requestOpen(open: boolean): void {
  if (!open && dirty.value) void commit(draft.value);
  if (!open || !disabled.value) overlay.setVisible(open);
}
</script>

<template>
  <QuireColorPicker
    :label="label" :open="visible" :model-value="draft" :reset-active="control.value === null && !control.mixed"
    :disabled="disabled" :placement="layout === 'wide' ? 'bottom-start' : 'top-start'"
    :portal-target="controller.context.root.ownerDocument.body" :content-attributes="{ ...overlay.ownerAttributes, lang: locale }"
    :recent-colors="recentColors" :show-alpha="false" :reset-label="noFillLabel"
    @update:open="requestOpen" @update:model-value="preview" @commit="commit" @reset="clear">
    <template #trigger>
      <QuireToolbarColorPickerDisclosure v-bind="{ ...overlay.ownerAttributes, ...(item.reason ? { disabledReason: triggerTitle } : {}) }"
        :label="triggerLabel" :tooltip="triggerTitle" :disabled="disabled"
        data-object-toolbar-control :data-object-action="item.action.id"
        :data-object-color-control="control.id" :data-mixed="control.mixed || undefined">
        <SvgIcon :name="triggerIcon" :accent-color="control.value ?? undefined" :empty="control.value === null && !control.mixed" />
      </QuireToolbarColorPickerDisclosure>
    </template>
  </QuireColorPicker>
</template>
