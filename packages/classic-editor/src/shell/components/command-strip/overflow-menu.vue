<script setup lang="ts">
import { computed, toRef } from "vue";
import type { ClassicEditorActionRibbonControlContribution } from "@classic/types";
import type { QuireKitMenuEntry } from "@quirekit/ui";
import { QuireMenu, QuireMenuItems, QuireButton } from "@quirekit/ui/vue";
import {
  executeClassicEditorContributionAction,
  resolveClassicEditorContributionActionState
} from "../../contribution/utils";
import type { ResolvedClassicEditorCommandStripGroup } from "../../contribution/command-strip";
import { useClassicEditorShellContributions } from "../../composables/use/shell-contributions";
import { useClassicEditorOverlay } from "../../overlays/registry";
import type { ClassicEditorShellModel } from "../../types";
import SvgIcon from "../svg-icon.vue";

/** Inputs for the discoverable Command Strip overflow menu. */
interface ClassicEditorCommandOverflowProps {
  /** Reactive private shell model. */
  readonly model: ClassicEditorShellModel;
  /** Groups moved out of the direct width budget. */
  readonly groups: readonly ResolvedClassicEditorCommandStripGroup[];
}

/** Events emitted after an overflow action handles its request. */
interface ClassicEditorCommandOverflowEmits {
  /** Notifies the owning strip after successful direct execution. */
  executed: [];
}

const props = defineProps<ClassicEditorCommandOverflowProps>();
const emit = defineEmits<ClassicEditorCommandOverflowEmits>();
const { message, text } = useClassicEditorShellContributions(toRef(props, "model"));
const actions = computed(() => props.groups.flatMap((group) => group.items));
const options = computed<QuireKitMenuEntry[]>(() => {
  let actionIndex = 0;
  return props.groups.map((group) => ({
    kind: "group" as const,
    value: `group-${group.id}`,
    label: text(group.label),
    children: group.items.map((item) => {
      const key = actionIndex++;
      return {
        value: String(key),
        label: text(item.label),
        disabled: !actionState(item).canExecute
      };
    })
  }));
});
const overlay = useClassicEditorOverlay("command-overflow", undefined, undefined, undefined, { dismissOnEscape: () => false, dismissOnOutsidePointer: () => false });
const open = computed({ get: overlay.isVisible, set: overlay.setVisible });

const contentProps = computed(() => ({ ...overlay.ownerAttributes, lang: props.model.context?.locale }));

/**
 * Resolves one direct action against the latest mounted context.
 *
 * @param contribution - Retained typed action projection.
 * @returns Current immutable action state.
 */
function actionState(contribution: ClassicEditorActionRibbonControlContribution) {
  const context = props.model.context;
  return context === undefined
    ? { available: false, canExecute: false, active: false, reason: null }
    : resolveClassicEditorContributionActionState(
        contribution,
        context,
        undefined,
        "ribbon"
      );
}

/**
 * Executes the retained action at one numeric presentation position.
 *
 * @param key - Numeric dropdown position; group headings never select.
 * @returns Promise completing after direct typed execution.
 */
async function execute(key: string | number): Promise<void> {
  if (!/^\d+$/.test(String(key))) return;
  const contribution = actions.value[Number(key)];
  const context = props.model.context;
  if (contribution === undefined || context === undefined) return;
  overlay.close();
  if (await executeClassicEditorContributionAction(
    contribution,
    context,
    undefined,
    "ribbon"
  )) emit("executed");
}
</script>

<template>
  <QuireMenu v-model:open="open" v-bind="contentProps" :aria-label="message('moreCommands')" width="240px" placement="bottom-end">
    <template #trigger>
      <QuireButton v-bind="overlay.ownerAttributes" variant="ghost" size="sm"
        class="qk-classic-command-overflow" data-command-strip-focus="true" data-command-overflow="true"
        :aria-label="message('moreCommands')" tabindex="-1">
        <SvgIcon name="moreHorizontal" />
      </QuireButton>
    </template>
    <QuireMenuItems :items="options" :content-props="contentProps" @select="execute" />
  </QuireMenu>
</template>
