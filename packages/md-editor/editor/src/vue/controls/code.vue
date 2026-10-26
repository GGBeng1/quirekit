<script setup lang="ts">
import { computed, inject, shallowRef } from "vue";
import { QuireButton, QuireChoicePicker, QuireCodeBlockHeader, QuireIcon, QuireSelect } from "@quirekit/ui/vue";
import { quireKitEditorIconData, type QuireKitChoiceSubmitRequest } from "@quirekit/ui";
import type { VueNodeViewComponentProps } from "@quirekit/msfe-vue";
import type { CodeBlockAttributes } from "@quirekit/msfe-code-block";
import { syntaxTree } from "@quirekit/cm-language";
import { mdEditorKey, mdLocaleKey, mdNarrowKey } from "../context";
import { mdEditorMessages } from "../messages";
import { useNarrowToolbar } from "../toolbar/presentation";
import { readCodeBody } from "@quirekit/incremark/vue";
import { mdCodeLanguages } from "../../code/languages";
const props = defineProps<VueNodeViewComponentProps<CodeBlockAttributes>>();
const editor = inject(mdEditorKey), locale = inject(mdLocaleKey, shallowRef("zh-CN"));
const narrow = inject(mdNarrowKey, () => useNarrowToolbar(() => editor?.value), true);
const desktopOpen = shallowRef(false), mobileOpen = shallowRef(false), error = shallowRef("");
// An open choice keeps its control when the viewport crosses the product breakpoint.
const mobile = computed<boolean>(previous => desktopOpen.value || mobileOpen.value ? previous ?? narrow.value : narrow.value);
const text = computed(() => mdEditorMessages[locale.value]);
// The picker lists the product catalog; a fence the catalog does not list (or names by alias) stays selectable as written.
const languages = computed(() => {
  const current = props.nodeView.attrs.language;
  const items = [{ value: "language:", label: text.value.plain, language: "" },
    ...mdCodeLanguages.map(entry => ({ value: `language:${entry.name}`, label: entry.label, language: entry.name }))];
  if (current && !items.some(item => item.language === current)) {
    const known = mdCodeLanguages.find(entry => entry.aliases?.includes(current));
    items.splice(1, 0, { value: `language:${current}`, label: known?.label ?? current, language: current });
  }
  return items;
});
const currentLabel = computed(() => languages.value.find(item => item.language === props.nodeView.attrs.language)?.label ?? text.value.plain);
let committed = false;
/** @param value - A finite language identity, including the empty info string. */
function writeLanguage(value: string | undefined): void {
  const item = languages.value.find(item => item.value === value);
  if (props.nodeView.readOnly || !props.nodeView.getRange() || !item) throw new Error(text.value.conflict);
  // NodeView owns mapped source identity and codec validation; DOM focus cannot retarget this write.
  const result = props.nodeView.updateAttributes({ language: item.language });
  if (!result.ok) throw new Error(text.value.rejected);
  committed = true;
}
/** @param request - A single mobile choice admitted by the public task lifecycle. */
function submit(request: QuireKitChoiceSubmitRequest): void {
  if (request.signal.aborted) throw new Error(text.value.conflict);
  writeLanguage(request.value[0]);
}
/** @param value - The desktop Select's committed value; rejected edits retain canonical attributes. */
function selectLanguage(value: string | undefined): void {
  error.value = "";
  try { writeLanguage(value); }
  catch (reason) { error.value = reason instanceof Error ? reason.message : text.value.rejected; }
}
/** @returns Existing editor input after a write, or the persistent language button on cancel. */
function finalFocus(): HTMLElement | null {
  return committed ? editor?.value?.element.querySelector<HTMLElement>('[role="textbox"]') ?? null : null;
}
/** Read only when copying; ordinary input never serializes a code block or the document. @returns Current mapped code body. */
function getCode(): string {
  const state = editor?.value?.state, range = props.nodeView.getRange();
  if (!state || !range) return "";
  let node = syntaxTree(state).resolveInner(range.from, 1);
  while (node.name !== "FencedCode" && node.parent) node = node.parent;
  return node.name === "FencedCode" ? readCodeBody(state, node) : "";
}
</script>
<template>
  <QuireCodeBlockHeader :get-code="getCode">
    <template #title>
      <QuireSelect v-if="!mobile" v-model:open="desktopOpen" :label="text.language"
        :model-value="`language:${nodeView.attrs.language}`" :items="languages" :disabled="nodeView.readOnly"
        variant="text" size="xs" width="128px" content-width="176px" :content-props="{ lang: locale }"
        @value-change="selectLanguage" />
      <QuireChoicePicker v-else :title="text.language" :model-value="[`language:${nodeView.attrs.language}`]" :items="languages"
        presentation="bottom"
        :disabled="nodeView.readOnly" searchable :submit="submit" :final-focus-el="finalFocus"
        @open-change="open => { mobileOpen = open; if (open) committed = false; }">
        <template #trigger="{ disabled }">
          <QuireButton :aria-label="text.language" :disabled="disabled" variant="ghost" size="sm">
            {{ currentLabel }}
            <template #trailing><QuireIcon :data="quireKitEditorIconData.chevronDown" /></template>
          </QuireButton>
        </template>
      </QuireChoicePicker>
      <span v-if="error" role="status" class="qk-type-helper text-qk-text-secondary">{{ error }}</span>
    </template>
  </QuireCodeBlockHeader>
</template>
