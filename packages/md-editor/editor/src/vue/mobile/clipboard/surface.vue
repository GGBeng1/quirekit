<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { QuireButton, QuireField, QuireTaskPanel, QuireTextarea } from "@quirekit/ui/vue";
import type { MdEditorLocale } from "../../types";
import { mdEditorMessages } from "../../messages";
import { useMdOverlayTarget } from "../../overlays/context";
const props = defineProps<{
  /** Controlled lifetime of the original source intent. */ open: boolean;
  /** Explicit editor realm and task anchor. */ owner: HTMLElement;
  /** Product language. */ locale: MdEditorLocale;
  /** Recoverable submission feedback. */ error: string;
}>();
const emit = defineEmits<{
  /** Explicit text submission; native paste in the field never edits the document. */ apply: [text: string];
  /** Close without a source mutation. */ cancel: [];
  /** Actual physical task element for the existing viewport adapter. */ surface: [element: HTMLElement | null];
}>();
const draft = ref(""), text = computed(() => mdEditorMessages[props.locale]), portal = useMdOverlayTarget();
watch(() => props.open, open => { if (open) draft.value = ""; }, { immediate: true });
</script>
<template>
  <QuireTaskPanel :open="open" :title="text.paste" presentation="bottom" :anchor-el="() => owner" :restore-focus="false" :portal-target="portal ?? 'body'"
    @update:open="!$event && emit('cancel')" @content-element-change="emit('surface', $event)">
    <QuireField :label="text.pasteText" :description="text.pasteHint" :invalid="!!error" :error-text="error" width="100%" data-qk-not-prose>
      <template #default="{ controlProps }"><QuireTextarea v-bind="controlProps" v-model="draft" :placeholder="text.pasteHint" :rows="4" width="100%" /></template>
    </QuireField>
    <template #footer>
      <QuireButton variant="ghost" @click="emit('cancel')">{{ text.cancel }}</QuireButton>
      <QuireButton :disabled="!draft" @click="emit('apply', draft)">{{ text.paste }}</QuireButton>
    </template>
  </QuireTaskPanel>
</template>
