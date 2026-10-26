<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { resolveClassicEditorText } from "@classic/localization";
import type {
  ClassicEditorActionDefinition,
  ClassicEditorObjectColorControl,
  ClassicEditorObjectWorkspaceController
} from "@classic/types";
import { QuireColorPickerRoot, QuireColorPalette, QuireColorEditor } from "@quirekit/ui/vue";

/** Action sources admitted by the exact-target object controller. */
type ClassicEditorObjectSurfaceSource = Parameters<
  ClassicEditorObjectWorkspaceController["execute"]
>[1];

/** Inputs for the reusable exact-action color surface. */
interface ClassicEditorObjectColorSurfaceProps {
  /** Shared exact-target controller. */
  readonly controller: ClassicEditorObjectWorkspaceController;
  /** Exact retained action used for apply and clear. */
  readonly action: ClassicEditorActionDefinition;
  /** Current color and mixed facts supplied by the owner. */
  readonly control: ClassicEditorObjectColorControl;
  /** Whether the containing transient surface is currently open. */
  readonly open: boolean;
  /** Canonical action source used for state resolution and execution. */
  readonly source?: ClassicEditorObjectSurfaceSource | undefined;
}

const props = withDefaults(defineProps<ClassicEditorObjectColorSurfaceProps>(), {
  source: "contextual-popup"
});
const emit = defineEmits<{
  /** Reports whether the containing transient surface should close. */
  executed: [shouldClose: boolean];
}>();
const moreVisible = ref(false);
const draft = ref(props.control.value ?? "#000000");
const edited = ref(false);
const recentColors = ref<string[]>([]);
const locale = computed(() => props.controller.context.locale);
const label = computed(() => resolveClassicEditorText(
  props.action.label,
  locale.value
));
const noFillLabel = computed(() => (
  locale.value === "zh-CN" ? "无填充" : "No fill"
));

/**
 * Applies one arbitrary color through the retained exact action.
 *
 * @param value - Normalized palette color.
 * @param shouldClose - Whether successful execution closes the parent surface.
 * @returns Completion after the exact action and close decision.
 */
async function apply(value: string, shouldClose = true): Promise<void> {
  edited.value = false;
  const handled = await props.controller.execute(
    props.action,
    props.source,
    { value }
  );
  if (handled) {
    recentColors.value = [
      value,
      ...recentColors.value.filter(color => color !== value)
    ].slice(0, 8);
  }
  emit("executed", handled && shouldClose);
}

/** Clears the exact color slot through the same retained action. */
async function clear(): Promise<void> {
  edited.value = false;
  const handled = await props.controller.execute(
    props.action,
    props.source,
    { value: null }
  );
  if (handled) moreVisible.value = false;
  emit("executed", handled);
}

/** Toggles the shared custom-color editor. */
function toggleMore(): void {
  if (edited.value) void apply(draft.value, false);
  moreVisible.value = !moreVisible.value;
}

/** @param value - Custom color retained for continued refinement. @returns Action completion. */
function applyCustom(value: string): Promise<void> {
  return apply(value, false);
}

watch(() => props.control.value, value => { if (value !== null) draft.value = value; });

watch(() => props.open, (open) => {
  if (!open) {
    if (edited.value) void apply(draft.value, false);
    moreVisible.value = false;
  }
});

/** @param value - Channel input draft committed at gesture end or surface dismissal. */
function preview(value: string): void { draft.value = value; edited.value = true; }
</script>

<template>
  <QuireColorPickerRoot :model-value="draft" inline :disabled="controller.resolveActionState(action, source)?.canExecute !== true"
    @update:model-value="preview" @value-change-end="applyCustom">
    <QuireColorPalette v-if="!moreVisible"
      :reset-active="control.value === null && !control.mixed" :reset-label="noFillLabel"
      :recent-colors="recentColors"
      @more="toggleMore" @reset="clear" @commit="apply" />
    <QuireColorEditor v-else :label="label" :show-alpha="false" show-back @back="toggleMore" />
  </QuireColorPickerRoot>
</template>
