<script setup lang="ts">
import {
  QuireButton,
  QuireDialogContent,
  QuireField,
  QuireInput
} from "@quirekit/ui/vue";
import { computed, type HTMLAttributes } from "vue";
import type {
  ClassicEditorWebFontSource,
  ClassicEditorWebFontSourceSettingField
} from "@classic/types";
import type {
  ClassicFontHubController,
  ClassicFontHubMessageResolver,
  ClassicFontHubSourceLabelResolver,
  ClassicFontHubTextResolver
} from "../types";

/** Inputs for one configured provider settings task. */
interface Props {
  /** Shared Font Hub business controller. */
  readonly hub: ClassicFontHubController;
  /** Resolved Font Hub copy. */
  readonly message: ClassicFontHubMessageResolver;
  /** Configured source label resolver. */
  readonly sourceLabel: ClassicFontHubSourceLabelResolver;
  /** Source-contributed text resolver. */
  readonly text: ClassicFontHubTextResolver;
  /** Theme and overlay ownership attributes forwarded to portalled content. */
  readonly popupProps: HTMLAttributes;
  /** Optional owner-document portal target. */
  readonly portalTarget?: HTMLElement | undefined;
}

/** Visibility events emitted by the settings task. */
interface Emits {
  /** Requests a controlled visibility change. */
  "update:open": [open: boolean];
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const source = computed(() => props.hub.sourceSettings.source.value);
const supportsSecretTextMask =
  typeof CSS !== "undefined" && CSS.supports("-webkit-text-security", "disc");

/**
 * Resolves a source-setting input type without exposing supported secret values
 * to browser credential heuristics.
 *
 * @param field - Declarative source setting field.
 * @returns Native input type used by the public input.
 */
function sourceSettingInputType(
  field: ClassicEditorWebFontSourceSettingField
): "password" | "text" {
  return field.secret && !supportsSecretTextMask ? "password" : "text";
}

/**
 * Creates native attributes that keep API keys out of autofill systems.
 *
 * @param owner - Source that owns the setting.
 * @param field - Declarative source setting field.
 * @returns Native attributes forwarded to the public input.
 */
function sourceSettingInputProps(
  owner: ClassicEditorWebFontSource,
  field: ClassicEditorWebFontSourceSettingField
) {
  return {
    autocomplete: "off",
    name: `quirekit-font-source-${owner.id}-${field.key}`,
    spellcheck: false as const,
    ...(field.secret
      ? {
          "data-1p-ignore": "true",
          "data-bwignore": "true",
          "data-form-type": "other",
          "data-lpignore": "true"
        }
      : {})
  };
}

/** Saves valid settings and closes only after a successful commit. */
function save(): void {
  if (props.hub.sourceSettings.save()) emit("update:open", false);
}
</script>

<template>
  <QuireDialogContent
    v-if="source"
    v-bind="{
      ...popupProps,
      ...(portalTarget ? { portalTarget } : {}),
      ...(hub.sourceSettings.feedbackTone.value === 'error' && hub.sourceSettings.feedback.value
        ? { errorText: hub.sourceSettings.feedback.value }
        : {})
    }"
    as="form"
    size="small"
    :title="`${message('configureFontSource')}：${sourceLabel(source)}`"
    :description="message('sourceLocalNotice')"
    @submit.prevent="save"
  >
    <div class="qk-font-hub__settings-grid">
      <QuireField
        v-for="field in source.settingFields"
        :key="field.key"
        v-slot="{ controlProps }"
        width="100%"
        :label="text(field.label)"
        :required="field.required === true"
        :invalid="hub.sourceSettings.invalidKeys.value.includes(field.key)"
        :error-text="message('fontSettingRequired')"
      >
        <QuireInput
          v-bind="{
            ...controlProps,
            ...sourceSettingInputProps(source, field)
          }"
          width="100%"
          :model-value="hub.sourceSettings.settings.value[field.key] ?? ''"
          :type="sourceSettingInputType(field)"
          size="sm"
          :class="{ 'qk-font-hub__setting-input--secret': field.secret }"
          :placeholder="field.placeholder ? text(field.placeholder) : undefined"
          @update:model-value="hub.sourceSettings.update(field.key, $event)"
        />
      </QuireField>
    </div>
    <template #footer>
      <QuireButton type="button" variant="text" @click="emit('update:open', false)">
        {{ message("cancel") }}
      </QuireButton>
      <QuireButton type="submit" color="primary" variant="solid" size="sm">
        {{ message("saveSourceSettings") }}
      </QuireButton>
    </template>
  </QuireDialogContent>
</template>
