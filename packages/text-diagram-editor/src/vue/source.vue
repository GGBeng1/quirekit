<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { createDiagramSourceEditor } from "../source/controller";
import type { DiagramSourceEditor, DiagramSourceValue } from "../source/types";

defineOptions({ inheritAttrs: false });
const props = defineProps<DiagramSourceValue>();
const emit = defineEmits<{
  /** Accepted local source edit; prop echoes never emit again. */ "update:source": [source: string];
  /** Atomic rejection of an oversized operation. */ limit: [exceeded: boolean];
}>();
const parent = ref<HTMLElement>();
let editor: DiagramSourceEditor | undefined;
onMounted(() => {
  editor = createDiagramSourceEditor({ parent: parent.value!, value: { ...props },
    onChange: source => emit("update:source", source), onLimit: exceeded => emit("limit", exceeded) });
});
// Coalesce the language/source prop pair, not accepted input. This avoids an intermediate
// state containing the new grammar with the previous grammar's source.
watch(() => ({ ...props }), value => editor?.sync(value), { flush: "post" });
onBeforeUnmount(() => editor?.destroy());
/** Opens CodeMirror's localized search panel from the Field action. */
function search(): void { editor?.search(); }
/** @param event - Host modal's Escape event. */
function handleEscape(event: KeyboardEvent): void { editor?.handleEscape(event); }
defineExpose({ search, handleEscape });
</script>
<template><div ref="parent" class="qk-text-diagram-source" data-qk-diagram-source /></template>
