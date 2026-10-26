<script setup lang="ts">
import { computed, ref, useId } from "vue";
import type { QuireKitMenuEntry } from "@quirekit/ui";
import { QuireIcon, QuireIconButton, QuireMenu, QuireTooltipRoot, QuireTooltipTrigger, QuireTooltipContent } from "@quirekit/ui/vue";
import { useMindEditorMessages } from "../../src/vue/messages";
import type { MindPreviewAppearance, MindPreviewLocale } from "./types";
const appearance = defineModel<MindPreviewAppearance>("appearance", { required: true });
const locale = defineModel<MindPreviewLocale>("locale", { required: true });
const { t } = useMindEditorMessages(), id = useId(), opened = ref<string>();
const switches = computed(() => [
  { id: "appearance", label: t("appearance"), icon: { light: "sun", dark: "moon", system: "sunMoon" }[appearance.value],
    current: appearance.value, choices: ["light", "dark", "system"].map(value => ({ value, label: t(value as MindPreviewAppearance) })) },
  { id: "locale", label: t("language"), icon: "languages", current: locale.value,
    choices: [{ value: "zh-CN", label: "中文" }, { value: "en", label: "English" }] },
].map(control => ({ ...control, items: [{ value: control.id, label: control.label, kind: "radio-group",
  selectedValue: control.current, children: control.choices }] as readonly QuireKitMenuEntry[] })));
/** @param control - Setting being changed. @param value - Validated menu intent. */
function select(control: string, value: string | undefined): void {
  opened.value = undefined;
  if (control === "appearance" && (value === "light" || value === "dark" || value === "system")) appearance.value = value;
  if (control === "locale" && (value === "zh-CN" || value === "en")) locale.value = value;
}
</script>
<template>
  <QuireTooltipRoot v-for="control in switches" :key="control.id" :trigger-id="`menu:${id}-${control.id}:trigger`"
    :disabled="opened === control.id" :open-delay="420" placement="bottom">
    <QuireMenu :id="`${id}-${control.id}`" :aria-label="control.label" :items="control.items" :open="opened === control.id"
      :lang="locale" placement="bottom-end" min-width="128px" @update:open="opened = $event ? control.id : undefined" @select="select(control.id, $event)">
      <template #trigger><QuireTooltipTrigger as-child>
        <QuireIconButton :label="control.label" variant="ghost" size="sm"><QuireIcon :name="control.icon" :size="16" /></QuireIconButton>
      </QuireTooltipTrigger></template>
    </QuireMenu>
    <QuireTooltipContent :content="`${control.label}: ${control.choices.find(choice => choice.value === control.current)?.label}`" />
  </QuireTooltipRoot>
</template>
