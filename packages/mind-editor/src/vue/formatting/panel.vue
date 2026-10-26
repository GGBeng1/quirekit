<script setup lang="ts">
import { useMindEditorMessages } from "../messages";
import { computed, shallowRef, watch } from "vue";
import { QuireButton, QuireColorPicker, QuireIcon, QuireIconButton, QuireSelect } from "@quirekit/ui/vue";
import { applyMindMapTheme, mindMapThemes } from "@quirekit/mind-map";
import type { MindMapThemeId, MindMapFormatting, MindMapNodeStyle, MindMapStylePatch } from "@quirekit/mind-map";
import type { MindEditorFormattingProps } from "./types";
import { mindStyleColors, mindStyleSelectors } from "../../ui/formatting/fields";
import type { MindStyleSelectField } from "../../ui/formatting/types";

const { t } = useMindEditorMessages();
const props = defineProps<MindEditorFormattingProps>();
const emit = defineEmits<{ /** Close intent. */ close: []; /** Active command failure. */ error: [reason: unknown] }>();
const selectors = computed(() => mindStyleSelectors(t));
const colors = computed(() => mindStyleColors(t));
const themeKeys = { blue: "themeBlue", slate: "themeSlate", ink: "themeInk", coral: "themeCoral", ocean: "themeOcean", forest: "themeForest", amber: "themeAmber", violet: "themeViolet", spectrum: "themeSpectrum" } as const;
const themeDisabled = computed(() => props.state.readOnly || props.state.busy || props.state.composing);
/** @param id - Shared headless theme. @returns One undoable full-source appearance change. */
async function applyTheme(id: MindMapThemeId): Promise<void> {
  if (themeDisabled.value) return;
  try { await props.editor.replaceDocument(applyMindMapTheme(await props.editor.getDocument(), id)); } catch (reason) { emit("error", reason); }
}
const values = shallowRef<MindMapFormatting>({});
const disabled = computed(() => props.state.readOnly || props.state.busy || props.state.composing || !props.state.selectedCount);

// Selection identity and source are the only property dependencies. Viewport frames
// never read the vendor tree, and a closed panel owns no formatting subscription.
watch([() => props.editor, () => props.version, () => props.state.selectionVersion, () => props.state.busy, () => props.state.composing], () => {
  if (props.state.busy || props.state.composing) return;
  try { values.value = props.editor.getFormatting(); } catch (reason) { emit("error", reason); }
}, { immediate: true });

/** @param patch - Explicit field update or reset. @returns Completion without stealing panel focus. */
async function apply(patch: MindMapStylePatch | null): Promise<void> {
  if (disabled.value) return;
  try { await props.editor.format(patch); } catch (reason) { emit("error", reason); }
}
/** @param key - Canonical field. @returns Shared selector value, retaining mixed state as an empty placeholder. */
function selected(key: keyof MindMapNodeStyle): string {
  const value = values.value[key]; return value === undefined ? "default" : value === null ? "" : String(value);
}
/** @param field - Property selector. @returns Presets plus any valid imported explicit numeric value. */
function choices(field: MindStyleSelectField) {
  const value = selected(field.key);
  return value && !field.items.some(item => item.value === value)
    ? [...field.items, { value, label: `${value} px` }] : field.items;
}
/** @param key - Canonical field. @param value - Admitted selector choice. */
function choose(key: keyof MindMapNodeStyle, value: string | undefined): void {
  if (!value) return;
  const scalar = value === "default" ? null : key === "bold" ? value === "true"
    : ["fontSize", "borderWidth", "lineWidth"].includes(key) ? Number(value) : value;
  void apply({ [key]: scalar });
}
/** @param event - Panel-local keys; native IME retains Escape. */
function keydown(event: KeyboardEvent): void {
  event.stopPropagation();
  if (event.key === "Escape" && !event.isComposing && event.keyCode !== 229) { event.preventDefault(); emit("close"); }
}
</script>

<template>
  <aside class="qk-mind-editor__formatting" :aria-label="t('formatTopic')" @keydown="keydown">
    <header class="qk-mind-editor__outline-header"><strong>{{ t('formatTopic') }}</strong><QuireIconButton :label="t('closeFormat')" variant="ghost" size="sm" @click="emit('close')"><QuireIcon name="close" /></QuireIconButton></header>
    <section class="qk-mind-editor__themes" :aria-label="t('wholeTheme')">
      <strong>{{ t('wholeTheme') }}</strong><p class="qk-mind-editor__outline-note">{{ t('themeHelp') }}</p>
      <div class="qk-mind-editor__theme-grid"><QuireButton v-for="item in mindMapThemes" :key="item.id" variant="outline" size="sm" :disabled="themeDisabled" @click="applyTheme(item.id)">
        <span class="qk-mind-editor__theme-swatches" aria-hidden="true"><i v-for="(color, index) in item.colors.slice(0, 4)" :key="index" :style="{ background: color }"></i></span>{{ t(themeKeys[item.id]) }}
      </QuireButton></div>
    </section>
    <p class="qk-mind-editor__outline-note">{{ state.selectedCount ? t('selectedCount', { count: state.selectedCount }) : t('selectTopics') }}{{ state.readOnly ? ` · ${t('readOnly')}` : '' }}</p>
    <div class="qk-mind-editor__formatting-fields">
      <div v-for="field in selectors.slice(0, 4)" :key="field.key" class="qk-mind-editor__property">
        <span>{{ field.label }}</span><QuireSelect :label="field.label" :model-value="selected(field.key)" :placeholder="t('mixed')" :items="choices(field)" :disabled="disabled" width="150px" @value-change="choose(field.key, $event)" />
      </div>
      <div v-for="field in colors" :key="field.key" class="qk-mind-editor__property">
        <span>{{ field.label }}</span><span class="qk-mind-editor__property-color">
          <small>{{ values[field.key] === null ? t('mixed') : values[field.key] === undefined ? t('themeDefault') : values[field.key] === 'transparent' ? t('transparent') : values[field.key] }}</small>
          <QuireColorPicker :label="field.label" :model-value="values[field.key] && values[field.key] !== 'transparent' ? values[field.key]! : field.fallback"
            :disabled="disabled" :show-alpha="false" :reset-label="t('resetColor')" :reset-active="values[field.key] === undefined" @commit="apply({ [field.key]: $event })" @reset="apply({ [field.key]: null })" />
        </span>
      </div>
      <QuireButton variant="ghost" size="sm" :disabled="disabled" @click="apply({ fill: 'transparent' })">{{ t('transparentFill') }}</QuireButton>
      <div v-for="field in selectors.slice(4)" :key="field.key" class="qk-mind-editor__property">
        <span>{{ field.label }}</span><QuireSelect :label="field.label" :model-value="selected(field.key)" :placeholder="t('mixed')" :items="choices(field)" :disabled="disabled" width="150px" @value-change="choose(field.key, $event)" />
      </div>
      <p class="qk-mind-editor__outline-note">{{ t('lineHelp') }}</p>
      <QuireButton variant="outline" size="sm" :disabled="disabled" @click="apply(null)">{{ t('clearFormat') }}</QuireButton>
    </div>
  </aside>
</template>
