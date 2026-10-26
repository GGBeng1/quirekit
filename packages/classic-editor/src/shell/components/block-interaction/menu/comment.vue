<script setup lang="ts">
import { computed, toRef } from "vue";
import { QuireIcon, QuireMenuItem, QuireMenuSeparator } from "@quirekit/ui/vue";
import type { ClassicEditorShellModel } from "../../../types";
import type { ClassicEditorSelectionPopupActionContribution, ClassicEditorSelectionPopupTrigger } from "@classic/types";
import { useClassicEditorShellContributions } from "../../../composables/use/shell-contributions";
import { executeClassicEditorSelectionPopupAction, resolveClassicEditorSelectionPopupActionState } from "../../selection-popup/action";

const props = defineProps<{
  /** Mounted product context. */
  model: ClassicEditorShellModel;
  /** Original complete block selection. */
  trigger: ClassicEditorSelectionPopupTrigger;
}>();
const emit = defineEmits<{ /** Accepted action closes its parent menu. */ close: [] }>();
const { select, text } = useClassicEditorShellContributions(toRef(props, "model"));
const item = computed(() => select("selection-popup-item").find((entry): entry is ClassicEditorSelectionPopupActionContribution => entry.id === "selection.comment" && !("toolbar" in entry)));
const disabled = computed(() => !item.value || !props.model.context || resolveClassicEditorSelectionPopupActionState(item.value, props.model.context, props.trigger).disabled);
/** Opens the existing comment composer for this complete block selection. */
async function execute(): Promise<void> {
  const context = props.model.context, selection = context?.editor.state.pm.selection;
  if (!context || !item.value || disabled.value || selection?.toJSON().type !== "quire-block-range"
    || selection.from !== props.trigger.from || selection.to !== props.trigger.to) return;
  const action = item.value;
  if (await executeClassicEditorSelectionPopupAction(action, context, props.trigger)) {
    emit("close");
    if (action.restoreEditorFocus !== false) context.editor.view.focus();
  }
}
</script>

<template>
  <template v-if="item">
    <QuireMenuSeparator />
    <QuireMenuItem value="comment" :disabled="disabled" @select="execute">
      <template #leading><QuireIcon :name="item.icon ?? 'messageSquarePlus'" style="color: var(--qk-color-info-text)" /></template>{{ text(item.label) }}
    </QuireMenuItem>
  </template>
</template>
