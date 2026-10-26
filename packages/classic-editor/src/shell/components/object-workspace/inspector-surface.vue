<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  shallowRef
} from "vue";
import { resolveClassicEditorText } from "@classic/localization";
import { QuireTabs, QuireInspectorSection } from "@quirekit/ui/vue";
import type {
  ClassicEditorObjectWorkspaceController,
  ClassicEditorObjectWorkspaceSnapshot
} from "@classic/types/object-workspace";
import ClassicEditorObjectInspectorField from "./inspector-field.vue";
import ClassicEditorObjectInspectorActions from "./inspector-actions.vue";
import { createObjectWorkspaceDomId } from "./dom-identity";

/** Shared Inspector body inputs. */
interface ClassicEditorObjectInspectorSurfaceProps {
  /** Shared exact-target controller. */
  readonly controller: ClassicEditorObjectWorkspaceController;
}

const props = defineProps<ClassicEditorObjectInspectorSurfaceProps>();
const occurrence = createObjectWorkspaceDomId("inspector");
const snapshot = shallowRef<ClassicEditorObjectWorkspaceSnapshot>(props.controller.snapshot);
const unsubscribe = props.controller.subscribe((next) => {
  snapshot.value = next;
});
onBeforeUnmount(unsubscribe);
const definition = computed(() => snapshot.value.contribution?.inspector ?? null);
const tabs = computed(() => [...(definition.value?.tabs ?? [])].sort((left, right) => (
  left.order - right.order
)));
const activeTabId = computed({
  get: () => snapshot.value.activeTabId ?? tabs.value[0]?.id ?? "",
  set: (tabId: string) => props.controller.selectInspectorTab(tabId)
});

/** @param sectionId - Stable section identity. @returns Root-unique heading id. */
function sectionHeadingId(sectionId: string): string {
  return `qk-object-section-${occurrence}-${sectionId}`;
}

</script>

<template>
  <div
    v-if="definition"
    class="qk-object-inspector"
    data-object-inspector
  >
    <QuireTabs v-model="activeTabId" class="qk-object-inspector__tabs"
      :label="resolveClassicEditorText(definition.title, controller.context.locale)"
      :items="tabs.map(tab => ({ value: tab.id, label: resolveClassicEditorText(tab.label, controller.context.locale) }))">
      <template #trigger="{ item }"><span :data-object-inspector-tab="item.value">{{ item.label }}</span></template>
      <template #content="{ item: tab }">
        <div class="qk-object-inspector__sections">
          <QuireInspectorSection
            v-for="section in definition.sections.filter(item => item.tabId === tab.value)"
            :key="section.id"
            :data-object-inspector-section="section.id"
            :id="sectionHeadingId(section.id)"
            :title="resolveClassicEditorText(section.title, controller.context.locale)"
            v-bind="section.status
              ? { statusText: resolveClassicEditorText(section.status, controller.context.locale) }
              : {}"
          >
            <ClassicEditorObjectInspectorField
              v-for="field in section.fields"
              :key="field.id"
              :controller="controller"
              :field="field"
              :revision="snapshot.revision"
            />
            <ClassicEditorObjectInspectorActions
              v-if="section.actions?.length"
              :controller="controller"
              :label="resolveClassicEditorText(section.title, controller.context.locale)"
              :actions="section.actions"
              :input="section.actionInput"
              :revision="snapshot.revision"
            />
          </QuireInspectorSection>
        </div>
      </template>
    </QuireTabs>
  </div>
</template>
