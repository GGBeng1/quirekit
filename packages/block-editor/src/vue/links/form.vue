<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { onMounted, ref } from "vue";
import { QuireButton, QuireField, QuireInput } from "@quirekit/ui/vue";
import type { BlockLinkTarget } from "../../links/types";

const { t } = useBlockLocale();

const props = defineProps<{
  /** Frozen canonical target; no editor subscription is needed inside the form. */ target: BlockLinkTarget;
  /** Failed commit feedback owned by the command host. */ error: string;
}>();
const emit = defineEmits<{ apply: [href: string, text: string]; cancel: []; remove: [] }>();
const href = ref(props.target.range?.href ?? ""), text = ref(props.target.text);
const form = ref<HTMLFormElement>();
const composing = ref(false);
/** @param event - An input-method confirmation must not submit the link task. */
function key(event: KeyboardEvent): void {
  if (event.key === "Enter" && (event.isComposing || composing.value)) { event.preventDefault(); event.stopPropagation(); }
}
/** Commits only an explicit form submission after native composition has ended. */
function submit(): void { if (!composing.value) emit("apply", href.value, text.value); }
onMounted(() => { form.value?.querySelector<HTMLInputElement>('input[name="href"]')?.focus({ preventScroll: true }); });
</script>
<template>
  <form ref="form" class="qk-block-link-form" novalidate @submit.prevent="submit" @keydown.capture="key"
    @compositionstart="composing = true" @compositionend="composing = false">
    <QuireField :label="t('文本')" width="100%" :read-only="!target.textEditable"
      v-bind="!target.textEditable ? { description: t('保留所选内容的结构，仅修改链接地址。') } : {}" v-slot="field">
      <QuireInput v-bind="field.controlProps" v-model="text" name="text" width="100%" :placeholder="t('留空时使用链接地址')" clearable />
    </QuireField>
    <QuireField :label="t('链接地址')" width="100%" :invalid="!!error" :error-text="t(error)" v-slot="field">
      <QuireInput v-bind="field.controlProps" v-model="href" name="href" width="100%" placeholder="https://example.com" autocomplete="off" clearable />
    </QuireField>
    <div class="qk-block-link-form__actions">
      <QuireButton v-if="target.range" variant="ghost" class="qk-block-link-form__remove" @click="emit('remove')">{{ t("取消链接") }}</QuireButton>
      <QuireButton variant="ghost" @click="emit('cancel')">{{ t("取消") }}</QuireButton>
      <QuireButton type="submit" variant="solid" color="primary" :disabled="!href.trim()">{{ t("确认") }}</QuireButton>
    </div>
  </form>
</template>
