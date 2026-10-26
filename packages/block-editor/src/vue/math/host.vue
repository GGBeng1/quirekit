<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { defineAsyncComponent, onBeforeUnmount, ref, shallowRef } from "vue";
import type { Editor } from "@quirekit/core";
import { QuireDialogRoot, QuireDialogContent } from "@quirekit/ui/vue";
import { registerBlockMathHost, commitBlockMath } from "../../math/tasks";
import type { BlockMathRequest } from "../../math/types";

const { t, locale } = useBlockLocale();

const props = defineProps<{ /** Canonical document owner. */ editor: Editor }>();
const MathPanel = defineAsyncComponent(async () => {
  await import("@quirekit/math-ui/styles.css");
  return (await import("@quirekit/math-ui")).MathAuthoringPanel;
});
const request = shallowRef<BlockMathRequest | null>(null), surface = ref<HTMLElement>(), error = ref("");
let releaseChanges: (() => void) | undefined;
/** Discards the formula draft and releases only this task's subscriptions. */
function close(): void {
  request.value = null; error.value = ""; releaseChanges?.(); releaseChanges = undefined;
  requestAnimationFrame(() => { if (!props.editor.isDestroyed && props.editor.mountedView) props.editor.view.focus(); });
}
const release = registerBlockMathHost(props.editor, source => {
  releaseChanges?.(); request.value = source; error.value = "";
  /** Checks one immutable identity while the modal is open, without scanning the document. */
  function changed(): void {
    error.value = !props.editor.isEditable ? "当前是阅读模式，不能保存公式" : props.editor.state.doc !== source.doc ? "文档已变化，请关闭后重新打开公式" : "";
  }
  props.editor.on("transaction", changed);
  releaseChanges = () => props.editor.off("transaction", changed);
});
/** @param document - Complete formula from the common visual authoring panel. @returns True only after the source-bound command succeeds. */
function save(document: { readonly latex: string }): boolean {
  const accepted = !!request.value && commitBlockMath(props.editor, request.value, document.latex);
  if (!accepted) error.value = "公式未保存，请检查内容或重新打开目标";
  return accepted;
}
onBeforeUnmount(() => { release(); releaseChanges?.(); request.value = null; });
</script>
<template>
  <QuireDialogRoot v-if="request" open :restore-focus="false" @update:open="!$event && close()">
    <QuireDialogContent :title="request.node ? t('编辑公式') : request.display ? t('插入块级公式') : t('插入行内公式')" size="large" :error-text="t(error)">
      <div ref="surface" class="qk-block-math-dialog">
        <MathPanel :latex="request.latex" :commit="save" :popup-target="surface" :locale="locale" autofocus @committed="close" @cancel="close" />
      </div>
    </QuireDialogContent>
  </QuireDialogRoot>
</template>
