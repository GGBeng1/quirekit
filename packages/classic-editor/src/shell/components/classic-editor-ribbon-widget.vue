<script setup lang="ts">
import { onBeforeUnmount, ref, shallowReactive, watch } from "vue";
import type {
  ClassicEditorRenderContext,
  ClassicEditorRibbonWidgetContribution,
  ClassicEditorRibbonWidgetController
} from "@classic/types";

/** Inputs for one lifecycle-safe compound ribbon contribution. */
interface ClassicEditorRibbonWidgetProps {
  /** Widget declaration selected by command-bar composition. */
  readonly contribution: ClassicEditorRibbonWidgetContribution;
  /** Latest mounted product render context. */
  readonly context: ClassicEditorRenderContext;
}

const props = defineProps<ClassicEditorRibbonWidgetProps>();
const state = shallowReactive({ context: props.context });
const host = ref<HTMLElement>();
let controller: ClassicEditorRibbonWidgetController | undefined;

/** Releases the current widget controller before replacement or teardown. */
function destroyController(): void {
  controller?.destroy();
  controller = undefined;
  host.value?.replaceChildren();
}

/** Mounts the selected widget exactly once into the stable Vue-owned host. */
function mountController(): void {
  destroyController();
  const currentHost = host.value;
  if (currentHost === undefined || props.contribution.component !== undefined || props.contribution.mount === undefined) return;
  controller = props.contribution.mount(props.context);
  const value = controller.element;
  if (typeof value === "string") currentHost.append(value);
  else if (value !== null) currentHost.append(value);
}

watch(
  [host, () => props.contribution],
  mountController,
  { immediate: true, flush: "post" }
);
watch(
  () => props.context,
  (context) => { state.context = context; controller?.update(context); },
  { flush: "sync" }
);
onBeforeUnmount(destroyController);
</script>

<template>
  <div
    class="qk-classic-editor__ribbon-widget"
    :data-ribbon-widget="contribution.id"
  >
    <component v-if="contribution.component" :is="contribution.component"
      v-bind="contribution.props" :state="state" />
    <div v-else ref="host" />
  </div>
</template>
