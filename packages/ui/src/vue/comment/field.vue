<script setup lang="ts">
import { computed, getCurrentInstance, shallowRef, useId } from "vue";
import QuireTextarea from "../textarea/textarea.vue";
import { useQuireKitMessages } from "../locale-provider/context";
import { mentionLink, mentionQuery, mentionsIn } from "./mentions";
import type { QuireKitCommentMention, QuireKitCommentMentionSource } from "./types";

const props = withDefaults(defineProps<{
  /** Field text. */ readonly modelValue: string;
  /** Empty hint. */ readonly placeholder?: string | undefined;
  /** Accessible name. */ readonly label: string;
  /** Minimum visible rows. */ readonly rows?: number;
  /** Rows before scrolling. */ readonly maxRows?: number;
  /** Disables input. */ readonly disabled?: boolean;
  /** People offered after typing @. */ readonly mentions?: QuireKitCommentMentionSource | undefined;
  /** Mentions already in the text, kept when it is edited. */ readonly initialMentions?: readonly QuireKitCommentMention[] | undefined;
}>(), { rows: 1, maxRows: 4, disabled: false });
const emit = defineEmits<{
  /** Text changed. */ "update:modelValue": [value: string];
  /** Mod+Enter. */ submit: [];
  /** Escape outside the suggestion list. */ cancel: [];
  /** The field received focus. */ focus: [];
}>();
const text = useQuireKitMessages("comment"), listId = `qk-comment-mentions-${useId()}`, instance = getCurrentInstance();
const field = shallowRef<InstanceType<typeof QuireTextarea>>();
const query = shallowRef<{ readonly start: number; readonly text: string } | null>(null);
const candidates = shallowRef<readonly QuireKitCommentMention[]>([]), active = shallowRef(0), loading = shallowRef(false);
const chosen = new Map<string, QuireKitCommentMention>((props.initialMentions ?? []).map(item => [item.url, item]));
const open = computed(() => !!query.value && !!props.mentions);
let request = 0;

/** @returns The native textarea inside the public field. */
function textarea(): HTMLTextAreaElement | null { return (instance?.proxy?.$el as HTMLElement | undefined)?.querySelector("textarea") ?? null; }

/** Reads the @ query before the caret and loads matching people; stale results are dropped. */
async function refresh(): Promise<void> {
  const element = textarea(), source = props.mentions;
  const found = element && source ? mentionQuery(props.modelValue, element.selectionStart) : null;
  query.value = found;
  if (!found || !source) { candidates.value = []; return; }
  const token = ++request, needle = found.text.toLowerCase();
  loading.value = true;
  const result = typeof source === "function" ? await source(found.text)
    : source.filter(item => item.label.toLowerCase().includes(needle) || item.description?.toLowerCase().includes(needle));
  if (token !== request) return;
  loading.value = false; candidates.value = result.slice(0, 6); active.value = 0;
}

/** @param mention - Person to insert in place of the typed @ query. */
function insert(mention: QuireKitCommentMention): void {
  const element = textarea(), found = query.value;
  if (!element || !found) return;
  const link = `${mentionLink(mention)} `, end = element.selectionStart;
  const next = props.modelValue.slice(0, found.start) + link + props.modelValue.slice(end);
  chosen.set(mention.url, mention); query.value = null; candidates.value = [];
  emit("update:modelValue", next);
  requestAnimationFrame(() => { element.focus(); element.setSelectionRange(found.start + link.length, found.start + link.length); });
}

/** Navigates suggestions, then Mod+Enter submits and Escape cancels; IME confirmation is left alone. @param event - Key event. */
function keydown(event: KeyboardEvent): void {
  if (props.disabled || event.isComposing) return;
  if (open.value && candidates.value.length) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault(); active.value = (active.value + (event.key === "ArrowDown" ? 1 : -1) + candidates.value.length) % candidates.value.length; return;
    }
    if (event.key === "Enter" && !event.metaKey && !event.ctrlKey || event.key === "Tab") { event.preventDefault(); insert(candidates.value[active.value]!); return; }
  }
  if (event.key === "Escape") { event.preventDefault(); if (open.value) query.value = null; else emit("cancel"); }
  else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); emit("submit"); }
}

/** @param value - New text from the field. */
function update(value: string): void { emit("update:modelValue", value); queueMicrotask(() => void refresh()); }

defineExpose({
  /** Focuses the field. */ focus: () => field.value?.focus(),
  /** @returns Mentions chosen in this field whose links are still in the text. */ mentions: (): QuireKitCommentMention[] => mentionsIn(props.modelValue, chosen),
});
</script>

<template>
  <div class="qk-comment-field">
    <QuireTextarea ref="field" width="100%" size="sm" auto-resize :rows="rows" :max-rows="maxRows" :model-value="modelValue" :placeholder="placeholder"
      :aria-label="label" :disabled="disabled" :aria-autocomplete="mentions ? 'list' : undefined" :aria-controls="open ? listId : undefined"
      :aria-expanded="mentions ? open : undefined" :aria-activedescendant="open && candidates.length ? `${listId}-${active}` : undefined"
      @update:model-value="update" @keydown="keydown" @click="refresh" @focus="emit('focus')" @blur="query = null" />
    <ul v-if="open" :id="listId" class="qk-comment-mentions" role="listbox" :aria-label="text.mentionList">
      <li v-for="(item, index) in candidates" :id="`${listId}-${index}`" :key="item.id" role="option" class="qk-comment-mentions__item"
        :aria-selected="index === active" @mousedown.prevent="insert(item)" @mouseenter="active = index">
        <span class="qk-comment-mentions__label">{{ item.label }}</span>
        <span v-if="item.description" class="qk-comment-mentions__description">{{ item.description }}</span>
      </li>
      <li v-if="!candidates.length" class="qk-comment-mentions__empty" role="presentation">{{ loading ? text.mentionLoading : text.mentionEmpty }}</li>
    </ul>
  </div>
</template>
