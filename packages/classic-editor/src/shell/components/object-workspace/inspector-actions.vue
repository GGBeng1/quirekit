<script setup lang="ts">
import { computed } from "vue";
import { QuireButton } from "@quirekit/ui/vue";
import { resolveClassicEditorText } from "@classic/localization";
import type {
  ClassicEditorActionDefinition,
  ClassicEditorObjectWorkspaceController
} from "@classic/types";
import SvgIcon from "../svg-icon.vue";

/** Immediate Inspector action-group inputs. */
interface Props {
  /** Shared exact-target controller. */
  readonly controller: ClassicEditorObjectWorkspaceController;
  /** Visible and accessible action-group label. */
  readonly label: string;
  /** Feature-owned actions in stable presentation order. */
  readonly actions: readonly ClassicEditorActionDefinition[];
  /** Snapshot revision invalidating resolved action state. */
  readonly revision: number;
  /** Optional feature-owned input forwarded unchanged to each immediate action. */
  readonly input?: unknown;
}

const props = defineProps<Props>();
const items = computed(() => props.actions.map((action) => {
  void props.revision;
  const state = props.controller.resolveActionState(action, "panel", props.input);
  return Object.freeze({
    action,
    label: resolveClassicEditorText(action.label, props.controller.context.locale),
    disabled: state?.canExecute !== true,
    reason: state?.reason === null || state?.reason === undefined
      ? undefined
      : resolveClassicEditorText(state.reason.message, props.controller.context.locale)
  });
}));

/** @param action - Exact retained action requested by the user. */
function execute(action: ClassicEditorActionDefinition): void {
  void props.controller.execute(action, "panel", props.input);
}
</script>

<template>
  <div
    class="qk-object-inspector__action-grid"
    role="group"
    :aria-label="label"
    data-object-inspector-actions
  >
    <QuireButton
      v-for="item in items"
      :key="item.action.id"
      size="sm"
      variant="outline"
      block
      :disabled="item.disabled"
      :aria-description="item.reason"
      :data-object-inspector-action="item.action.id"
      @click="execute(item.action)"
    >
      <span class="qk-object-inspector__action-content">
        <SvgIcon v-if="item.action.icon" :name="item.action.icon" />
        <span class="qk-object-inspector__action-label">{{ item.label }}</span>
      </span>
    </QuireButton>
  </div>
</template>
