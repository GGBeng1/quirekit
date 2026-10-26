<script setup lang="ts">
import { computed, toRef } from "vue";
import type {
  ClassicEditorActionMenuItemContribution,
  ClassicEditorDocumentServiceMenuContribution
} from "@classic/types";
import { executeClassicEditorAction } from "../../../runtime/ui/action-catalog";
import { resolveClassicEditorPresentationActionState } from "../../../runtime/ui/presentation/actions";
import type { QuireKitMenuEntry } from "@quirekit/ui";
import { QuireMenu, QuireMenuItems, QuireIconButton } from "@quirekit/ui/vue";
import { useClassicEditorDocumentServices } from "../../composables/use/document-services";
import { useClassicEditorOverlay } from "../../overlays/registry";
import { useClassicEditorShellContributions } from "../../composables/use/shell-contributions";
import type { ClassicEditorShellModel } from "../../types";
import SvgIcon from "../svg-icon.vue";

/** Reactive inputs required by the document product menu. */
interface ClassicEditorProductMenuProps {
  /** Reactive private shell model. */
  readonly model: ClassicEditorShellModel;
}

/** One resolved menu group rendered through the current dropdown bridge. */
interface ClassicEditorProductMenuGroup {
  /** Stable menu group id. */
  readonly id: string;
  /** Localized visible group label. */
  readonly label: string;
  /** Ordered executable menu options. */
  readonly options: QuireKitMenuEntry[];
}

const props = defineProps<ClassicEditorProductMenuProps>();
const { message, select, text } = useClassicEditorShellContributions(
  toRef(props, "model")
);
const documentServices = useClassicEditorDocumentServices(toRef(props, "model"));
const documentServiceItems = computed(() => new Map(
  select("document-service").map((item) => [documentServiceKey(item), item])
));
const menuItems = computed(() => new Map(
  select("menu-item")
    .filter((item): item is ClassicEditorActionMenuItemContribution => "action" in item)
    .map((item) => [`menu-item:${item.id}`, item])
));
const productMenuOptions = computed<QuireKitMenuEntry[]>(() => {
  const groups = new Map<string, ClassicEditorProductMenuGroup>();
  const rows: { readonly order: number; readonly entry: QuireKitMenuEntry }[] = [];
  const icons = new Map<string, string>();
  for (const item of documentServiceItems.value.values()) {
    if (item.menuIcon !== undefined && !icons.has(item.menuId)) icons.set(item.menuId, item.menuIcon);
  }
  const group = (id: string, label: string, order: number): ClassicEditorProductMenuGroup => {
    const existing = groups.get(id);
    if (existing !== undefined) return existing;
    const created = createMenuGroup(id, label);
    groups.set(id, created);
    const icon = icons.get(id);
    rows.push({ order, entry: { value: `menu:${id}`, kind: "submenu", label, children: created.options, ...(icon === undefined ? {} : { icon }) } });
    return created;
  };
  for (const item of documentServiceItems.value.values()) {
    group(item.menuId, text(item.menuLabel), item.order ?? 0).options
      .push({ value: documentServiceKey(item), label: text(item.label) });
  }
  for (const [key, item] of menuItems.value) {
    const entry = menuItemEntry(key, item);
    if (item.menuId === undefined) rows.push({ order: item.order ?? 0, entry });
    else group(item.menuId, text(item.menuLabel ?? item.label), item.order ?? 0).options.push(entry);
  }
  return rows.sort((left, right) => left.order - right.order).map(row => row.entry);
});
const productMenuOverlay = useClassicEditorOverlay("product-menu", undefined, undefined, undefined, { dismissOnEscape: () => false, dismissOnOutsidePointer: () => false });
const { close: closeProductMenu, ownerAttributes } = productMenuOverlay;
const productMenuOpen = computed({
  get: productMenuOverlay.isVisible,
  set: productMenuOverlay.setVisible
});

const contentProps = computed(() => ({ ...ownerAttributes, lang: props.model.context?.locale }));

/**
 * Executes the selected typed document service contribution.
 *
 * @param id - Dropdown key resolved from a registered contribution.
 */
function execute(id: string | number): void {
  closeProductMenu();
  const key = String(id);
  const documentService = documentServiceItems.value.get(key);
  if (documentService !== undefined) {
    void documentServices.execute(documentService);
    return;
  }
  const item = menuItems.value.get(key);
  const context = props.model.context;
  if (item !== undefined && context !== undefined) {
    void executeClassicEditorAction(item.action, context, undefined, "menu");
  }
}

/**
 * Projects one direct-action product menu row.
 *
 * @param key - Collision-free dropdown key.
 * @param item - Registered menu item.
 * @returns Public menu entry with truthful disabled state.
 */
function menuItemEntry(key: string, item: ClassicEditorActionMenuItemContribution): QuireKitMenuEntry {
  const context = props.model.context;
  return {
    value: key,
    label: text(item.label),
    disabled: context === undefined
      || !resolveClassicEditorPresentationActionState(item.action, context, undefined, "menu").canExecute,
    ...(item.icon === undefined ? {} : { icon: item.icon }),
    ...(item.shortcut === undefined ? {} : { shortcut: text(item.shortcut) })
  };
}

/**
 * Creates one mutable menu group during projection.
 *
 * @param id - Stable group id.
 * @param label - Localized group label.
 * @returns Empty projected menu group.
 */
function createMenuGroup(id: string, label: string): ClassicEditorProductMenuGroup {
  return { id, label, options: [] };
}

/**
 * Creates a collision-free dropdown key for one document service.
 *
 * @param contribution - Document service contribution.
 * @returns Stable dropdown selection key.
 */
function documentServiceKey(
  contribution: ClassicEditorDocumentServiceMenuContribution
): string {
  return `document-service:${contribution.id}`;
}
</script>

<template>
  <nav
    v-show="model.options.menuBar"
    class="qk-classic-editor__menu-bar"
    :aria-label="message('documentMenus')"
  >
    <QuireMenu v-model:open="productMenuOpen" v-bind="contentProps" :aria-label="message('menu')" width="200px">
      <template #trigger>
        <QuireIconButton v-bind="ownerAttributes" variant="ghost" size="sm" :label="message('menu')">
          <SvgIcon name="menu" />
        </QuireIconButton>
      </template>
      <QuireMenuItems :items="productMenuOptions" :content-props="contentProps" @select="execute" />
    </QuireMenu>
  </nav>
</template>
