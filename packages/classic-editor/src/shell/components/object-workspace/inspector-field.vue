<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { QuireField, QuireInput, QuireInputNumber, QuireSelect, QuireSegmented, QuireCheckbox, QuireButton, QuireColorPicker } from "@quirekit/ui/vue";
import { resolveClassicEditorText } from "@classic/localization";
import type { ClassicEditorObjectInspectorField, ClassicEditorObjectWorkspaceController } from "@classic/types/object-workspace";
import { resolveObjectWorkspaceMessages } from "./localization";

/** Product projection; the feature controller remains the only commit authority. */
interface Props {
  /** Exact-target controller. */
  readonly controller: ClassicEditorObjectWorkspaceController;
  /** Live feature-owned field contract. */
  readonly field: ClassicEditorObjectInspectorField;
  /** Snapshot revision invalidating stale drafts. */
  readonly revision: number;
}
const props = defineProps<Props>();
const draft = ref(props.field.value);
const edited = ref(false);
const locale = computed(() => props.controller.context.locale);
const messages = computed(() => resolveObjectWorkspaceMessages(locale.value));
const label = computed(() => resolveClassicEditorText(props.field.label, locale.value));
const choices = computed(() => (props.field.choices ?? []).map(choice => ({ value: choice.value, label: resolveClassicEditorText(choice.label, locale.value) })));
const state = computed(() => props.controller.resolveActionState(props.field.commit, "panel", {
  fieldId: props.field.id,
  value: props.field.value,
  mixed: props.field.mixed
}));
const disabled = computed(() => state.value?.canExecute !== true);
const invalidNumber = computed(() => props.field.kind === "number" && edited.value && (
  typeof draft.value !== "number" || !Number.isFinite(draft.value)
  || (props.field.min !== undefined && draft.value < props.field.min)
  || (props.field.max !== undefined && draft.value > props.field.max)
));
const error = computed(() => invalidNumber.value ? (locale.value === "zh-CN" ? "请输入允许范围内的有效数值" : "Enter a valid number within the allowed range")
  : props.field.validation ? resolveClassicEditorText(props.field.validation.message, locale.value) : undefined);
const reason = computed(() => state.value?.reason ? resolveClassicEditorText(state.value.reason.message, locale.value) : undefined);
const numberBindings = computed(() => ({ ...(props.field.min === undefined ? {} : { min: props.field.min }),
  ...(props.field.max === undefined ? {} : { max: props.field.max }), ...(props.field.step === undefined ? {} : { step: props.field.step }) }));
watch(() => [props.field.value, props.revision] as const, ([value]) => { draft.value = value; edited.value = false; });

/**
 * Submits one valid draft through the existing feature command.
 *
 * @param value - Explicit scalar draft to submit.
 * @param allowNull - Whether null expresses a domain-owned clear action.
 * @returns Completion after the exact feature action resolves.
 */
async function submit(
  value: string | number | boolean | null,
  allowNull = false
): Promise<void> {
  if (!edited.value || (!allowNull && value === null) || disabled.value || invalidNumber.value) return;
  const field = props.field;
  const revision = props.revision;
  // Consume this draft before execution so Enter followed by blur cannot submit twice.
  edited.value = false;
  const committed = await props.controller.execute(field.commit, "panel", { fieldId: field.id, value });
  if (!committed && props.field === field && props.revision === revision && draft.value === value) edited.value = true;
}

/** @returns Completion after submitting the current non-null scalar draft. */
function commit(): Promise<void> {
  return submit(draft.value);
}
/** @param value - New text, numeric projection or selection; no implicit default replaces an empty value. */
function update(value: string | number | boolean | null): void { draft.value = value; edited.value = true; }
/** @param value - Explicit choice or toggle value committed immediately. */
function choose(value: string | boolean | null | undefined): void { if (value == null) return; update(value); void commit(); }
/** @param value - Explicit CSS color or domain-owned no-color value. */
function chooseColor(value: string | null): void {
  update(value);
  void submit(value, true);
}
/** Restores the domain default using the separate feature reset action. */
async function reset(): Promise<void> {
  if (props.field.reset) await props.controller.execute(props.field.reset, "panel", { fieldId: props.field.id });
}
</script>

<template>
  <QuireField :label="label" width="100%" :disabled="disabled" :invalid="!!error" :mixed="field.mixed"
    :mixed-text="messages.mixed" v-bind="{ ...(error ? { errorText: error } : {}), ...(reason ? { disabledReason: reason } : {}) }"
    :data-field-kind="field.kind" :data-mixed="field.mixed || undefined">
    <template v-if="field.reset" #meta>
      <QuireButton size="xs" :disabled="controller.resolveActionState(field.reset, 'panel')?.canExecute !== true" @click="reset">{{ messages.reset }}</QuireButton>
    </template>
    <template #default="{ controlProps }">
      <QuireInput v-if="field.kind === 'text'" v-bind="controlProps" width="100%"
        :model-value="typeof draft === 'string' ? draft : ''" :placeholder="field.mixed ? '—' : undefined" @update:model-value="update" @change="commit" />
      <div v-else-if="field.kind === 'number'" class="qk-classic-object-field-number">
        <QuireInputNumber v-bind="{ ...controlProps, ...numberBindings }" :label="label" width="100%"
          :model-value="typeof draft === 'number' && Number.isFinite(draft) ? String(draft) : ''" :clamp-value-on-blur="false" :placeholder="field.mixed ? '—' : undefined"
          @value-change="update($event.value === '' ? null : $event.valueAsNumber)" @focus-change="!$event.focused && commit()" @keydown.enter="commit" />
        <span v-if="field.unit">{{ resolveClassicEditorText(field.unit, locale) }}</span>
      </div>
      <QuireSegmented v-else-if="field.kind === 'choice' && choices.length <= 3" :items="choices" :label="label" :disabled="disabled"
        :model-value="typeof draft === 'string' && !field.mixed ? draft : null" @update:model-value="choose" />
      <QuireSelect v-else-if="field.kind === 'choice'" :items="choices" :label="label" :disabled="disabled" width="100%" border="subtle"
        :model-value="typeof draft === 'string' ? draft : ''" :placeholder="field.mixed ? messages.mixed : undefined"
        :content-props="{ lang: locale }" @update:model-value="choose" />
      <QuireColorPicker v-else-if="field.kind === 'color'" :label="label" size="sm"
        :model-value="typeof draft === 'string' ? draft : '#FFFFFF'" :reset-active="!field.mixed && draft === null"
        :disabled="disabled" :show-alpha="false" :portal-target="controller.context.root"
        :content-attributes="{ lang: locale, 'data-object-color-field': field.id }"
        :reset-label="field.colorResetLabel
          ? resolveClassicEditorText(field.colorResetLabel, locale)
          : locale === 'zh-CN' ? '无颜色' : 'No color'"
        @commit="chooseColor" @reset="chooseColor(null)" />
      <QuireCheckbox v-else :label="label" :disabled="disabled" :checked="field.mixed ? 'indeterminate' : draft === true"
        @update:checked="choose($event === true)" />
    </template>
  </QuireField>
</template>
