<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import type { Editor, EditorEvents } from "@quirekit/core";
import { getSearchSnapshot } from "@quirekit/extension-search";
import { QuireButton, QuireIcon, QuireIconButton, QuireInput } from "@quirekit/ui/vue";

const { t } = useBlockLocale();

const props = defineProps<{ editor: Editor; editable: boolean; replace: boolean }>();
const panel = ref<HTMLElement>();
const initial = props.editor.state.pm.selection;
const selectedText = initial.empty ? "" : props.editor.state.doc.textBetween(initial.from, initial.to, " ");
const query = ref(selectedText.length <= 200 ? selectedText : "");
const replacement = ref("");
const caseSensitive = ref(false);
const wholeWord = ref(false);
const limited = ref(false);
const scope = shallowRef(initial.empty ? undefined : { from: initial.from, to: initial.to });
const snapshot = shallowRef(getSearchSnapshot(props.editor.state.pm));
const result = computed(() => snapshot.value.count ? `${snapshot.value.activeIndex + 1} / ${snapshot.value.count}` : "无匹配结果");
/** Reads the extension's retained O(1) summary only while mounted. @param event - Applied document and search transactions. */
function sync(event: EditorEvents["transaction"]): void {
  for (const tr of [event.transaction, ...event.appendedTransactions]) {
    if (!scope.value || !tr.docChanged) continue;
    const from = tr.mapping.map(scope.value.from, 1);
    const to = tr.mapping.map(scope.value.to, -1);
    scope.value = to > from ? { from, to } : undefined;
  }
  snapshot.value = getSearchSnapshot(props.editor.state.pm);
}
/** Commits literal search options, preserving panel input focus. */
function search(): void {
  if (!query.value || (limited.value && !scope.value)) { props.editor.commands.clearSearch(); return; }
  props.editor.commands.setSearchQuery(query.value, { caseSensitive: caseSensitive.value, wholeWord: wholeWord.value }, limited.value ? scope.value : undefined);
  props.editor.commands.findNext();
}
/** @param all - Whether to replace all admitted results in one transaction. */
function replaceMatches(all: boolean): void {
  if (!props.editor.isEditable) return;
  props.editor.commands.closeHistory?.();
  if (all) props.editor.commands.replaceAllSearchMatches(replacement.value);
  else props.editor.commands.replaceSearchMatch(replacement.value);
  props.editor.commands.closeHistory?.();
}
/** @param event - Panel-owned keyboard input. */
function keydown(event: KeyboardEvent): void {
  if (event.isComposing) return;
  if (event.key === "Enter") {
    event.preventDefault();
    if (event.shiftKey) props.editor.commands.findPrevious();
    else props.editor.commands.findNext();
  }
}
props.editor.on("transaction", sync);
watch([query, caseSensitive, wholeWord, limited], search);
watch(() => scope.value === undefined, missing => { if (missing && limited.value) props.editor.commands.clearSearch(); });
onMounted(() => { search(); panel.value?.querySelector("input")?.focus(); });
onBeforeUnmount(() => { props.editor.off("transaction", sync); if (!props.editor.isDestroyed) props.editor.commands.clearSearch(); });
</script>

<template>
  <div ref="panel" class="qk-block-search" @keydown="keydown">
    <QuireInput v-model="query" :aria-label="t('查找内容')" :placeholder="t('查找文档内容')" width="100%" />
    <QuireInput v-if="replace" v-model="replacement" :aria-label="t('替换内容')" :placeholder="t('替换为（留空可删除）')" width="100%" :disabled="!editable" />
    <div class="qk-block-search__options">
      <QuireButton size="xs" variant="ghost" :aria-pressed="caseSensitive" @click="caseSensitive = !caseSensitive">{{ t("区分大小写") }}</QuireButton>
      <QuireButton size="xs" variant="ghost" :aria-pressed="wholeWord" @click="wholeWord = !wholeWord">{{ t("全字匹配") }}</QuireButton>
      <QuireButton v-if="scope || limited" size="xs" variant="ghost" :aria-pressed="limited" @click="limited = !limited">{{ t("选区内查找") }}</QuireButton>
    </div>
    <div class="qk-block-search__row">
      <span role="status" class="qk-block-search__count">{{ t(result) }}</span>
      <QuireIconButton :label="t('上一个匹配')" size="sm" variant="ghost" :disabled="!snapshot.count" @click="editor.commands.findPrevious()"><QuireIcon name="chevronUp" /></QuireIconButton>
      <QuireIconButton :label="t('下一个匹配')" size="sm" variant="ghost" :disabled="!snapshot.count" @click="editor.commands.findNext()"><QuireIcon name="chevronDown" /></QuireIconButton>
    </div>
    <div v-if="replace" class="qk-block-search__row qk-block-search__actions">
      <QuireButton size="sm" variant="soft" :disabled="!editable || !snapshot.count" @click="replaceMatches(false)">{{ t("替换") }}</QuireButton>
      <QuireButton size="sm" variant="soft" :disabled="!editable || !snapshot.count" @click="replaceMatches(true)">{{ t("全部替换") }}</QuireButton>
    </div>
    <p v-if="snapshot.lastReplaceAll" role="status" class="qk-type-helper">{{ t("已替换 {count} 处，跳过 {skipped} 处", { count: snapshot.lastReplaceAll.replaced, skipped: snapshot.lastReplaceAll.skipped }) }}</p>
  </div>
</template>
