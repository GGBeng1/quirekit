<script setup lang="ts">
import { computed } from "vue";
import { normalizeLetterSpacing } from "@quirekit/extension-text-style";
import { underlineStyles } from "@quirekit/extension-underline";
import { QuireButton, QuireCheckbox, QuireColorPicker, QuireCombobox, QuireField, QuireIcon,
  QuireInputNumberUnit, QuireInspectorSection, QuireSelect, QuireToolbar, QuireToolbarToggle } from "@quirekit/ui/vue";
import type { ClassicEditorRenderContext } from "@classic/types";
import { classicHighlightPaletteRows, resolveClassicHighlightHex } from "@classic/extensions/typography/highlight-palette";
import { highlightColorName } from "./copy";
import { useTextPanel } from "./use";
import { textEffects } from "./effects/projection";
import { hasTextEffectCommand } from "./effects/commands";
import FontField from "./font.vue";
import { EditorUIUnderlineGallery as UnderlineGallery } from "@quirekit/editor-ui/vue";
import CharacterGridPanel from "./grid/panel.vue";
const props = defineProps<{
  /** Retained product context. */
  context: ClassicEditorRenderContext;
}>();
const { context, editor, disabled, message, value, size, scale, setScale, run, setSize, setColor, setHighlight, setUnderlineColor, setUnderline, setEmphasis, effects, setEffect, hidden, setHidden, characterGrid, canSetCharacterGrid, setCharacterGrid } = useTextPanel(() => props.context);
const formats = [
  { key: 'bold', icon: 'bold', command: () => editor.commands.toggleBold() },
  { key: 'italic', icon: 'italic', command: () => editor.commands.toggleItalic() },
  { key: 'strike', icon: 'strike', command: () => editor.commands.toggleStrike() },
  { key: 'doubleStrike', icon: 'doubleStrike', command: () => editor.commands.toggleDoubleStrike() },
  { key: 'superscript', icon: 'superscript', command: () => editor.commands.toggleSuperscript() },
  { key: 'subscript', icon: 'subscript', command: () => editor.commands.toggleSubscript() }
] as const;
const underlineItems = computed(() => underlineStyles.map(style => ({ value: style, label: message(style) })));
const underlineValue = computed(() => { const style = value('underline', 'underlineType', 'none'); return typeof style === 'string' ? [style] : []; });
const emphasisItems = computed(() => (['none', 'underDot', 'dot', 'circle', 'comma'] as const).map(style => ({ value: style, label: message(style) })));
const sizes = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72].map(points => ({ value: String(points), label: String(points) }));
/** @param key - Color field. @returns RGB string or automatic fallback. */
function color(key: 'color' | 'underline'): string { const result = value(key === 'underline' ? 'underline' : 'textStyle', 'color'); return typeof result === 'string' ? result : '#000000'; }
/** @param key - Color field. @returns Visible automatic, mixed or RGB state. */
function colorLabel(key: 'color' | 'underline'): string {
  const result = value(key === 'underline' ? 'underline' : 'textStyle', 'color');
  return result === undefined ? message('mixed') : result === null ? message('automatic') : String(result);
}
/** Current highlight: palette color, null for none, undefined for a mixed selection. */
const highlight = computed(() => {
  const token = value('highlight', 'color');
  return token === undefined ? undefined : resolveClassicHighlightHex(token);
});
const highlightLabel = computed(() => {
  const token = value('highlight', 'color');
  return token === undefined ? message('mixed') : highlight.value === null ? message('none') : highlightColorName(context.value.locale, String(token));
});
const spacing = computed(() => {
  const result = value('textStyle', 'letterSpacing', '0pt');
  const normalized = normalizeLetterSpacing(result);
  return normalized === null ? null : Number.parseFloat(normalized);
});
/** @param key - Effect field. @param enabled - Requested switch. */
function setCase(key: 'allCaps' | 'smallCaps', enabled: boolean): void {
  run(() => key === 'allCaps' ? enabled ? editor.commands.setAllCaps() : editor.commands.unsetAllCaps()
    : enabled ? editor.commands.setSmallCaps() : editor.commands.unsetSmallCaps());
}
/** @param input - Signed point value. */
function setSpacing(input: string): void { if (input.trim() && Number.isFinite(Number(input))) run(() => editor.commands.setLetterSpacing(`${Number(input)}pt`)); }
</script>
<template>
  <div class="qk-classic-text" :aria-label="message('title')">
    <QuireInspectorSection :title="message('fonts')">
      <div class="qk-classic-text__fields">
        <FontField :context="context" target="eastAsia" /><FontField :context="context" target="latin" />
          <QuireField v-slot="{ controlProps }" width="100%" :label="message('size')" :disabled="disabled"><QuireCombobox v-bind="controlProps" :label="message('size')" size="sm" width="100%" :clearable="false" allow-custom-value
            :show-search-icon="false" :model-value="size === null ? null : String(size)" :placeholder="message('mixed')" :items="sizes" @update:model-value="setSize" /></QuireField>
          <div class="qk-classic-text__color-row"><span>{{ message('color') }}</span><span class="qk-classic-text__color-value">{{ colorLabel('color') }}
            <QuireColorPicker :label="message('color')" :model-value="color('color')" :reset-label="message('automatic')" :reset-active="value('textStyle', 'color') === null"
              :disabled="disabled" :show-alpha="false" :show-eyedropper="false" @commit="setColor" @reset="setColor(null)" /></span></div>
          <div v-if="editor.schema.marks.highlight" class="qk-classic-text__color-row"><span>{{ message('highlight') }}</span><span class="qk-classic-text__color-value">{{ highlightLabel }}
            <QuireColorPicker :label="message('highlight')" :model-value="highlight ?? '#FFFF00'" :colors="classicHighlightPaletteRows" :show-more="false"
              :reset-label="message('noColor')" :reset-active="highlight === null" :disabled="disabled" :show-alpha="false" :show-eyedropper="false"
              @commit="setHighlight" @reset="setHighlight(null)" /></span></div>
        <QuireToolbar :label="message('formatting')" align="start" preserve-focus>
          <QuireToolbarToggle v-for="format in formats" :key="format.key" :label="message(format.key)" :disabled="disabled || !editor.commands[('toggle' + format.key[0]!.toUpperCase() + format.key.slice(1)) as 'toggleBold']"
            :model-value="value(format.key) === undefined || value(format.key) === 'mixed' ? 'mixed' : value(format.key) === true" @update:model-value="run(format.command)"><span v-if="format.key === 'doubleStrike'" class="qk-classic-text__double-strike">ab</span><QuireIcon v-else :name="format.icon" /></QuireToolbarToggle>
        </QuireToolbar>
      </div>
    </QuireInspectorSection>
    <QuireInspectorSection v-if="editor.schema.marks.underline" :title="message('underline')" :status-text="underlineItems.find(item => underlineValue.includes(item.value))?.label ?? message('mixed')">
      <div class="qk-classic-text__fields">
        <UnderlineGallery :locale="context.locale" :model-value="underlineValue" :disabled="disabled" @select="setUnderline" />
        <div class="qk-classic-text__color-row"><span>{{ message('underlineColor') }}</span>
          <span class="qk-classic-text__color-value">{{ colorLabel('underline') }}<QuireColorPicker :label="message('underlineColor')" :model-value="color('underline')" :disabled="disabled || underlineValue.includes('none')" :reset-label="message('automatic')"
            :reset-active="value('underline', 'color') === null" :show-alpha="false" :show-eyedropper="false" @commit="setUnderlineColor" @reset="setUnderlineColor(null)" /></span></div>
      </div>
    </QuireInspectorSection>
    <QuireInspectorSection v-if="typeof editor.commands.setEmphasisMark === 'function'" :title="message('emphasis')">
      <QuireSelect :label="message('emphasis')" size="sm" width="100%" :disabled="disabled" :model-value="value('textStyle', 'emphasisMark', 'none') as string ?? ''"
        :placeholder="message('mixed')" :items="emphasisItems" @update:model-value="setEmphasis" />
    </QuireInspectorSection>
    <QuireInspectorSection :title="message('effects')">
      <div class="qk-classic-text__fields">
        <div class="qk-classic-text__effects">
          <QuireCheckbox v-for="key in textEffects" :key="key" :label="message(key)" :disabled="disabled || !hasTextEffectCommand(editor, key)"
            :checked="effects[key] === undefined ? 'indeterminate' : effects[key]" @update:checked="setEffect(key, $event === true)" />
        </div>
        <QuireCheckbox v-for="key in ['allCaps', 'smallCaps'] as const" :key="key" :label="message(key)" :disabled="disabled"
          :checked="value('textStyle', key, false) === undefined ? 'indeterminate' : value('textStyle', key, false) === true" @update:checked="setCase(key, $event === true)" />
        <QuireCheckbox v-if="typeof editor.commands.setHiddenText === 'function'" :label="message('hidden')" :description="message('hiddenDescription')" :disabled="disabled"
          :checked="hidden === undefined ? 'indeterminate' : hidden" @update:checked="setHidden($event === true)" />
        <QuireField v-if="typeof editor.commands.setTextScale === 'function'" v-slot="{ controlProps }" width="100%" :label="message('scale')" :description="message('scaleDescription')" :disabled="disabled" :mixed="scale === null" :mixed-text="message('mixed')">
          <QuireInputNumberUnit v-bind="controlProps" :label="message('scale')" :unit-label="message('unit')"
            :model-value="scale" unit="percent" :units="[{ value: 'percent', label: '%' }]" :min="1" :max="600" :precision="0" :step="1"
            @update:model-value="$event !== null && setScale($event)" />
        </QuireField>
        <QuireButton v-if="typeof editor.commands.unsetTextScale === 'function'" size="sm" variant="ghost" :disabled="disabled" @click="setScale(null)">{{ message('restoreScale') }}</QuireButton>
        <QuireField v-slot="{ controlProps }" width="100%" :label="message('spacing')" :disabled="disabled" :mixed="spacing === null" :mixed-text="message('mixed')"><QuireInputNumberUnit v-bind="controlProps" :label="message('spacing')" :unit-label="message('unit')"
          :model-value="spacing" unit="pt" :units="[{ value: 'pt', label: context.locale === 'zh-CN' ? '磅' : 'pt' }]" :step="0.1"
          @update:model-value="$event !== null && setSpacing(String($event))" /></QuireField>
      </div>
    </QuireInspectorSection>
    <CharacterGridPanel v-if="editor.schema.marks.textStyle?.spec.attrs?.characterGrid" :locale="context.locale"
      :checked="characterGrid" :disabled="disabled || !canSetCharacterGrid(characterGrid !== true)"
      :can-restore="value('textStyle', 'characterGrid') !== null" @change="setCharacterGrid" />
  </div>
</template>
<style scoped>
.qk-classic-text__double-strike { text-decoration: line-through double; font-size: var(--qk-type-helper-font-size); }
.qk-classic-text__fields { display: grid; gap: var(--qk-space-surface-compact); }
.qk-classic-text__effects { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--qk-space-surface-compact); }
.qk-classic-text__color-row { display: flex; justify-content: space-between; align-items: center; gap: var(--qk-space-inline); font-size: var(--qk-type-helper-font-size); }
.qk-classic-text__color-value { display: inline-flex; align-items: center; gap: var(--qk-space-inline); }
</style>
