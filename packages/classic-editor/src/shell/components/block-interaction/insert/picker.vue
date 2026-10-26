<script setup lang="ts">
import { computed, shallowReactive } from "vue";
import { QuireIcon, QuireMenuItem, QuireMenuSubmenu } from "@quirekit/ui/vue";
import type { QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import type { ClassicEditorInsertItemContribution } from "@classic/types";
import type { ClassicEditorShellModel } from "../../../types";
import Producer from "../../../contribution/toolbar/producer.vue";
import type { ClassicToolbarContext, ClassicToolbarFeature } from "../../../contribution/toolbar/types";
import { projectClassicToolbarFeature } from "../../../contribution/toolbar/features";
import { changeClassicToolbarPopup, executeClassicToolbar } from "../../../contribution/toolbar/execution";
import { classicToolbarRenderers } from "../../../contribution/toolbar/renderers";

const props = defineProps<{
  /** Feature definition with its retained picker factory. */
  definition: ClassicEditorInsertItemContribution;
  /** Shell with the captured insertion context. */
  model: ClassicEditorShellModel;
  /** Localized directory label. */
  label: string;
  /** Theme semantic icon color. */
  color: string;
  /** Current insertion applicability. */
  disabled: boolean;
  /** Parent insertion panel ownership. */
  parentId: string;
  /** Shared document overlay portal. */
  portalTarget?: HTMLElement | undefined;
}>();
const features = shallowReactive(new Map<string, ClassicToolbarFeature>());
const adapter: ClassicToolbarContext = { get model() { return props.model; }, features, menus: new Map() };
const entry = computed(() => {
  const feature = features.get(props.definition.id);
  return feature && projectClassicToolbarFeature(feature.key, feature.items).find(item => item.contentRenderer);
});
/** @param feature - Retained source factory snapshot. */
function register(feature: ClassicToolbarFeature): void { features.set(feature.key, feature); }
/** @param feature - Departing source factory. */
function release(feature: ClassicToolbarFeature): void { if (features.get(feature.key) === feature) features.delete(feature.key); }
/** @param expanded - Admitted submenu visibility. */
function setExpanded(expanded: boolean): void {
  if (entry.value) changeClassicToolbarPopup({ item: entry.value, path: [entry.value.value], expanded }, adapter);
}
const scope = computed<QuireKitToolbarRendererScope | null>(() => entry.value ? ({
  item: entry.value, path: [entry.value.value], context: adapter, disabled: props.disabled,
  expanded: entry.value.expanded ?? false, setExpanded,
  /** @param payload - Canonical feature parameters. */
  execute(payload) {
    if (entry.value) void executeClassicToolbar({ item: entry.value, value: entry.value.value,
      path: [entry.value.value], source: "popup", payload }, adapter);
  }
}) : null);
const contentProps = computed(() => ({ ...entry.value?.overlayProps?.contentAttributes,
  lang: props.model.locale, style: { transitionProperty: "opacity" }, "data-block-picker": props.definition.id }));
</script>

<template>
  <QuireMenuItem v-if="disabled" :value="definition.id" disabled>
    <template #leading><QuireIcon :name="definition.action.icon" :style="{ color }" /></template>{{ label }}
  </QuireMenuItem>
  <QuireMenuSubmenu v-else :open="entry?.expanded ?? false" width="auto"
    :content-props="contentProps" @update:open="setExpanded($event === true)">
    <template #leading><QuireIcon :name="definition.action.icon" :style="{ color }" /></template>
    <template #trigger>{{ label }}</template>
    <div @keydown.stop>
      <component :is="classicToolbarRenderers[entry.contentRenderer]" v-if="scope && entry?.contentRenderer" :scope="scope" />
    </div>
  </QuireMenuSubmenu>
  <Producer v-if="definition.toolbar && model.context" :feature-key="definition.id" :factory="definition.toolbar"
    :context="model.context" active :open="false" :parent-id="parentId" :portal-target="portalTarget"
    @configuration="register" @release="release" />
</template>
