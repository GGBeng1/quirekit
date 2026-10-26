<script setup lang="ts">
import { computed, ref, useId } from "vue";
import type { QuireKitMenuEntry } from "@quirekit/ui";
import { QuireIcon, QuireIconButton, QuireMenu, QuireTooltipContent, QuireTooltipRoot, QuireTooltipTrigger } from "@quirekit/ui/vue";
import { flowEditorText } from "@quirekit/flow-editor";
const props = defineProps<{ /** Current preview-host preference. */ locale: string }>();
const emit = defineEmits<{ /** Explicit host language selection. */ select: [locale: string] }>();
const open = ref(false), id = `qk-flow-locale-${useId()}`;
const label = computed(() => flowEditorText(props.locale, "界面语言"));
const title = computed(() => flowEditorText(props.locale, "界面语言：{language}", { language: props.locale === "en" ? "English" : "中文" }));
const items = computed<readonly QuireKitMenuEntry[]>(() => [{ value: "language", kind: "radio-group", label: label.value, selectedValue: props.locale,
  children: [{ value: "zh-CN", label: "中文" }, { value: "en", label: "English" }] }]);
/** @param value - Public menu selection; only supported interface languages are accepted. */
function selectLocale(value: string | undefined): void {
  if (value !== "zh-CN" && value !== "en") return;
  open.value = false; emit("select", value);
}
</script>
<template>
  <QuireTooltipRoot :trigger-id="`menu:${id}:trigger`" :disabled="open" :open-delay="420" placement="bottom">
    <QuireMenu :id="id" v-model:open="open" :items="items" :aria-label="label" placement="bottom-end" min-width="128px" @select="selectLocale">
      <template #trigger>
        <QuireTooltipTrigger as-child><QuireIconButton :label="title" variant="ghost" size="sm"><QuireIcon name="languages" :size="16" /></QuireIconButton></QuireTooltipTrigger>
      </template>
    </QuireMenu>
    <QuireTooltipContent :content="title" />
  </QuireTooltipRoot>
</template>
