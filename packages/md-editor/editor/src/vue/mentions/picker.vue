<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { QuireInput, QuireIcon, QuireListbox, QuireButton } from "@quirekit/ui/vue";
import { SuggestionController } from "@quirekit/suggestion";
import type { MsfeEditor, SourceAnchor } from "@quirekit/msfe-core";
import type { MdMention, MdMentionSource } from "../../commands/types";
import { insertMdDocumentLink, insertMdMention } from "../../commands/portable";
import { resolveMdMentions } from "./provider";
import type { MdEditorLocale } from "../types";
import { mdEditorMessages } from "../messages";

const props = defineProps<{
  /** Canonical source owner. */ editor: MsfeEditor;
  /** Anchor captured before the picker opened. Owned by the surface. */ anchor: SourceAnchor;
  /** Cancellable host contact source. */ source: MdMentionSource;
  /** Localized controls. */ locale: MdEditorLocale;
  /** Optional adjacent insertion using the same provider and validation lifecycle. */ insert?: (item: MdMention) => boolean;
  /** `document` searches host documents and inserts a Markdown link instead of a mention. */ kind?: "mention" | "document" | undefined;
}>();
const emit = defineEmits<{ /** The source transaction completed. */ inserted: [] }>();
const query = ref(""), error = ref(""), composing = ref(false), root = ref<HTMLElement>();
const text = computed(() => mdEditorMessages[props.locale]);
const documents = computed(() => props.kind === "document");
const labels = computed(() => documents.value
  ? { title: text.value.documentLink, search: text.value.searchDocuments, empty: text.value.noDocuments, loading: text.value.loadingDocuments, failed: text.value.failedDocuments }
  : { title: text.value.mention, search: text.value.searchPeople, empty: text.value.noPeople, loading: text.value.loadingPeople, failed: text.value.failedPeople });
// The public surface owns dismissal and focus. The shared controller owns request
// correlation and aborts; no provider may directly mutate a document.
const controller = new SuggestionController<SourceAnchor, MdMention>({
  providers: [{ id: "contacts", group: "contacts", trigger: "mention",
    /** @param request - Shared request correlation and abort signal. @returns Valid host actions. */
    async provide(request) {
    return (await resolveMdMentions(props.source, request)).map(item => ({ id: item.id, label: item.label, action: item }));
  } }],
  overlay: {
    /** The containing public Menu already owns this mounted surface. */ open() {},
    /** Surface unmount releases focus and source intent at the product boundary. */ release() {},
  },
});
const state = shallowRef(controller.state);
const unsubscribe = controller.subscribe(value => { state.value = value; });
const stop = props.editor.subscribeState({ select: next => next, change() {
  if (props.editor.state.readOnly || !props.anchor.target()) { controller.cancel(); error.value = text.value.conflict; }
} });
const items = computed(() => state.value.results.map(row => ({ value: row.result.id, label: row.result.label, ...(row.result.action.description ? { description: row.result.action.description } : {}) })));
/** Begins or retries the current query at the original source anchor. */
function start(): void {
  if (!props.anchor.target() || props.editor.state.readOnly) { error.value = text.value.conflict; return; }
  error.value = "";
  controller.start({ root: props.editor.element, trigger: { kind: "mention", text: "@" }, query: query.value,
    target: { id: "mention", generation: props.editor.revision, bookmark: props.anchor }, restoreFocus() {} });
}
onMounted(start);
onBeforeUnmount(() => { unsubscribe(); stop(); controller.destroy(); });
watch(query, value => { if (!composing.value) controller.updateQuery(value); });
watch(() => props.source, () => { if (!composing.value) start(); });
/** @param value - Browser composition ownership; preedit never sends provider requests. */
function composition(value: boolean): void {
  composing.value = value; controller.setComposing(value);
  if (!value) void nextTick(start);
}
/** @param id - Explicit activation from the public listbox. */
function choose(id: string): void {
  const item = state.value.results.find(row => row.result.id === id)?.result.action;
  const target = props.anchor.target();
  if (!item || !target) { error.value = text.value.conflict; return; }
  const command = documents.value ? insertMdDocumentLink(item) : insertMdMention(item);
  if (!(props.insert ? props.insert(item) : props.editor.run(command, target).ok)) { error.value = text.value.conflict; return; }
  controller.cancel(); emit("inserted");
}
/** @param event - Search field navigation; the public listbox owns movement after entry. */
function enterResults(event: KeyboardEvent): void {
  if (event.key !== "ArrowDown" || composing.value || !items.value.length) return;
  event.preventDefault(); root.value?.querySelector<HTMLElement>('[role="listbox"]')?.focus();
}
</script>
<template>
  <div ref="root" class="w-[320px] max-w-full flex flex-col gap-qk-inline p-qk-surface" @keydown.stop>
    <QuireInput v-model="query" width="100%" :aria-label="labels.search" :placeholder="labels.search" autofocus
      @keydown="enterResults" @compositionstart="composition(true)" @compositionend="composition(false)">
      <template #leading><QuireIcon name="search" /></template>
    </QuireInput>
    <p v-if="error" role="alert" class="m-0 text-qk-helper text-qk-text-secondary">{{ error }}</p>
    <p v-else-if="state.phase === 'loading'" role="status" class="m-0 py-qk-surface text-qk-helper">{{ labels.loading }}</p>
    <div v-else-if="state.phase === 'error'" class="flex flex-col gap-qk-inline">
      <p role="status" class="m-0 text-qk-helper">{{ labels.failed }}</p>
      <QuireButton variant="outline" size="sm" @click="start">{{ text.retryPeople }}</QuireButton>
    </div>
    <QuireListbox v-else :label="labels.title" hide-label :items="items" @select="choose"><template #empty>{{ labels.empty }}</template></QuireListbox>
  </div>
</template>
