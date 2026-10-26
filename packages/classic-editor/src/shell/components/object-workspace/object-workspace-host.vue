<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  shallowRef
} from "vue";
import { ClassicEditorAnchoredOverlay, type ClassicEditorAnchoredOverlayAnchor } from "@classic/ui/anchored-overlay";
import {
  resolveClassicEditorObjectBarPlacement,
  type ClassicEditorObjectBarReadyPlacement
} from "@classic/runtime/object-workspace";
import type {
  ClassicEditorObjectWorkspaceController,
  ClassicEditorObjectWorkspaceSnapshot
} from "@classic/types/object-workspace";
import ClassicEditorObjectActionBar from "./action-bar.vue";
import ClassicEditorObjectInspectorSheet from "./inspector-sheet.vue";
import { useClassicEditorObjectWorkspaceLayout } from "./use-layout";
import { useClassicEditorSelectionPopupPointerGate } from "../selection-popup/pointer-lifecycle";

/** One root-local object workspace presenter. */
interface ClassicEditorObjectWorkspaceHostProps {
  /** Shared exact-target controller. */
  readonly controller: ClassicEditorObjectWorkspaceController;
}

const props = defineProps<ClassicEditorObjectWorkspaceHostProps>();
const snapshot = shallowRef<ClassicEditorObjectWorkspaceSnapshot>(props.controller.snapshot);
const placementRevision = shallowRef(0);
const surfaceSize = shallowRef({ width: 620, height: 40 });
const pointerInProgress = useClassicEditorSelectionPopupPointerGate(() => props.controller.context.root, refreshPlacement);
const layout = useClassicEditorObjectWorkspaceLayout(props.controller.context.root);
const unsubscribe = props.controller.subscribe((next) => {
  snapshot.value = next;
});
const actions = computed(() => {
  // Controller snapshots are immutable but not Vue proxies. Read their revision
  // so replacing one exact object contribution invalidates the action recipe.
  void snapshot.value.revision;
  return snapshot.value.contribution?.toolbar
    ? { primary: [], overflow: [] }
    : props.controller.projectActions(layout.value);
});
const placement = computed<ClassicEditorObjectBarReadyPlacement | null>(() => {
  void placementRevision.value;
  const target = snapshot.value.contribution?.resolveTarget().target ?? snapshot.value.target;
  if (layout.value !== "wide" || target === null) return null;
  const root = props.controller.context.root;
  const boundary = (root.querySelector(".qk-classic-editor__workspace-viewport") ?? root).getBoundingClientRect();
  const outcome = resolveClassicEditorObjectBarPlacement({
    anchor: target.anchor,
    boundary: { x: boundary.left, y: boundary.top, width: boundary.width, height: boundary.height },
    surface: { width: Math.min(surfaceSize.value.width, boundary.width), height: surfaceSize.value.height },
    gap: 8
  });
  return outcome.status === "ready" ? outcome : null;
});
/** @returns Current canonical object fragments without using the floated toolbar as its target. */
function resolveAnchor(): ClassicEditorAnchoredOverlayAnchor | null {
  void snapshot.value.revision;
  void placementRevision.value;
  const target = snapshot.value.contribution?.resolveTarget().target ?? snapshot.value.target;
  if (!target || target.anchor.status !== "ready") return null;
  const rect = target.anchor.rects[0];
  if (!rect) return null;
  return { x: rect.x + rect.width / 2, y: rect.y, rects: target.anchor.rects };
}
const showActions = computed(() => (
  snapshot.value.contribution !== null
  && !pointerInProgress.value
  && snapshot.value.freshness?.status !== "unavailable"
  && (layout.value !== "wide" || resolveAnchor() !== null)
));
const actionBarProps = computed(() => ({
  controller: props.controller, snapshot: snapshot.value, layout: layout.value,
  primary: actions.value.primary, overflow: actions.value.overflow,
  showInspector: snapshot.value.contribution?.inspector !== undefined, placement: placement.value
}));

/** Refreshes placement when the existing pointer gate completes, never on document scroll. */
function refreshPlacement(): void {
  placementRevision.value += 1;
}

/** @param size - Measured native Toolbar size, including both rows. */
function updateSize(size: { width: number; height: number }): void {
  if (size.width !== surfaceSize.value.width || size.height !== surfaceSize.value.height) surfaceSize.value = size;
}

onBeforeUnmount(() => {
  unsubscribe();
});
</script>

<template>
  <div
    class="qk-object-workspace"
    :data-object-workspace-layout="layout"
    :data-object-target="snapshot.target?.id"
    :data-object-freshness="snapshot.freshness?.status"
  >
    <ClassicEditorAnchoredOverlay v-if="layout === 'wide'" :show="showActions"
      :anchor="resolveAnchor()" :resolve-anchor="resolveAnchor" :editor-root="controller.context.root" placement="top" persistent
      overlay-family="object-toolbar">
      <template #default="{ ownerAttributes, style, portalTarget }">
        <ClassicEditorObjectActionBar v-bind="{ ...actionBarProps, ...ownerAttributes }"
          :surface-style="style" :portal-target="portalTarget" @size="updateSize" />
      </template>
    </ClassicEditorAnchoredOverlay>
    <ClassicEditorObjectActionBar v-else-if="showActions" v-bind="actionBarProps" @size="updateSize" />
    <ClassicEditorObjectInspectorSheet :controller="controller" />
  </div>
</template>
