<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  toRef,
  watch
} from "vue";
import type {
  ClassicEditorContextMenuTrigger,
  ClassicEditorRenderContext
} from "@classic/types";
import { NodeSelection } from "@quirekit/pm";
import { QuireMenu, QuireMenuItems } from "@quirekit/ui/vue";
import SvgIcon from "./svg-icon.vue";
import { useClassicEditorShellContributions } from "../composables/use/shell-contributions";
import type { ClassicEditorShellModel } from "../types";
import {
  createClassicEditorBehaviorSurfaceOptions,
  filterClassicEditorContextMenuRoles,
  type ClassicEditorContextSurfaceItemContribution
} from "./behavior-surface-options";
import {
  placeClassicEditorContextMenuCaret,
  readClassicEditorContextMenuSelection
} from "./context-menu-selection";
import {
  executeClassicEditorContributionAction,
  resolveClassicEditorContributionActionState,
  resolveClassicEditorContributionBehavior
} from "../contribution/utils";
import ClassicEditorSelectionPopup from "./selection-popup/selection-popup.vue";
import BlockRail from "./block-interaction/block-rail.vue";

/** Inputs required by extension-owned action surfaces. */
interface ClassicEditorBehaviorSurfacesProps {
  /** Reactive private shell model. */
  readonly model: ClassicEditorShellModel;
  /** Product root that receives editor pointer events. */
  readonly root: HTMLElement | undefined;
}

const props = defineProps<ClassicEditorBehaviorSurfacesProps>();
const root = toRef(props, "root");
const model = toRef(props, "model");
const { select, text } = useClassicEditorShellContributions(model);
const contextTrigger = ref<ClassicEditorContextMenuTrigger | null>(null);
const contextItems = computed(() => resolveItems(
  select("context-menu-item"),
  contextTrigger.value
));
const contextOptions = computed(() => createClassicEditorBehaviorSurfaceOptions(
  contextItems.value,
  contextTrigger.value,
  props.model.context,
  text
));
const contextAnchorProps = computed(() => contextTrigger.value === null
  ? {}
  : {
      anchorPoint: {
        x: contextTrigger.value.clientX,
        y: contextTrigger.value.clientY
      }
    });

/**
 * Rebinds the capture listener when the private shell root changes.
 *
 * @param current - Current product root.
 * @param previous - Previously observed product root.
 */
watch(root, (current, previous) => {
  previous?.removeEventListener("contextmenu", handleContextMenu, true);
  previous?.removeEventListener("keydown", handleContextMenuKeydown, true);
  current?.addEventListener("contextmenu", handleContextMenu, true);
  current?.addEventListener("keydown", handleContextMenuKeydown, true);
}, { immediate: true });

onBeforeUnmount(() => {
  root.value?.removeEventListener("contextmenu", handleContextMenu, true);
  root.value?.removeEventListener("keydown", handleContextMenuKeydown, true);
});

/**
 * Opens the extension context menu only when at least one item applies.
 *
 * @param event - Browser context-menu event inside the product root.
 */
function handleContextMenu(event: MouseEvent): void {
  const context = props.model.context;
  if (context === undefined) return;
  // Paper admission precedes caret placement: nearby-position hits also exist
  // in workspace gaps and must not move selection or open document actions.
  if (!shouldAnchorContextMenuToSelection(event.target)
    && !props.model.containsPagePoint?.(event.clientX, event.clientY)) {
    contextTrigger.value = null;
    return;
  }
  const hit = context.editor.view.posAtCoords({
    left: event.clientX,
    top: event.clientY
  });
  placeClassicEditorContextMenuCaret(context.editor, hit ?? null);
  const documentPosition = hit?.objectPosition ?? hit?.pos ?? (
    shouldAnchorContextMenuToSelection(event.target)
      ? context.editor.state.pm.selection.head
      : null
  );
  const trigger: ClassicEditorContextMenuTrigger = {
    kind: "context-menu",
    clientX: event.clientX,
    clientY: event.clientY,
    documentPosition,
    selection: readClassicEditorContextMenuSelection(context.editor)
  };
  openContextMenu(trigger, event);
}

/**
 * Opens the same context-menu model from Context Menu or Shift+F10.
 *
 * @param event - Captured product-root keyboard event.
 */
function handleContextMenuKeydown(event: KeyboardEvent): void {
  if (
    event.defaultPrevented
    || event.isComposing
    || (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10"))
  ) return;
  const context = props.model.context;
  if (context === undefined) return;
  const selection = context.editor.state.pm.selection;
  const documentPosition = selection instanceof NodeSelection ? selection.from : selection.head;
  const coords = context.editor.view.coordsAtPos(documentPosition);
  openContextMenu({
    kind: "context-menu",
    clientX: coords.left,
    clientY: coords.bottom,
    documentPosition,
    selection: readClassicEditorContextMenuSelection(context.editor)
  }, event);
}

/**
 * Commits one normalized context-menu trigger when at least one item applies.
 *
 * @param trigger - Pointer- or keyboard-derived trigger.
 * @param event - Native event that must be suppressed after product ownership.
 */
function openContextMenu(
  trigger: ClassicEditorContextMenuTrigger,
  event: Event
): void {
  if (resolveItems(select("context-menu-item"), trigger).length === 0) return;
  event.preventDefault();
  event.stopPropagation();
  contextTrigger.value = trigger;
}

/**
 * Reports whether a non-document chrome target should use the current selection.
 *
 * @param target - Native event target inside the Classic product root.
 * @returns Whether the capability opted into selection-backed context placement.
 */
function shouldAnchorContextMenuToSelection(target: EventTarget | null): boolean {
  return target instanceof Element
    && target.closest("[data-classic-context-from-selection]") !== null;
}

/**
 * Resolves applicable and installed items for one normalized trigger.
 *
 * @param contributions - Contributions already filtered by registry profile.
 * @param trigger - Current surface trigger.
 * @returns Applicable items in registry order after role competition.
 */
function resolveItems<
  Item extends ClassicEditorContextSurfaceItemContribution
>(
  contributions: readonly Item[],
  trigger: ClassicEditorContextMenuTrigger | null
): readonly Item[] {
  const context = props.model.context;
  if (context === undefined || trigger === null) return [];
  return filterClassicEditorContextMenuRoles(contributions.filter((item) => {
    if (item.whenTrigger?.(trigger, context) === false) return false;
    const payload = item.payload?.(trigger, context);
    if ("action" in item) {
      return resolveClassicEditorContributionActionState(
        item,
        context,
        payload,
        "context-menu",
        trigger
      ).available;
    }
    return (() => {
      const behavior = resolveClassicEditorContributionBehavior(item);
      return behavior !== undefined && context.instance.isContributionAvailable(
        behavior,
        payload
      );
    })();
  }));
}

/**
 * Executes one context-menu item through its registered product behavior.
 *
 * @param key - Selected contribution id.
 */
async function executeContext(key: string | number): Promise<void> {
  const trigger = contextTrigger.value;
  const context = props.model.context;
  const item = contextItems.value.find((candidate) => candidate.id === String(key));
  if (context === undefined || trigger === null || item === undefined) return;
  const payload = item.payload?.(trigger, context);
  // Retain the clicked target, then remove the menu layer before an action can
  // register a dialog. Ark otherwise dismisses that dialog with its old parent.
  contextTrigger.value = null;
  await nextTick();
  if (props.model.context?.editor !== context.editor
    || props.model.context.instance !== context.instance) return;
  if ("action" in item) {
    await executeClassicEditorContributionAction(
      item,
      context,
      payload,
      "context-menu",
      trigger
    );
  } else {
    const behavior = resolveClassicEditorContributionBehavior(item);
    await context.instance.executeContribution(
      behavior,
      payload,
      { source: "context-menu", detail: trigger }
    );
  }
  if (item.restoreEditorFocus !== false) await restoreBehaviorSurfaceFocus(context);
}

/**
 * Restores editor focus only after the action surface has applied its close state.
 *
 * @param context - Still-mounted context that executed the selected action.
 */
async function restoreBehaviorSurfaceFocus(
  context: ClassicEditorRenderContext | null
): Promise<void> {
  if (context === null) return;
  await nextTick();
  const latest = props.model.context;
  if (
    latest?.editor === context.editor
    && latest.instance === context.instance
  ) {
    // Closing a floating product surface must only return native input
    // ownership. Dispatching a scroll-only focus transaction can race a shell
    // refresh or backend remount and applies no document/selection value.
    latest.editor.commands.focus(null, { scrollIntoView: false });
  }
}

</script>

<template>
  <QuireMenu :open="contextTrigger !== null && contextOptions.length > 0"
    v-bind="contextAnchorProps" :lang="model.context?.locale" width="auto" :min-width="200" :max-width="360"
    :portal-target="root?.ownerDocument.body ?? 'body'" @update:open="!$event && (contextTrigger = null)">
    <QuireMenuItems :items="contextOptions" :content-props="{ lang: model.context?.locale }" @select="executeContext">
      <template #leading="{ item }"><SvgIcon v-if="contextItems.find(entry => entry.id === item.value)?.icon" :name="contextItems.find(entry => entry.id === item.value)!.icon!" /></template>
    </QuireMenuItems>
  </QuireMenu>
  <ClassicEditorSelectionPopup :model="model" :root="root" />
  <BlockRail :model="model" :root="root" />
</template>
