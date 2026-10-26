<script setup lang="ts">
import { computed, ref, useId } from "vue";
import { QuireButton } from "@quirekit/ui/vue";
import { isSafeDestination, type MsfeEditor } from "@quirekit/msfe-core";
import type { EditorState } from "@quirekit/cm-state";
import { editMdDestination, mdDestinationSource, removeMdLink } from "../../commands/destination";
import type { MdDocumentLinkSource } from "../../commands/types";
import type { MdEditorLocale } from "../types";
import { mdEditorMessages } from "../messages";
import type { MdDialogIntent } from "./types";
import TaskSurface from "./surface.vue";
import DestinationFields from "./destination-fields.vue";

const props = defineProps<{
  /** Canonical source and command owner. */ editor: MsfeEditor;
  /** Accepted state invalidates only the captured target and permissions. */ state: EditorState;
  /** Original mapped source and initial fields. */ intent: MdDialogIntent;
  /** Product control language. */ locale: MdEditorLocale;
  /** Optional host document suggestions, producing ordinary Markdown addresses. */ documents?: MdDocumentLinkSource | undefined;
}>();
const emit = defineEmits<{ /** Cancelled or committed; the owner releases the anchor and restores focus. */ close: [] }>();
const text = computed(() => mdEditorMessages[props.locale]);
const url = ref(props.intent.url), label = ref(props.intent.label), title = ref(props.intent.title), error = ref("");
const formId = useId(), addressId = `${formId}-address`;
const address = computed(() => url.value.trim());
const invalidUrl = computed(() => !!address.value && !isSafeDestination(address.value));
const invalidLabel = computed(() => props.intent.existing && props.intent.editableLabel !== false && !label.value.trim());
const unavailable = computed(() => {
  void props.state;
  const target = props.intent.anchor.target();
  return !target || !props.editor.can(() => ({}), target);
});
const patch = computed(() => ({
  url: address.value,
  ...(props.intent.editableLabel !== false && label.value !== props.intent.label ? { label: label.value } : {}),
  ...(title.value !== props.intent.title ? { title: title.value } : {}),
}));
const canSubmit = computed(() => !unavailable.value && !!address.value && !invalidUrl.value && !invalidLabel.value
  && !Object.values(patch.value).some(value => /[\r\n]/u.test(value)));
/** @returns This instance's actual address input after the task is mounted. */
function initialFocus(): HTMLElement | null { return props.editor.element.ownerDocument.getElementById(addressId); }
/** Validates and applies one mapped source edit, preserving an unchanged label verbatim. */
function submit(): void {
  if (!canSubmit.value) return;
  const target = props.intent.anchor.target();
  if (!target) { error.value = text.value.conflict; return; }
  const source = props.intent.insert ? mdDestinationSource(false, { ...patch.value, label: label.value }) : null;
  const accepted = props.intent.insert ? !!source && props.intent.insert(source) : props.editor.run(editMdDestination(false, patch.value), target).ok;
  if (accepted) emit("close"); else error.value = text.value.rejected;
}
/** Removes only this link's wrapper; formatted content and shared definitions remain intact. */
function remove(): void {
  const target = props.intent.anchor.target();
  if (!target || unavailable.value) { error.value = text.value.conflict; return; }
  if (props.editor.run(removeMdLink(), target).ok) emit("close"); else error.value = text.value.rejected;
}
</script>
<template>
  <TaskSurface :owner="editor.element" :title="intent.existing ? text.editLink : text.insertLink" :initial-focus="initialFocus"
    :error="unavailable ? text.conflict : error" @close="emit('close')">
    <form :id="formId" novalidate @submit.prevent="submit">
      <DestinationFields v-model:url="url" v-model:label="label" v-model:title="title" :image="false" :locale="locale" :documents="documents"
        :address-id="addressId" :invalid-url="invalidUrl" :invalid-label="invalidLabel" :show-label="intent.editableLabel !== false"
        :label-hint="intent.existing ? text.preserveLinkText : text.linkSelection" />
    </form>
    <template #footer>
      <div class="md-link-actions">
        <QuireButton v-if="intent.existing" variant="text" :disabled="unavailable" @click="remove">{{ text.removeLink }}</QuireButton>
        <span class="md-link-actions__spacer" />
        <QuireButton variant="text" @click="emit('close')">{{ text.cancel }}</QuireButton>
        <QuireButton type="submit" :form="formId" color="primary" variant="solid" :disabled="!canSubmit">{{ intent.existing ? text.apply : text.insert }}</QuireButton>
      </div>
    </template>
  </TaskSurface>
</template>
<style scoped>
.md-link-actions { display: flex; flex-wrap: wrap; align-items: center; width: 100%; gap: var(--qk-space-inline); }
.md-link-actions__spacer { flex: 1; }
@media (max-width: 767px) { .md-link-actions > button { min-height: 44px; } }
</style>
