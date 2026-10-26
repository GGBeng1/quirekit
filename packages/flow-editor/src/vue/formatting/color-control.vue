<script setup lang="ts">
import { useFlowMessages } from "../messages";
import { computed, ref, watch } from "vue";
import { normalizeHexColor } from "@quirekit/ui";
import { QuireColorPicker, QuireIcon, QuireToolbarColorPickerDisclosure, QuireToolbarSplitButton, type QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import type { FlowchartColorTarget } from "@quirekit/flowchart-x6";
import type { FlowColorIntent, FlowFormattingContext } from "./types";

const { t } = useFlowMessages();
const props = defineProps<{
  /** Public toolbar state and guarded execution boundary. */
  scope: QuireKitToolbarRendererScope;
}>();
const context = computed(() => props.scope.context as FlowFormattingContext);
const target = computed(() => props.scope.item.value as FlowchartColorTarget);
const selection = computed(() => JSON.stringify(context.value.state.selectedIds));
const current = computed(() => context.value.state.selectedStyle[target.value]);
const remembered = ref<string>(), draft = ref("#2563EB"), recent = ref<string[]>([]);
const applied = computed(() => remembered.value ?? normalizeHexColor(current.value ?? "") ?? (target.value === "fill" ? "#DBEAFE" : "#2563EB"));
const disclosureLabel = computed(() => t("选择{label}", { label: props.scope.item.label }));
let opening: { editor: FlowFormattingContext["editor"]; selection: string } | undefined;
let pending = false;

/** @param color - Last committed value or split-button repeat. @param repeat - Explicit primary action; delayed picker events require their original popup owner. */
function commit(color: string, repeat = false): void {
  const normalized = normalizeHexColor(color), owner = repeat ? { editor: context.value.editor, selection: selection.value } : opening;
  if (!owner) return;
  if (!normalized || props.scope.disabled || !owner.editor || owner.editor !== context.value.editor || owner.selection !== selection.value) return;
  pending = false; draft.value = normalized; remembered.value = normalized;
  recent.value = [normalized, ...recent.value.filter(value => value !== normalized)].slice(0, 10);
  props.scope.execute({ kind: "color", target: target.value, color: normalized, selection: owner.selection, editor: owner.editor } satisfies FlowColorIntent);
}
/** @param color - Transient picker value; not yet a document operation. */
function preview(color: string): void {
  const normalized = normalizeHexColor(color);
  if (!normalized || !opening) return;
  draft.value = normalized; pending = true;
}
/** @param open - Public color-picker popup transition. */
function setOpen(open: boolean): void {
  if (open) {
    if (props.scope.disabled) return;
    opening = { editor: context.value.editor, selection: selection.value };
    draft.value = normalizeHexColor(current.value ?? "") ?? applied.value; pending = false;
  } else {
    if (pending && opening) commit(draft.value);
    opening = undefined; pending = false;
  }
  props.scope.setExpanded(open);
}
// Selection/lifetime revocation discards pending values before any delayed close
// can apply them. Color commits do not steal the popup's keyboard ownership.
watch([() => context.value.editor, selection, () => props.scope.disabled], () => {
  pending = false; opening = undefined; props.scope.setExpanded(false);
}, { flush: "sync" });
</script>

<template>
  <QuireToolbarSplitButton :label="scope.item.label" :action-label="t('应用{label}', { label: scope.item.label })" :disclosure-label="disclosureLabel"
    :action-tooltip="t('应用{label} {color}', { label: scope.item.label, color: applied })" v-bind="scope.item.text === undefined ? {} : { text: scope.item.text }" :disabled="scope.disabled" :expanded="scope.expanded" popup="dialog" @action="commit(applied, true)">
    <QuireIcon :name="scope.item.icon" :accent-color="applied" />
    <template #disclosure>
      <QuireColorPicker :model-value="draft" :open="scope.expanded" :label="disclosureLabel" :disabled="scope.disabled" :recent-colors="recent"
        :show-alpha="false" :allow-reset="false" @update:model-value="preview" @update:open="setOpen" @commit="commit">
        <template #trigger>
          <QuireToolbarColorPickerDisclosure class="qk-toolbar__split-disclosure" :label="disclosureLabel" :disabled="scope.disabled">
            <QuireIcon name="chevronDown" />
          </QuireToolbarColorPickerDisclosure>
        </template>
      </QuireColorPicker>
    </template>
  </QuireToolbarSplitButton>
</template>
