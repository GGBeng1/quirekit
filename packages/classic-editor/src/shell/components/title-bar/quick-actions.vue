<script setup lang="ts">
import { computed, toRef } from "vue";
import { QuireButton, QuireTooltipRoot, QuireTooltipTrigger, QuireTooltipContent } from "@quirekit/ui/vue";
import { useClassicEditorShellContributions } from "../../composables/use/shell-contributions";
import {
  showsClassicEditorControlIcon,
  resolveClassicEditorControlInteraction,
  showsClassicEditorControlLabel
} from "../../contribution/control-presentation";
import {
  executeClassicEditorContributionAction,
  resolveClassicEditorContributionActionState
} from "../../contribution/utils";
import type { ClassicEditorShellModel } from "../../types";
import SvgIcon from "../svg-icon.vue";

/** Inputs for the downstream direct-action quick toolbar. */
interface ClassicEditorQuickActionsProps {
  /** Reactive private shell model. */
  readonly model: ClassicEditorShellModel;
}

const props = defineProps<ClassicEditorQuickActionsProps>();
const { message, select, text } = useClassicEditorShellContributions(
  toRef(props, "model")
);
const actions = computed(() => select("toolbar-action-control"));

/**
 * Resolves one quick action's current direct action state.
 *
 * @param action - Direct toolbar action contribution.
 * @returns Current executable and toggle state, or null before mount.
 */
function actionState(action: (typeof actions.value)[number]) {
  const context = props.model.context;
  return context === undefined ? null : resolveClassicEditorContributionActionState(
    action,
    context,
    undefined,
    "toolbar"
  );
}

/**
 * Executes one retained quick action through its direct typed definition.
 *
 * @param action - Direct toolbar action contribution.
 */
function execute(action: (typeof actions.value)[number]): void {
  const context = props.model.context;
  if (context === undefined) return;
  void executeClassicEditorContributionAction(
    action,
    context,
    undefined,
    "toolbar"
  );
}
</script>

<template>
  <div
    v-show="model.options.toolbar && actions.length > 0"
    class="qk-classic-editor__quick-actions"
    role="toolbar"
    :aria-label="message('quickActions')"
  >
    <QuireTooltipRoot
      v-for="action in actions"
      :key="action.id"
      :open-delay="420"
      placement="bottom"
    >
      <QuireTooltipTrigger as-child>
          <QuireButton
            type="button"
            class="qk-classic-editor__quick-action"
            :class="{
              'qk-classic-editor__quick-action--labeled':
                showsClassicEditorControlLabel(action),
              'qk-classic-editor__quick-action--active':
                actionState(action)?.active === true
            }"
            :data-action="action.id"
            :disabled="actionState(action)?.canExecute !== true"
            :aria-label="text(action.label)"
            :aria-pressed="resolveClassicEditorControlInteraction(action) === 'toggle' ? actionState(action)?.active ?? false : undefined"
            :aria-expanded="resolveClassicEditorControlInteraction(action) === 'disclosure' ? actionState(action)?.active ?? false : undefined"
            @pointerdown.prevent
            @click="execute(action)"
          >
            <SvgIcon
              v-if="showsClassicEditorControlIcon(action) && action.icon"
              :name="action.icon"
            />
            <span
              v-if="showsClassicEditorControlLabel(action)"
              class="qk-classic-editor__quick-action-label"
            >
              {{ text(action.label) }}
            </span>
            <span v-else class="qk-classic-editor__sr-only">
              {{ text(action.label) }}
            </span>
          </QuireButton>
      </QuireTooltipTrigger>
      <QuireTooltipContent :content="text(action.title ?? action.label)" />
    </QuireTooltipRoot>
  </div>
</template>
