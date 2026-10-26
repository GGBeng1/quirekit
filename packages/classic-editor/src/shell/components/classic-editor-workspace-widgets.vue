<script setup lang="ts">
import { computed, shallowRef, toRef } from "vue";
import { useClassicEditorShellContributions } from "../composables/use/shell-contributions";
import type { ClassicEditorShellModel } from "../types";
import type { ClassicEditorWorkspacePanelContribution } from "@classic/types/workspace-panel";
import ClassicEditorWorkspaceWidget from "./classic-editor-workspace-widget.vue";
import ClassicEditorWorkspacePanelHost from "./workspace-panel/workspace-panel-host.vue";

/** Inputs for the always-mounted workspace contribution host. */
interface ClassicEditorWorkspaceWidgetsProps {
  /** Reactive private shell model. */
  readonly model: ClassicEditorShellModel;
}

const props = defineProps<ClassicEditorWorkspaceWidgetsProps>();
const { select } = useClassicEditorShellContributions(toRef(props, "model"));
const widgets = computed(() => select("workspace-widget"));
const panelProviders = new Map<string, ClassicEditorWorkspacePanelContribution>();
const panels = shallowRef<readonly ClassicEditorWorkspacePanelContribution[]>([]);

/**
 * Reconciles one typed panel provider discovered from a mounted plugin widget.
 *
 * @param contributionId - Owning workspace-widget identity.
 * @param panel - Direct typed panel contribution, or null during widget teardown.
 */
function updateWorkspacePanel(
  contributionId: string,
  panel: ClassicEditorWorkspacePanelContribution | null
): void {
  if (panel === null) panelProviders.delete(contributionId);
  else panelProviders.set(contributionId, panel);
  panels.value = Object.freeze([...panelProviders.values()]);
}
</script>

<template>
  <div class="qk-classic-editor__workspace-widgets">
    <ClassicEditorWorkspaceWidget
      v-for="widget in widgets"
      :key="widget.id"
      :contribution="widget"
      :context="model.context!"
      @workspace-panel-change="updateWorkspacePanel"
    />
    <ClassicEditorWorkspacePanelHost
      v-if="model.context"
      :context="model.context"
      :contributions="panels"
    />
  </div>
</template>
