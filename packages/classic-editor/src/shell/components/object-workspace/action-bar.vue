<script setup lang="ts">
import {
  QuireToolbar,
  QuireToolbarAction,
  QuireToolbarGroup,
  QuireToolbarToggle
} from "@quirekit/ui/vue";
import { computed, ref, type CSSProperties } from "vue";
import { resolveClassicEditorText } from "@classic/localization";
import type { ClassicEditorObjectBarReadyPlacement } from "@classic/runtime/object-workspace";
import type {
  ClassicEditorObjectActionProjection,
  ClassicEditorObjectWorkspaceController,
  ClassicEditorObjectWorkspaceSnapshot,
  ClassicEditorObjectWorkspaceLayout
} from "@classic/types/object-workspace";

import SvgIcon from "../svg-icon.vue";
import ClassicEditorObjectActionMenu from "./action-menu.vue";
import ClassicEditorObjectColorControl from "./color-control.vue";
import ClassicEditorObjectMenuControl from "./menu-control.vue";
import { resolveObjectWorkspaceMessages } from "./localization";
import ConfiguredToolbar from "./configured-toolbar.vue";
import { useObjectToolbarSize } from "./use-surface-size";

/** Responsive action-bar inputs. */
interface ClassicEditorObjectActionBarProps {
  /** Immutable context boundary for a feature-owned Toolbar factory. */
  readonly snapshot: ClassicEditorObjectWorkspaceSnapshot;
  /** Shared exact-target controller. */
  readonly controller: ClassicEditorObjectWorkspaceController;
  /** Current responsive projection. */
  readonly layout: ClassicEditorObjectWorkspaceLayout;
  /** Visible direct actions. */
  readonly primary: readonly ClassicEditorObjectActionProjection[];
  /** Overflow direct actions. */
  readonly overflow: readonly ClassicEditorObjectActionProjection[];
  /** Whether this object explicitly contributes an Inspector surface. */
  readonly showInspector: boolean;
  /** Collision-aware placement for the wide floating bar. */
  readonly placement: ClassicEditorObjectBarReadyPlacement | null;
  /** Shared document-overlay projection; bottom bars remain in the product shell. */
  readonly surfaceStyle?: CSSProperties | undefined;
  /** Shared document host for nested configured menus. */
  readonly portalTarget?: HTMLElement | undefined;
}

const props = defineProps<ClassicEditorObjectActionBarProps>();
const emit = defineEmits<{ /** Actual rendered surface size used for collision placement. */ size: [size: { width: number; height: number }] }>();
const surface = ref<HTMLElement | null>(null);
useObjectToolbarSize(surface, size => emit("size", size));
const messages = computed(() => resolveObjectWorkspaceMessages(
  props.controller.context.locale
));

/** @param item - Exact direct action projection. */
async function execute(item: ClassicEditorObjectActionProjection): Promise<void> {
  if (!item.state.canExecute || item.busy) return;
  await props.controller.execute(item.action, "contextual-popup");
}

/** Opens the single Inspector projection and captures the exact trigger. */
function openInspector(event: MouseEvent): void {
  props.controller.openInspector(
    props.layout,
    event.currentTarget as HTMLButtonElement
  );
}

/** @param item - Direct action projection. @returns Localized accessible label. */
function actionLabel(item: ClassicEditorObjectActionProjection): string {
  return resolveClassicEditorText(item.action.label, props.controller.context.locale);
}

/** @param item - Direct action projection. @returns Tooltip label or disabled reason. */
function actionTitle(item: ClassicEditorObjectActionProjection): string {
  return item.reason === null
    ? actionLabel(item)
    : resolveClassicEditorText(item.reason.message, props.controller.context.locale);
}
</script>

<template>
  <div
    ref="surface"
    class="qk-object-action-surface"
    :class="[`qk-object-action-surface--${layout}`, { 'qk-object-action-surface--configured': snapshot.contribution?.toolbar }]"
    :style="surfaceStyle"
  >
    <span v-if="layout !== 'wide'" class="qk-object-action-bar__target">
      {{ controller.snapshot.target
        ? resolveClassicEditorText(controller.snapshot.target.label, controller.context.locale)
        : '' }}
    </span>
    <ConfiguredToolbar v-if="snapshot.contribution?.toolbar"
      :key="`${snapshot.target?.id}:${snapshot.target?.revision}`"
      :factory="snapshot.contribution.toolbar" :controller="controller" :snapshot="snapshot" :layout="layout" :portal-target="portalTarget" />
    <QuireToolbar v-else
      class="qk-object-action-bar"
      :class="`qk-object-action-bar--${layout}`"
      :label="messages.actions"
      :variant="layout === 'wide' ? 'elevated' : 'plain'"
      :data-object-layout="layout === 'wide' ? 'floating' : 'bottom'"
      :data-object-occlusion="placement?.occlusion"
      overflow="scroll"
      scrollbar="hidden"
      align="center"
      preserve-focus
    >
      <QuireToolbarGroup class="qk-object-action-bar__actions" :label="messages.actions">
      <template v-for="item in primary" :key="item.action.id">
        <ClassicEditorObjectColorControl
          v-if="item.control?.kind === 'color'"
          :controller="controller"
          :layout="layout"
          :item="item"
          :control="item.control"
        />
        <ClassicEditorObjectMenuControl
          v-else-if="item.control?.kind === 'menu'"
          :controller="controller"
          :layout="layout"
          :item="item"
          :control="item.control"
        />
        <QuireToolbarToggle
          v-else-if="item.action.isActive"
          :model-value="item.mixed ? 'mixed' : item.state.active"
          :label="actionLabel(item)"
          :tooltip="actionTitle(item)"
          :disabled="!item.state.canExecute || item.busy"
          v-bind="item.reason ? { disabledReason: actionTitle(item) } : {}"
          data-object-toolbar-control
          :data-object-action="item.action.id"
          :data-mixed="item.mixed || undefined"
          @activate="execute(item)"
        >
          <SvgIcon v-if="item.action.icon" :name="item.action.icon" />
          <span v-else>{{ actionLabel(item) }}</span>
        </QuireToolbarToggle>
        <QuireToolbarAction
          v-else
          :label="actionLabel(item)"
          :tooltip="actionTitle(item)"
          :disabled="!item.state.canExecute || item.busy"
          v-bind="item.reason ? { disabledReason: actionTitle(item) } : {}"
          data-object-toolbar-control
          :data-object-action="item.action.id"
          :data-mixed="item.mixed || undefined"
          @activate="execute(item)"
        >
          <SvgIcon v-if="item.action.icon" :name="item.action.icon" />
          <span v-else>{{ actionLabel(item) }}</span>
        </QuireToolbarAction>
      </template>
      <QuireToolbarAction
        v-if="showInspector"
        :label="messages.properties"
        data-object-toolbar-control
        data-object-properties
        @activate="openInspector"
      >
        <SvgIcon name="paragraphSettings" />
      </QuireToolbarAction>
      <ClassicEditorObjectActionMenu
        v-if="overflow.length > 0"
        :controller="controller"
        :actions="overflow"
        :layout="layout"
      />
      </QuireToolbarGroup>
    </QuireToolbar>
  </div>
</template>
