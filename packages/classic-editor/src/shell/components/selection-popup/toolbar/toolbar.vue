<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowReactive } from "vue";
import { QuireToolbar } from "@quirekit/ui/vue";
import type { QuireKitMenuEntry, QuireKitToolbarEntry, QuireKitToolbarExecuteEvent, QuireKitToolbarOpenChangeEvent, QuireKitToolbarRow } from "@quirekit/ui";
import type { ClassicEditorAnySelectionPopupItemContribution, ClassicEditorSelectionPopupActionContribution, ClassicEditorSelectionPopupTrigger } from "@classic/types";
import type { ClassicEditorShellModel } from "../../../types";
import { resolveClassicEditorText } from "@classic/localization";
import { resolveClassicEditorSelectionPopupActionState } from "../action";
import { projectClassicToolbarFeature } from "../../../contribution/toolbar/features";
import { classicToolbarRenderers } from "../../../contribution/toolbar/renderers";
import { changeClassicToolbarPopup, executeClassicToolbar } from "../../../contribution/toolbar/execution";
import type { ClassicToolbarContext, ClassicToolbarFeature } from "../../../contribution/toolbar/types";
import type { ClassicEditorOverlayController } from "../../../overlays/registry";
import Producer from "../../../contribution/toolbar/producer.vue";
import PopupOwner from "../../../contribution/toolbar/ownership/owner.vue";
import MobileToolbar from "./mobile.vue";

const props = defineProps<{
  /** Live context from the existing shell projection. */
  model: ClassicEditorShellModel;
  /** Visible feature-owned controls, already in profile order. */
  items: readonly ClassicEditorAnySelectionPopupItemContribution[];
  /** Semantic range owning this mounted session. */
  trigger: ClassicEditorSelectionPopupTrigger;
  /** Exact PM selection kind owning delayed field commits. */
  selectionType?: "text" | "quire-block-range";
  /** Embedded menus use the same controls without another floating surface. */
  embedded?: boolean;
  /** Registered anchored surface that owns child popups. */
  parentId: string;
  /** Document-space portal shared by the parent surface. */
  portalTarget: HTMLElement;
}>();
const emit = defineEmits<{
  /** Routes existing direct/legacy actions through their focus contract. */
  action: [item: ClassicEditorSelectionPopupActionContribution];
  /** Actual content size used for workspace collision handling. */
  size: [size: { width: number; height: number }];
}>();
const surface = ref<HTMLElement | null>(null);
const compact = computed(() => props.model.compact && (props.selectionType ?? "text") === "text");
const features = shallowReactive(new Map<string, ClassicToolbarFeature>());
const moreOwner = ref<ClassicEditorOverlayController>();
const adapter: ClassicToolbarContext = { get model() { return props.model; }, features, menus: new Map() };
const widgets = computed(() => compact.value ? [] : props.items.filter(item => "toolbar" in item));
const captured = { editor: props.model.context!.editor, from: props.trigger.from, to: props.trigger.to };
let disposed = false;
let observer: ResizeObserver | undefined;
const moreLabel = computed(() => compact.value
  ? (props.model.locale === "en" ? "More" : "更多")
  : (props.model.locale === "en" ? "More text actions" : "更多文本操作"));

/** @returns Whether fields still own the original range and editor instance. */
function isTargetCurrent(): boolean {
  const editor = props.model.context?.editor;
  const selection = editor?.state.pm.selection;
  return !disposed && editor === captured.editor && selection?.from === captured.from
    && selection.to === captured.to && selection.toJSON().type === (props.selectionType ?? "text");
}

/** @param item - Direct or legacy feature action. @returns Live public action entry. */
function actionEntry(item: ClassicEditorSelectionPopupActionContribution): QuireKitToolbarEntry {
  const context = props.model.context!;
  const current = resolveClassicEditorSelectionPopupActionState(item, context, props.trigger);
  const toggle = "action" in item ? item.action.isActive !== undefined : item.behavior.isActive !== undefined;
  const label = resolveClassicEditorText(item.label, context.locale);
  return { value: item.id, label, icon: item.icon ?? "moreHorizontal", meta: item,
    kind: toggle ? "toggle" : "action", disabled: current.disabled,
    ...(toggle ? { pressed: current.active } : {}),
    ...(item.presentation === "icon-label" ? { text: label } : {}),
    tooltip: resolveClassicEditorText(item.title ?? item.label, context.locale) };
}

const overflow = computed(() => props.items.filter((item): item is ClassicEditorSelectionPopupActionContribution => !("toolbar" in item) && item.placement === "overflow"));
const more = computed<QuireKitToolbarEntry>(() => ({
  value: "selection-more", kind: "menu", label: moreLabel.value, trigger: "disclosure", indicator: false,
  ...(compact.value ? { text: moreLabel.value } : { icon: "moreHorizontal" }),
  expanded: moreOwner.value?.isVisible() ?? false, attributes: moreOwner.value?.ownerAttributes ?? {},
  overlayProps: { width: "auto", portalTarget: props.portalTarget,
    contentAttributes: { lang: props.model.locale, ...moreOwner.value?.ownerAttributes } },
  items: overflowEntries.value
}));
const overflowEntries = computed<QuireKitMenuEntry[]>(() => {
  const entries: QuireKitMenuEntry[] = [];
  const submenus = new Map<string, QuireKitMenuEntry[]>();
  for (const item of overflow.value) {
    const entry = actionEntry(item);
    const row: QuireKitMenuEntry = { value: item.id, label: entry.label, icon: entry.icon!, disabled: entry.disabled,
      ...(entry.kind === "toggle" ? { checked: entry.pressed === true } : {}) };
    const parent = item.submenu === undefined ? null : resolveClassicEditorText(item.submenu, props.model.locale);
    if (parent === null) { entries.push(row); continue; }
    const children = submenus.get(parent);
    if (children !== undefined) { children.push(row); continue; }
    submenus.set(parent, [row]);
    entries.push({ kind: "submenu", value: `submenu:${item.id}`, label: parent, children: submenus.get(parent)! });
  }
  return entries;
});
const rows = computed<readonly QuireKitToolbarRow[]>(() => ["primary", "secondary"].map(placement => {
  const items = props.items.flatMap(item => {
    if ((item.placement ?? "primary") !== placement) return [];
    if (!("toolbar" in item)) return [actionEntry(item)];
    const feature = features.get(item.id);
    return feature ? projectClassicToolbarFeature(feature.key, feature.items) : [];
  });
  if (placement === "secondary" && overflow.value.length) items.push(more.value);
  return { value: placement, label: placement === "primary" ? (props.model.locale === "en" ? "Text formatting" : "文字格式") : (props.model.locale === "en" ? "Text actions" : "文本操作"), items };
}).filter(row => row.items.length));
const mobileItems = computed<readonly QuireKitToolbarEntry[]>(() => {
  const items = props.items.flatMap(item => {
    if ("toolbar" in item || item.compact !== "primary") return [];
    const entry = actionEntry(item);
    const simple = { ...entry, text: entry.label };
    delete simple.icon;
    return [simple];
  });
  return overflow.value.length ? [...items, more.value] : items;
});

/** @param feature - Retained factory's latest live entries. */
function register(feature: ClassicToolbarFeature): void { features.set(feature.key, feature); }
/** @param feature - Departing factory identity. */
function release(feature: ClassicToolbarFeature): void { if (features.get(feature.key) === feature) features.delete(feature.key); }
/** @param _key - Stable overflow key. @param owner - Registered child coordinator. */
function registerMore(_key: string, owner: ClassicEditorOverlayController): void { moreOwner.value = owner; }
/** @param event - Public popup request with feature metadata. */
function openChange(event: QuireKitToolbarOpenChangeEvent): void {
  if (event.item.value === more.value.value) moreOwner.value?.setVisible(event.expanded);
  else changeClassicToolbarPopup(event, adapter);
}
/** @param event - Accepted direct or feature-owned action. */
async function execute(event: QuireKitToolbarExecuteEvent): Promise<void> {
  if (!isTargetCurrent()) return;
  const item = props.items.find(item => item.id === event.value);
  if (item && !("toolbar" in item)) { emit("action", item); return; }
  await executeClassicToolbar(event, adapter);
}

onMounted(() => {
  const element = surface.value;
  if (!element) return;
  /** Measures the surface only; View remains the document geometry authority. */
  const measure = (): void => {
    const { width, height } = element.getBoundingClientRect();
    if (width > 0 && height > 0) emit("size", { width, height });
  };
  const Constructor = element.ownerDocument.defaultView?.ResizeObserver;
  if (Constructor) { observer = new Constructor(measure); observer.observe(element); }
  measure();
});
onBeforeUnmount(() => { disposed = true; observer?.disconnect(); });
</script>

<template>
  <div ref="surface" data-selection-toolbar style="width: max-content; max-width: 100%" @pointerdown.stop>
    <MobileToolbar v-if="compact" :items="mobileItems" :label="model.locale === 'en' ? 'Selection actions' : '选区操作'"
      @execute="execute" @open-change="openChange" />
    <QuireToolbar v-else :rows="rows" :label="model.locale === 'en' ? 'Selection actions' : '选区操作'"
      :renderers="classicToolbarRenderers" :context="adapter" :variant="embedded ? 'plain' : 'elevated'" align="start" preserve-focus
      @execute="execute" @open-change="openChange" />
    <Producer v-for="item in widgets" :key="item.id" :feature-key="item.id" :factory="item.toolbar"
      :context="model.context!" active :open="false" :parent-id="parentId" :portal-target="portalTarget"
      :is-target-current="isTargetCurrent" @configuration="register" @release="release" />
    <PopupOwner v-if="overflow.length" :entry="{ key: more.value, path: [more.value], item: more }"
      :context="model.context!" :parent-id="parentId" @register="registerMore" />
  </div>
</template>
