<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from "vue";
import { QuireField, QuireIcon, QuireInput, QuireListbox } from "@quirekit/ui/vue";
import type { MdDocumentLink, MdDocumentLinkSource } from "../../commands/types";
import type { MdEditorLocale } from "../types";
import { mdEditorMessages } from "../messages";
import { resolveMdMentions } from "../mentions/provider";
const props = defineProps<{
  /** Field language. */ locale: MdEditorLocale;
  /** Portable image rather than link. */ image: boolean;
  /** Host documents; adds a search that fills the address and text of a document link. */ documents?: MdDocumentLinkSource | undefined;
  /** Stable address input for initial task focus. */ addressId?: string;
  /** Address feedback uses the same policy as submission. */ invalidUrl?: boolean;
  /** Existing links need visible text when the label is explicitly editable. */ invalidLabel?: boolean;
  /** Existing formatted content remains owned by the document. */ showLabel?: boolean;
  /** Explanation when the task preserves the selected or formatted content. */ labelHint?: string;
}>();
const url = defineModel<string>("url", { required: true }), label = defineModel<string>("label", { required: true }), title = defineModel<string>("title", { required: true });
const text = computed(() => mdEditorMessages[props.locale]);
const query = ref(""), results = shallowRef<readonly MdDocumentLink[]>([]);
let pending: AbortController | undefined, timer: ReturnType<typeof setTimeout> | undefined;
// Searches as the user types, cancelling the previous request; an empty query asks the host for suggestions.
watch(query, (value) => {
  clearTimeout(timer); pending?.abort();
  if (!props.documents) return;
  timer = setTimeout(async () => {
    const controller = pending = new AbortController();
    try { const found = await resolveMdMentions(props.documents!, { query: value, signal: controller.signal }); if (!controller.signal.aborted) results.value = found.slice(0, 8); }
    catch { if (!controller.signal.aborted) results.value = []; }
  }, 150);
}, { immediate: true });
onBeforeUnmount(() => { clearTimeout(timer); pending?.abort(); });
/** @param id - Chosen document. */
function choose(id: string): void {
  const document = results.value.find(item => item.id === id);
  if (!document) return;
  url.value = document.url;
  if (props.showLabel !== false && !label.value.trim()) label.value = document.label;
}
</script>
<template>
  <div class="flex flex-col gap-qk-surface-compact">
    <div v-if="documents && !image" class="flex flex-col gap-qk-inline">
      <QuireInput v-model="query" size="md" width="100%" :aria-label="text.searchDocuments" :placeholder="text.searchDocuments">
        <template #leading><QuireIcon name="search" /></template>
      </QuireInput>
      <QuireListbox v-if="results.length" :label="text.documentLink" hide-label
        :items="results.map(item => ({ value: item.id, label: item.label, ...(item.description ? { description: item.description } : {}) }))" @select="choose" />
    </div>
    <QuireField v-bind="addressId ? { controlId: addressId } : {}" :label="text.url" width="100%" required :invalid="invalidUrl" :error-text="text.invalidUrl"><template #default="{ controlProps }"><QuireInput v-bind="controlProps" v-model="url" inputmode="url" autocomplete="off" autocapitalize="off" :spellcheck="false" size="md" :placeholder="text.addressPlaceholder" width="100%" data-md-destination /></template></QuireField>
    <QuireField v-if="showLabel !== false" :label="image ? text.alt : text.linkText" width="100%" :invalid="invalidLabel" :error-text="text.linkTextRequired"><template #default="{ controlProps }"><QuireInput v-bind="controlProps" v-model="label" size="md" :placeholder="image ? text.altPlaceholder : text.linkTextPlaceholder" width="100%" /></template></QuireField>
    <p v-else-if="labelHint" class="m-0 qk-type-helper text-qk-text-secondary">{{ labelHint }}</p>
    <QuireField :label="text.optionalTitle" width="100%"><template #default="{ controlProps }"><QuireInput v-bind="controlProps" v-model="title" size="md" :placeholder="text.titlePlaceholder" width="100%" /></template></QuireField>
  </div>
</template>
