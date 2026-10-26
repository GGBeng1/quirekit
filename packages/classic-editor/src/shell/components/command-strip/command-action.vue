<script setup lang="ts">
import { computed } from "vue";
import { QuireButton, QuireTooltipRoot, QuireTooltipTrigger, QuireTooltipContent } from "@quirekit/ui/vue";
import type { ClassicEditorActionRibbonControlContribution } from "@classic/types";
import {
  executeClassicEditorContributionAction,
  resolveClassicEditorContributionActionState
} from "../../contribution/utils";
import { resolveClassicEditorControlInteraction, showsClassicEditorControlIcon } from "../../contribution/control-presentation";
import type { ClassicEditorShellModel } from "../../types";
import SvgIcon from "../svg-icon.vue";

/** Inputs for one direct typed action in the Command Strip. */
interface ClassicEditorCommandActionProps {
  /** Reactive private shell model. */
  readonly model: ClassicEditorShellModel;
  /** Direct action contribution retained by the surface. */
  readonly contribution: ClassicEditorActionRibbonControlContribution;
  /** Resolved localized visible label. */
  readonly label: string;
  /** Optional localized tooltip override. */
  readonly title?: string | undefined;
  /** Whether the expanded strip displays the text label. */
  readonly showLabel: boolean;
}

/** Events emitted after a direct action handles a request. */
interface ClassicEditorCommandActionEmits {
  /** Notifies the owning strip after successful typed execution. */
  executed: [];
}

const props = defineProps<ClassicEditorCommandActionProps>();
const emit = defineEmits<ClassicEditorCommandActionEmits>();
const interaction = computed(() => resolveClassicEditorControlInteraction(props.contribution));
const state = computed(() => {
  const context = props.model.context;
  return context === undefined ? null : resolveClassicEditorContributionActionState(
    props.contribution,
    context,
    undefined,
    "ribbon"
  );
});
const accessibleTitle = computed(() => {
  const reason = state.value?.reason?.message;
  if (reason === undefined) return props.title ?? props.label;
  const locale = props.model.context?.locale ?? props.model.locale;
  const copy = typeof reason === "string" ? reason : reason[locale] ?? reason.en;
  return `${props.title ?? props.label} — ${copy}`;
});

/** Executes the retained direct action after its current state has been revalidated. */
async function execute(): Promise<void> {
  const context = props.model.context;
  if (context === undefined) return;
  if (await executeClassicEditorContributionAction(
    props.contribution,
    context,
    undefined,
    "ribbon"
  )) emit("executed");
}
</script>

<template>
  <QuireTooltipRoot placement="bottom"><QuireTooltipTrigger as-child><QuireButton
    type="button"
    class="qk-classic-command-action"
    data-command-strip-focus="true"
    :data-action="contribution.action.id"
    :data-action-id="contribution.action.id"
    :disabled="state?.canExecute !== true"
    :aria-label="label"
    :aria-pressed="interaction === 'toggle' ? state?.active ?? false : undefined"
    :aria-expanded="interaction === 'disclosure' ? state?.active ?? false : undefined"
    tabindex="-1"
    @pointerdown.prevent
    @click="execute"
  >
    <SvgIcon
      v-if="showsClassicEditorControlIcon(contribution) && contribution.icon"
      :name="contribution.icon"
    />
    <span v-if="showLabel" class="qk-classic-command-action__label">{{ label }}</span>
    <span v-else class="qk-classic-editor__sr-only">{{ label }}</span>
  </QuireButton></QuireTooltipTrigger>
    <QuireTooltipContent :content="accessibleTitle" />
  </QuireTooltipRoot>
</template>
