<script setup lang="ts">
import {
  computed,
  inject,
  onBeforeUnmount,
  watch
} from "vue";
import { resolveClassicEditorIcon } from "../../icons";
import {
  classicEditorPopupMenuChildOverlay,
  classicEditorPopupMenuTeleportTarget
} from "./context";
import {
  QuireMenu,
  QuireMenuItems,
  QuireToolbarAction,
  QuireToolbarDisclosure,
  QuireTooltipContent,
  QuireTooltipRoot,
  QuireTooltipTrigger
} from "@quirekit/ui/vue";
import type { QuireKitMenuEntry } from "@quirekit/ui";
import type {
  ClassicEditorPopupMenuDropdownItem,
  ClassicEditorPopupMenuItemProps
} from "./types";

/** Runtime props retain the recursive dropdown field during Vue SFC compilation. */
interface PopupMenuItemComponentProps
  extends ClassicEditorPopupMenuItemProps {
  /** Optional grouped actions rendered by the nested dropdown. */
  readonly menuItems?:
    readonly ClassicEditorPopupMenuDropdownItem[] | undefined;
}

const props = withDefaults(defineProps<PopupMenuItemComponentProps>(), {
  tooltip: undefined,
  disabled: false,
  active: false,
  tooltipVisible: undefined,
  tooltipDelay: 280,
  menuItems: undefined
});
const emit = defineEmits<{
  /** Reports activation after the shared button semantics have run. */
  click: [event: MouseEvent];
  /** Reports a grouped dropdown item activation. */
  select: [key: string];
}>();
const teleportTarget = inject(classicEditorPopupMenuTeleportTarget);
const injectedChildOverlay = inject(classicEditorPopupMenuChildOverlay);
if (teleportTarget === undefined || injectedChildOverlay === undefined) {
  throw new Error("ClassicEditorPopupMenuItem must be rendered inside ClassicEditorPopupMenu.");
}
const childOverlay = injectedChildOverlay;
const iconMarkup = computed(() => resolveClassicEditorIcon(props.icon) ?? "");
const tooltipText = computed(() => props.tooltip ?? props.label);
const dropdownId = Symbol("ClassicEditorPopupMenuItemDropdown");
const dropdownOpen = computed(() => childOverlay.isOpen(dropdownId));
const menuProps = computed(() => ({ ...childOverlay.ownerAttributes }));
const dropdownOptions = computed(() => (props.menuItems ?? []).map(createDropdownOption));
watch(() => [props.menuItems, props.disabled], () => {
  if (props.menuItems === undefined || props.disabled) childOverlay.setOpen(dropdownId, false);
});
onBeforeUnmount(() => childOverlay.setOpen(dropdownId, false));

/**
 * Forwards an enabled action to the capability-owned semantic handler.
 *
 * @param event - Native click emitted by the shared action button.
 */
function activate(event: MouseEvent): void {
  if (!props.disabled && props.menuItems === undefined) emit("click", event);
}

/** @param item - Product menu entry. @returns Public declarative menu entry. */
function createDropdownOption(item: ClassicEditorPopupMenuDropdownItem): QuireKitMenuEntry {
  return { value: item.key, label: item.label, disabled: item.disabled,
    ...(item.children ? { kind: "submenu", children: item.children.map(createDropdownOption) } : {}) };
}

/** @param key - Stable menu identity. @param items - Current branch. @returns Original product visual metadata. */
function findItem(key: string, items = props.menuItems): ClassicEditorPopupMenuDropdownItem | undefined {
  for (const item of items ?? []) {
    if (item.key === key) return item;
    const child = item.children ? findItem(key, item.children) : undefined;
    if (child) return child;
  }
  return undefined;
}

/**
 * Forwards one enabled grouped dropdown selection.
 *
 * @param key - Stable option key selected by the user.
 */
function selectDropdownItem(key: string | number): void {
  emit("select", String(key));
  childOverlay.closeChild();
}
</script>

<template>
  <QuireMenu v-if="props.menuItems !== undefined" :open="dropdownOpen" :portal-target="teleportTarget"
    v-bind="menuProps" @update:open="childOverlay.setOpen(dropdownId, $event === true)">
    <template #trigger>
    <QuireToolbarDisclosure
      class="qk-classic-editor__popup-menu-action has-menu"
      :disabled="props.disabled"
      :label="props.label"
      :tooltip="tooltipText"
      :expanded="dropdownOpen"
      :toggle-on-click="false"
      indicator
      :data-state="props.active ? 'on' : dropdownOpen ? 'open' : 'closed'"
      @pointerdown.prevent
    >
      <span
        :data-icon="props.icon"
        aria-hidden="true"
        v-html="iconMarkup"
      />
    </QuireToolbarDisclosure>
  </template>
    <QuireMenuItems :items="dropdownOptions" :content-props="menuProps" @select="selectDropdownItem">
      <template #leading="{ item }">
        <span v-if="findItem(item.value)?.swatchColor" class="qk-classic-editor__popup-menu-dropdown-swatch" :style="{ backgroundColor: findItem(item.value)?.swatchColor }" />
        <span v-else-if="findItem(item.value)?.icon" class="qk-classic-editor__popup-menu-dropdown-icon" v-html="resolveClassicEditorIcon(findItem(item.value)!.icon!)" />
      </template>
    </QuireMenuItems>
  </QuireMenu>
  <QuireTooltipRoot v-else :open="props.tooltipVisible" :open-delay="props.tooltipDelay" placement="top">
    <QuireTooltipTrigger as-child>
      <QuireToolbarAction
        class="qk-classic-editor__popup-menu-action"
        :disabled="props.disabled"
        :label="props.label"
        :tooltip="false"
        :aria-pressed="props.active ? 'true' : undefined"
        :data-state="props.active ? 'on' : 'off'"
        @pointerdown.prevent
        @activate="activate"
      >
        <span
          :data-icon="props.icon"
          aria-hidden="true"
          v-html="iconMarkup"
        />
      </QuireToolbarAction>
    </QuireTooltipTrigger>
    <QuireTooltipContent :portal-target="teleportTarget">{{ tooltipText }}</QuireTooltipContent>
  </QuireTooltipRoot>
</template>
