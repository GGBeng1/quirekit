<script setup lang="ts">
import { toRef } from "vue";
import { QuireMenu, QuireMenuItems } from "@quirekit/ui/vue";
import { useClassicEditorProductPopmenu } from "../popmenu/use-product-popmenu";
import type { ClassicEditorShellModel } from "../types";

/** Reactive inputs required by the product popmenu adapter. */
interface ClassicEditorProductPopmenuProps {
  /** Reactive private shell model. */
  readonly model: ClassicEditorShellModel;
  /** Product root that receives bubbling semantic events. */
  readonly root: HTMLElement | undefined;
}

const props = defineProps<ClassicEditorProductPopmenuProps>();
const { active, close, execute, notice, options } = useClassicEditorProductPopmenu(
  toRef(props, "model"),
  toRef(props, "root")
);
</script>

<template>
  <div
    v-if="notice !== null"
    class="qk-classic-editor__product-notice"
    role="status"
    aria-live="polite"
  >
    <span aria-hidden="true">i</span>
    {{ notice }}
  </div>
  <QuireMenu :open="active !== null && options.length > 0" :anchor-point="{ x: active?.x ?? 0, y: active?.y ?? 0 }" :lang="model.context?.locale"
    :portal-target="root?.ownerDocument.body ?? 'body'" @update:open="!$event && close()">
    <QuireMenuItems :items="options" @select="execute" />
  </QuireMenu>
</template>
