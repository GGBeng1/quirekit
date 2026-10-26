<script setup lang="ts">
import { useFlowMessages } from "../messages";
import { computed, ref } from "vue";
import { QuireButton, QuireIcon, QuireTabs, type QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import { canReplaceShapes } from "../../ui/replacement";
import type { FlowFormattingContext } from "./types";
import GeometryPanel from "../geometry/panel.vue";
import ShapePicker from "./shape-picker.vue";

const { t } = useFlowMessages();

const props = defineProps<{ /** Shared popup scope and captured input ownership. */ scope: QuireKitToolbarRendererScope }>();
const context = computed(() => props.scope.context as FlowFormattingContext);
const tab = ref(props.scope.item.meta === "shape" ? "shape" : "geometry");
const tabs = computed(() => [
  { value: "geometry", label: t("位置与尺寸") },
  { value: "shape", label: t("更换形状"), disabled: !canReplaceShapes(context.value.state) },
]);
const memberShape = computed(() => context.value.state.selectedIds.length === 1 ? context.value.state.selectedShapes[0] : undefined);
</script>

<template>
  <section class="qk-flow-object-panel" :aria-label="t('图形属性')">
    <QuireTabs v-model="tab" :items="tabs" :label="t('图形设置')" content-padding="none" lazy-mount unmount-on-exit>
      <template #content="{ item }">
        <div class="qk-flow-object-panel__content">
          <GeometryPanel v-if="item.value === 'geometry'" :scope="scope" />
          <ShapePicker v-else :scope="scope" />
        </div>
      </template>
    </QuireTabs>
    <QuireButton v-if="memberShape === 'er-entity' || memberShape === 'uml-class'" variant="outline" :disabled="scope.disabled" @click="scope.execute('edit-members')">
      <QuireIcon :name="memberShape === 'uml-class' ? 'listTree' : 'tableProperties'" />
      {{ memberShape === 'uml-class' ? t('编辑类成员') : t('编辑字段') }}
    </QuireButton>
    <QuireButton v-if="memberShape === 'image'" variant="outline" :disabled="scope.disabled" @click="scope.execute('media-edit')"><QuireIcon name="image" />{{ t('编辑图片') }}</QuireButton>
  </section>
</template>

<style scoped>
.qk-flow-object-panel { display: grid; gap: var(--qk-space-group); width: 320px; max-width: 100%; }
.qk-flow-object-panel__content { padding-top: var(--qk-space-group); }
</style>
