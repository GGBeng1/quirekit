<script setup lang="ts">
import {
  QuireButton,
  QuireMenu,
  QuireMenuCheckboxItem,
  QuireMenuItem,
  QuireToolbarDisclosure
} from "@quirekit/ui/vue";
import { computed, nextTick, ref, watch } from "vue";
import { resolveClassicEditorText } from "@classic/localization";
import type {
  ClassicEditorObjectActionProjection,
  ClassicEditorObjectWorkspaceController,
  ClassicEditorObjectWorkspaceLayout
} from "@classic/types/object-workspace";
import SvgIcon from "../svg-icon.vue";
import { useClassicEditorOverlay } from "../../overlays/registry";
import { resolveObjectWorkspaceMessages } from "./localization";

/** Direct overflow-menu inputs. */
interface ClassicEditorObjectActionMenuProps {
  /** Shared exact-target controller. */
  readonly controller: ClassicEditorObjectWorkspaceController;
  /** Direct action objects omitted from the visible bar. */
  readonly actions: readonly ClassicEditorObjectActionProjection[];
  /** Root-local responsive presentation. */
  readonly layout: ClassicEditorObjectWorkspaceLayout;
}

const props = defineProps<ClassicEditorObjectActionMenuProps>();
const overlay = useClassicEditorOverlay("object-more", undefined,
  props.controller.context.ownerDocument, props.controller.context.root,
  { dismissOnEscape: () => props.layout !== "wide", dismissOnOutsidePointer: () => props.layout !== "wide" });
const open = computed({ get: overlay.isVisible, set: overlay.setVisible });
const visible = open;
const trigger = ref<HTMLButtonElement>();
const menu = ref<HTMLElement>();
const pending = ref<string | null>(null);
const failure = ref<string | null>(null);
const messages = computed(() => resolveObjectWorkspaceMessages(props.controller.context.locale));
let revision = 0;
watch(open, next => {
  revision += 1;
  failure.value = null;
  if (next && props.layout !== "wide") void nextTick(() => menu.value?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus());
}, { flush: "sync" });
watch(() => props.layout, () => overlay.close());

/**
 * Executes the exact retained action; an unhandled request leaves the task open.
 * @param item - Current projection selected by the user.
 * @returns Completion of the retained object command.
 */
async function execute(item: ClassicEditorObjectActionProjection): Promise<void> {
  if (!item.state.canExecute || item.busy) return;
  if (props.layout !== "wide") {
    if (await props.controller.execute(item.action, "menu")) overlay.close();
    return;
  }
  if (pending.value !== null) return;
  const requestRevision = revision;
  pending.value = item.action.id;
  failure.value = null;
  try {
    const handled = await props.controller.execute(item.action, "menu");
    if (handled && requestRevision === revision) overlay.close();
  } catch (error) {
    if (requestRevision === revision) failure.value = String(error instanceof Error ? error.message : error);
  } finally {
    pending.value = null;
  }
}

/** @param item - Retained action projection. @returns Localized disabled explanation. */
function reason(item: ClassicEditorObjectActionProjection): string | undefined {
  return item.reason ? resolveClassicEditorText(item.reason.message, props.controller.context.locale) : undefined;
}

/** @param item - Retained action projection. @returns Shortcut text without registering a shortcut. */
function shortcut(item: ClassicEditorObjectActionProjection): string | undefined {
  return item.action.shortcut ? resolveClassicEditorText(item.action.shortcut, props.controller.context.locale) : undefined;
}
/**
 * Retains the public disclosure's native element for narrow-sheet focus return.
 *
 * @param _expanded - Public Toolbar state already synchronized by v-model.
 * @param event - Native disclosure activation.
 */
function retainTrigger(
  _expanded: boolean,
  event: MouseEvent | KeyboardEvent
): void {
  if (event.currentTarget instanceof HTMLButtonElement) {
    trigger.value = event.currentTarget;
  }
}

/**
 * Retains the legacy narrow-sheet keyboard contract until public root-contained modals exist.
 *
 * @param event - Root-local menu key event.
 */
function handleKeydown(event: KeyboardEvent): void {
  if (event.isComposing || event.defaultPrevented) return;
  if (event.key === "Escape") {
    overlay.close();
    void nextTick(() => trigger.value?.focus({ preventScroll: true }));
    event.preventDefault();
    return;
  }
  const items = [...(menu.value?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
  const current = items.indexOf(event.target as HTMLButtonElement);
  let next = current;
  if (event.key === "ArrowDown") next = (current + 1 + items.length) % items.length;
  else if (event.key === "ArrowUp") next = (current - 1 + items.length) % items.length;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = items.length - 1;
  else return;
  items[next]?.focus();
  event.preventDefault();
}
</script>

<template>
  <div class="qk-object-more">
    <QuireMenu
      v-if="layout === 'wide'"
      v-model:open="open"
      v-bind="overlay.ownerAttributes"
      :aria-label="messages.more"
      :portal-target="controller.context.root"
      :lang="controller.context.locale"
      :close-on-select="false"
      data-object-more-layout="menu"
      placement="bottom-end"
    >
      <template #trigger>
        <QuireToolbarDisclosure
          v-bind="overlay.ownerAttributes"
          :expanded="visible"
          :toggle-on-click="false"
          :label="messages.more"
          popup="menu"
          data-object-toolbar-control
          data-object-more-trigger
        >
          <SvgIcon name="moreHorizontal" />
        </QuireToolbarDisclosure>
      </template>
      <component
        :is="item.action.isActive ? QuireMenuCheckboxItem : QuireMenuItem"
        v-for="item in actions"
        :key="item.action.id"
        :value="item.action.id"
        v-bind="item.action.isActive ? { checked: !item.mixed && item.state.active } : {}"
        :aria-checked="item.action.isActive && item.mixed ? 'mixed' : undefined"
        :disabled="!item.state.canExecute || item.busy || pending !== null"
        :close-on-select="false"
        :data-object-action="item.action.id"
        :data-mixed="item.mixed || undefined"
        :title="reason(item)"
        v-on="item.action.isActive ? { 'update:checked': () => execute(item) } : { select: () => execute(item) }"
      >
        <template v-if="!item.action.isActive && item.action.icon" #leading><SvgIcon :name="item.action.icon" /></template>
        {{ resolveClassicEditorText(item.action.label, controller.context.locale) }}
        <template #trailing>
          <span v-if="shortcut(item)">{{ shortcut(item) }}</span>
          <span v-if="item.mixed" :aria-label="messages.mixed">—</span>
          <span v-if="item.busy || pending === item.action.id">{{ messages.busy }}</span>
        </template>
      </component>
      <p v-if="failure" role="alert">{{ failure }}</p>
    </QuireMenu>
    <!-- Root-contained narrow sheets await a public Drawer boundary and modal scope. -->
    <template v-else>
      <QuireToolbarDisclosure
        v-bind="overlay.ownerAttributes"
        v-model:expanded="visible"
        :label="messages.more"
        popup="menu"
        data-object-toolbar-control
        data-object-more-trigger
        @activate="retainTrigger"
      >
        <SvgIcon name="moreHorizontal" />
      </QuireToolbarDisclosure>
    <div
      v-if="visible"
      v-bind="overlay.ownerAttributes"
      ref="menu"
      class="qk-object-more__surface qk-object-more__surface--sheet"
      data-object-more-layout="sheet"
      :aria-label="messages.more"
      role="menu"
      @keydown="handleKeydown"
    >
      <QuireButton variant="ghost" size="sm"
        v-for="item in actions"
        :key="item.action.id"
        class="qk-object-more__item"
        type="button"
        role="menuitem"
        :data-object-action="item.action.id"
        :disabled="!item.state.canExecute || item.busy"
        :aria-disabled="!item.state.canExecute || item.busy"
        :data-mixed="item.mixed || undefined"
        :title="item.reason ? resolveClassicEditorText(item.reason.message, controller.context.locale) : undefined"
        @click="execute(item)"
      >
        <SvgIcon v-if="item.action.icon" :name="item.action.icon" />
        <span>{{ resolveClassicEditorText(item.action.label, controller.context.locale) }}</span>
        <kbd v-if="item.action.shortcut">
          {{ resolveClassicEditorText(item.action.shortcut, controller.context.locale) }}
        </kbd>
        <span v-if="item.mixed" class="qk-object-state-mark" aria-hidden="true">—</span>
        <span v-if="item.busy" class="qk-object-state-mark">{{ messages.busy }}</span>
      </QuireButton>
    </div>
    </template>
  </div>
</template>
