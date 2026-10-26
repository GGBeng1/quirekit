<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import type {
  ClassicEditorMountedRenderable,
  ClassicEditorRenderContext,
  ClassicEditorWorkspaceWidgetContribution
} from "@classic/types";
import type {
  ClassicEditorWorkspacePanelContribution,
  ClassicEditorWorkspacePanelProvider
} from "@classic/types/workspace-panel";

/** Inputs for one lifecycle-safe always-mounted workspace contribution. */
interface ClassicEditorWorkspaceWidgetProps {
  /** Widget declaration selected from the visible product registry. */
  readonly contribution: ClassicEditorWorkspaceWidgetContribution;
  /** Latest mounted product render context. */
  readonly context: ClassicEditorRenderContext;
}

const props = defineProps<ClassicEditorWorkspaceWidgetProps>();
const emit = defineEmits<{
  /** Publishes or removes one typed panel discovered from this plugin widget. */
  workspacePanelChange: [
    contributionId: string,
    panel: ClassicEditorWorkspacePanelContribution | null
  ];
}>();
const host = ref<HTMLElement>();
let controller: ClassicEditorMountedRenderable | undefined;

/** Releases the current workspace controller before replacement or teardown. */
function destroyController(): void {
  emit("workspacePanelChange", props.contribution.id, null);
  controller?.destroy();
  controller = undefined;
  host.value?.replaceChildren();
}

/** Mounts one workspace controller into the stable layout-neutral host. */
function mountController(): void {
  const currentHost = host.value;
  if (currentHost === undefined) return;
  destroyController();
  controller = props.contribution.mount(props.context);
  if (isWorkspacePanelProvider(controller)) {
    emit(
      "workspacePanelChange",
      props.contribution.id,
      controller.workspacePanel
    );
  }
  const value = controller.element;
  if (typeof value === "string") currentHost.append(value);
  else if (value !== null) currentHost.append(value);
}

watch(
  [host, () => props.contribution],
  mountController,
  { immediate: true, flush: "post" }
);
watch(
  () => props.context,
  (context) => controller?.update?.(context),
  { flush: "post" }
);
onBeforeUnmount(destroyController);

/**
 * Detects the typed provider extension without executing an identity string.
 *
 * @param value - Mounted plugin widget controller.
 * @returns Whether the controller contributes one typed panel descriptor.
 */
function isWorkspacePanelProvider(
  value: ClassicEditorMountedRenderable
): value is ClassicEditorWorkspacePanelProvider {
  if (!("workspacePanel" in value)) return false;
  const panel = value.workspacePanel;
  return panel !== null
    && typeof panel === "object"
    && "id" in panel
    && typeof panel.id === "string"
    && "mount" in panel
    && typeof panel.mount === "function";
}
</script>

<template>
  <div
    ref="host"
    class="qk-classic-editor__workspace-widget"
    :data-workspace-widget="contribution.id"
  />
</template>
