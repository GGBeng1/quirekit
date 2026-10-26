<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch } from "vue";
import { QuireButton, QuireIcon, QuireInput, QuireSwitch, QuireTextarea } from "@quirekit/ui/vue";
import type { DocumentPropertiesProps, DocumentProperty } from "@quirekit/msfe-markdown-extras";
import type { MdDocumentPropertyRowProps } from "./types";
import { propertyDraft, propertyFormEditable, propertyFormValue } from "./values";
import PropertyAction from "./action.vue";
import PropertyValue from "./value.vue";

const props = defineProps<MdDocumentPropertyRowProps>();
const root = ref<HTMLElement>(), editing = ref(false), draft = ref(""), error = ref("");
const session = shallowRef<{ view: DocumentPropertiesProps; entry: DocumentProperty }>();
const english = computed(() => props.view.locale === "en");
const editable = computed(() => !props.view.readOnly && propertyFormEditable(props.entry));
const expanded = ref(false), long = ref(false);
const icon = computed(() => Array.isArray(props.entry.value) ? "listBullet" : typeof props.entry.value === "boolean" ? "checkbox" : props.entry.value === undefined ? "code" : "type");
watch(() => props.view.readOnly, value => { if (value) editing.value = false; });

/** Captures the accepted source snapshot before opening a local form draft. */
async function begin(): Promise<void> {
  session.value = { view: props.view, entry: props.entry }; draft.value = propertyDraft(props.entry); error.value = ""; editing.value = true;
  await nextTick(); root.value?.querySelector<HTMLElement>("input, textarea, [role=switch]")?.focus();
}
/** @param event - Optional cancel event; composition retains its own Escape key. Returns focus to the value after closing the draft. */
async function close(event?: KeyboardEvent | MouseEvent): Promise<void> {
  if (event && "isComposing" in event && event.isComposing) return;
  editing.value = false; error.value = ""; await nextTick(); root.value?.querySelector<HTMLButtonElement>("[data-property-edit]")?.focus();
}
/** @param event - Optional keyboard submit, including IME ownership. */
function save(event?: KeyboardEvent): void {
  if (event?.isComposing || !session.value) return;
  event?.preventDefault();
  if (draft.value === propertyDraft(session.value.entry)) { void close(); return; }
  const value = propertyFormValue(session.value.entry, draft.value);
  if (value === undefined) { error.value = english.value ? "Enter a valid value." : "请输入有效的值。"; return; }
  const result = session.value.view.change({ type: "set", key: session.value.entry.key, value });
  if (result.ok) void close();
  else error.value = english.value ? "The document changed. Reopen this field to edit its current value." : "文档已变化，请重新打开此字段编辑当前值。";
}
/** Removes a source entry only through the current canonical transaction contract. */
async function remove(): Promise<void> {
  const panel = root.value?.closest(".md-properties"), rows = [...panel?.querySelectorAll("[data-property-key]") ?? []];
  const index = rows.indexOf(root.value!);
  const result = props.view.change({ type: "remove", key: props.entry.key });
  if (!result.ok) error.value = english.value ? "Unable to remove this property." : "未能删除此属性。";
  else {
    await nextTick();
    const actions = panel?.querySelectorAll<HTMLButtonElement>("[data-property-edit]");
    (actions?.[Math.min(index, actions.length - 1)] ?? panel?.querySelector<HTMLButtonElement>("[data-property-add-trigger]"))?.focus();
  }
}
</script>
<template>
  <div ref="root" class="md-properties__row" :data-property-key="entry.key" @keydown.esc.stop="close">
    <div class="md-properties__key" :title="entry.key"><span v-if="typeof entry.value === 'number'" aria-hidden="true">#</span><QuireIcon v-else :name="icon" :size="16" /><span>{{ entry.key }}</span></div>
    <div class="md-properties__value" :class="{ 'md-properties__value--expanded': expanded }">
      <template v-if="editing">
        <div class="md-properties__editor">
          <QuireSwitch v-if="typeof entry.value === 'boolean'" :checked="draft === 'true'" :label="entry.key" size="sm" @update:checked="draft = String($event)" />
          <QuireTextarea v-else-if="Array.isArray(entry.value) || typeof entry.value === 'string' && /[\r\n]/u.test(entry.value)"
            v-model="draft" :aria-label="entry.key" :rows="2" :max-rows="6" auto-resize width="100%" size="sm" :invalid="!!error" @keydown.ctrl.enter="save" @keydown.meta.enter="save" />
          <QuireInput v-else v-model="draft" :aria-label="entry.key" size="sm" width="100%" :invalid="!!error" @keydown.enter="save" />
          <div class="md-properties__actions">
            <PropertyAction :label="english ? 'Save' : '保存'" icon="check" primary @click="save()" />
            <PropertyAction :label="english ? 'Cancel' : '取消'" icon="close" @click="close" />
          </div>
        </div>
        <small v-if="Array.isArray(entry.value)" class="md-properties__muted">{{ english ? 'One item per line · ⌘/Ctrl + Enter to save' : '每行一项 · ⌘/Ctrl + Enter 保存' }}</small>
      </template>
      <div v-else class="md-properties__preview">
        <QuireButton v-if="editable" data-property-edit class="md-properties__value-button" size="sm" variant="ghost" :aria-label="`${english ? 'Edit' : '编辑'} ${entry.key}`" @click="begin">
          <PropertyValue :entry="entry" :expanded="expanded" :english="english" @overflow="long = $event" />
          <template #trailing><QuireIcon class="md-properties__edit-hint" name="edit" :size="12" /></template>
        </QuireButton>
        <div v-else class="md-properties__readonly"><PropertyValue :entry="entry" :expanded="expanded" :english="english" @overflow="long = $event" /></div>
        <PropertyAction v-if="long" :label="`${expanded ? (english ? 'Collapse' : '收起') : (english ? 'Expand' : '展开')} ${entry.key}`" :icon="expanded ? 'chevronUp' : 'chevronDown'" :aria-expanded="expanded" @click="expanded = !expanded" />
        <PropertyAction v-if="editable" class="md-properties__remove" :label="`${english ? 'Remove' : '删除'} ${entry.key}`" icon="trash" @click="remove" />
      </div>
      <QuireButton v-if="!propertyFormEditable(entry)" class="md-properties__source-hint" size="xs" variant="ghost" @click="view.editSource">{{ view.readOnly ? (english ? 'View source' : '查看源码') : (english ? 'Edit in source' : '在源码中编辑') }}</QuireButton>
      <div v-if="error" role="alert" class="md-properties__error">{{ error }}</div>
    </div>
  </div>
</template>
