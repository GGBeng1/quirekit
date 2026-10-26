<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { QuireButton, QuireColorPicker, QuireDialogContent, QuireField, QuireIcon, QuireInput, QuireInputNumber, QuireTextarea } from "@quirekit/ui/vue";
import { normalizeHexColor } from "@quirekit/ui";
import { applyFlowchartTextFormat, replaceFlowchartText, readFlowchartTextLink, type FlowchartTextFormat, type FlowchartTextPatch, type FlowchartTextSpan } from "@quirekit/flowchart";
import { useFlowMessages } from "../messages";
import type { FlowTextRequest } from "./types";

const props = defineProps<{ /** Captured owner and node. */ request: FlowTextRequest; /** Atomic source confirmation. */ apply: (text: string, spans: readonly FlowchartTextSpan[]) => void }>();
const emit = defineEmits<{ close: [] }>(), { t, failure } = useFlowMessages();
const draft = ref(props.request.node), error = ref(""), composing = ref(false), selection = ref({ from: 0, to: 0 });
const size = ref(String(props.request.node.style.fontSize ?? 14)), color = ref(props.request.node.style.color ?? "#2563eb"), link = ref("");
let nativeInput: HTMLTextAreaElement | undefined;
const selected = computed(() => selection.value.to > selection.value.from), active = computed(() => draft.value.textSpans?.find(span => span.from <= selection.value.from && span.to >= selection.value.to));
const preview = computed(() => {
  const result: { text: string; format: FlowchartTextFormat }[] = []; let position = 0;
  for (const span of draft.value.textSpans ?? []) { if (span.from > position) result.push({ text: draft.value.text.slice(position, span.from), format: {} }); result.push({ text: draft.value.text.slice(span.from, span.to), format: span }); position = span.to; }
  if (position < draft.value.text.length) result.push({ text: draft.value.text.slice(position), format: {} }); return result;
});
/** @param event - Public native Textarea event; no DOM anatomy is queried. */
function capture(event: Event): void {
  const input = event.target as HTMLTextAreaElement; if (input.tagName !== "TEXTAREA") return;
  nativeInput = input;
  if (selection.value.from === input.selectionStart && selection.value.to === input.selectionEnd) return;
  selection.value = { from: input.selectionStart, to: input.selectionEnd };
  updateControls();
}
/** Projects the restored native range's current formatting into local controls. */
function updateControls(): void {
  const format = active.value;
  size.value = String(format?.fontSize ?? draft.value.style.fontSize ?? 14);
  color.value = format?.color ?? draft.value.style.color ?? "#2563eb"; link.value = format?.link ?? "";
}
/** @param text - Native controlled input. Maps retained formats around the edit before storing one draft. */
function edit(text: string): void { try { draft.value = replaceFlowchartText(draft.value, text); error.value = ""; } catch (reason) { error.value = String(reason); } }
/** @param patch - Only the chosen local override or reset. @returns Completion of draft formatting and native range restoration. */
async function format(patch: FlowchartTextPatch): Promise<void> {
  if (!selected.value || composing.value) return;
  try {
    const range = { ...selection.value }, input = nativeInput;
    const spans = applyFlowchartTextFormat(draft.value.text, draft.value.textSpans ?? [], range.from, range.to, patch);
    draft.value = { ...draft.value, textSpans: spans }; error.value = "";
    // Native focus may report a collapsed WebKit range. Restore the frozen
    // command range after the controlled input has settled, without reviving
    // a closed draft or interrupting a new composition.
    const formatted = draft.value; await nextTick();
    if (draft.value !== formatted || composing.value || !input?.isConnected) return;
    input.focus({ preventScroll: true }); input.setSelectionRange(range.from, range.to); selection.value = range; updateControls();
  } catch { error.value = "请选择一段完整文字"; }
}
/** Validates a destination before assigning it to the selected text. */
function applyLink(): void { try { void format({ link: readFlowchartTextLink(link.value) }); } catch { error.value = "链接仅支持 http、https 或 mailto 地址"; } }
/** Opens only the explicitly requested selected destination. */
function openLink(): void { if (active.value?.link) nativeInput?.ownerDocument.defaultView?.open(active.value.link, "_blank", "noopener,noreferrer"); }
/** Confirms the whole draft as one text/range history action. */
function save(): void { if (composing.value) return; try { props.apply(draft.value.text, draft.value.textSpans ?? []); emit("close"); } catch (reason) { error.value = reason instanceof Error ? reason.message : String(reason); } }
</script>
<template>
  <QuireDialogContent :title="t('局部文字格式')" :description="t('选择一段文字，设置字体样式、字号、颜色或链接。')" size="large" :error-text="failure(error)">
    <div class="qk-flow-rich" @compositionstart="composing = true" @compositionend="composing = false">
      <QuireField :label="t('节点文字')" width="100%" v-slot="{ controlProps }"><QuireTextarea v-bind="controlProps" :model-value="draft.text" :maxlength="10000" :rows="4" width="100%" @update:model-value="edit" @focus="capture" @select="capture" @keyup="capture" @mouseup="capture" /></QuireField>
      <span class="qk-flow-rich__selection" role="status">{{ t(selected ? '选择了一段文字' : '请先选择文字') }}</span>
      <div class="qk-flow-rich__controls">
        <QuireButton variant="outline" :aria-pressed="active?.bold ?? false" :disabled="!selected || composing" @click="format({ bold: !(active?.bold ?? draft.style.bold ?? false) })"><QuireIcon name="bold" />{{ t('加粗') }}</QuireButton>
        <QuireButton variant="outline" :aria-pressed="active?.italic ?? false" :disabled="!selected || composing" @click="format({ italic: !active?.italic })"><QuireIcon name="italic" />{{ t('斜体') }}</QuireButton>
        <QuireButton variant="outline" :aria-pressed="active?.underline ?? !!active?.link" :disabled="!selected || composing" @click="format({ underline: !(active?.underline ?? !!active?.link) })"><QuireIcon name="underline" />{{ t('下划线') }}</QuireButton>
        <QuireButton variant="outline" :aria-pressed="active?.strike ?? false" :disabled="!selected || composing" @click="format({ strike: !active?.strike })"><QuireIcon name="strike" />{{ t('删除线') }}</QuireButton>
        <QuireInputNumber v-model="size" :label="t('字号')" :min="10" :max="72" :disabled="composing" width="100px" />
        <QuireButton variant="outline" :disabled="!selected || composing || Number(size) < 10 || Number(size) > 72 || !size" @click="format({ fontSize: Number(size) })">{{ t('应用字号') }}</QuireButton>
        <QuireColorPicker v-model="color" :label="t('局部文字颜色')" :show-alpha="false" :allow-reset="false" />
        <QuireButton variant="outline" :disabled="!selected || composing" @click="format({ color: normalizeHexColor(color) ?? '#2563eb' })">{{ t('应用颜色') }}</QuireButton>
      </div>
      <div class="qk-flow-rich__link"><QuireField :label="t('链接地址')" width="100%" v-slot="{ controlProps }"><QuireInput v-bind="controlProps" v-model="link" :maxlength="2048" placeholder="https://" width="100%" /></QuireField><QuireButton variant="outline" :disabled="!selected || composing || !link" @click="applyLink">{{ t('应用链接') }}</QuireButton><QuireButton variant="ghost" :disabled="!selected || composing" @click="format({ link: null })">{{ t('移除链接') }}</QuireButton></div>
      <div class="qk-flow-rich__preview" :aria-label="t('文字预览')" :style="{ fontSize: `${draft.style.fontSize ?? 14}px`, fontWeight: draft.style.bold ? 600 : 400, color: draft.style.color }"><span v-for="(run, index) in preview" :key="index" :style="{ fontWeight: run.format.bold === undefined ? undefined : run.format.bold ? 600 : 400, fontStyle: run.format.italic ? 'italic' : 'normal', fontSize: run.format.fontSize ? `${run.format.fontSize}px` : undefined, color: run.format.color, textDecoration: [run.format.underline ?? !!run.format.link ? 'underline' : '', run.format.strike ? 'line-through' : ''].filter(Boolean).join(' ') || 'none' }">{{ run.text }}</span></div>
      <div class="qk-flow-rich__secondary"><QuireButton variant="text" :disabled="!selected || composing" @click="format({ bold: null, italic: null, underline: null, strike: null, fontSize: null, color: null, link: null })">{{ t('清除局部格式') }}</QuireButton><QuireButton v-if="active?.link" variant="text" @click="openLink">{{ t('打开链接') }}<QuireIcon name="externalLink" /></QuireButton></div>
    </div>
    <template #footer><QuireButton variant="outline" @click="emit('close')">{{ t('取消') }}</QuireButton><QuireButton variant="solid" color="primary" :disabled="composing" @click="save">{{ t('应用文字') }}</QuireButton></template>
  </QuireDialogContent>
</template>
<style scoped>
.qk-flow-rich { display: grid; gap: var(--qk-space-group); }
.qk-flow-rich__selection { color: var(--qk-color-text-secondary); font-size: 12px; }
.qk-flow-rich__controls, .qk-flow-rich__link, .qk-flow-rich__secondary { display: flex; align-items: center; gap: var(--qk-space-inline); flex-wrap: wrap; }
.qk-flow-rich__link { align-items: end; flex-wrap: nowrap; }
.qk-flow-rich__preview { padding: 16px; min-height: 80px; max-height: 220px; overflow: auto; border: 1px solid var(--qk-color-border-subtle); border-radius: var(--qk-radius-control); background: var(--qk-color-surface-page); white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.4; }
@media (max-width: 640px) { .qk-flow-rich__link { flex-wrap: wrap; } }
</style>
