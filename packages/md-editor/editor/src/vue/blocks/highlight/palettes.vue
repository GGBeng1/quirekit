<script setup lang="ts">
import { computed } from "vue";
import { QuireToggleGroup } from "@quirekit/ui/vue";
import { withSourceOperation, type SourceBlockControls } from "@quirekit/msfe-core";
import { highlightColors } from "../../../highlight/attributes";
import { updateMdHighlight } from "../../../highlight/commands";
import type { MdHighlightAttributes, MdHighlightColor } from "../../../highlight/types";
import type { MdEditorLocale } from "../../types";
import { blockLabels } from "../labels";
const props = defineProps<{
  /** Exact captured highlight block. */ controls: SourceBlockControls;
  /** Effective attributes read from its opening line. */ current: MdHighlightAttributes;
  /** Product language. */ locale: MdEditorLocale;
}>();
const emit = defineEmits<{ /** Successful color change. */ close: [] }>();
const text = computed(() => blockLabels(props.locale));
const surfaces = computed(() => highlightColors.map(color => ({ value: color, label: text.value.surfaces[color] })));
const inks = computed(() => [{ value: "default", label: text.value.defaultInk }, ...highlightColors.map(color => ({ value: color, label: text.value.inks[color] }))]);
/** @param change - One palette field; the guarded command rewrites only the opening line. */
function apply(change: Partial<MdHighlightAttributes>): void {
  if (props.controls.run(withSourceOperation(updateMdHighlight(props.controls.block.from, change, true), { kind: "md.highlight.color", facts: { ...change } }))) { emit("close"); props.controls.focus(); }
}
</script>
<template>
  <div class="md-highlight-colors" data-qk-prose-highlight-colors @keydown.stop>
    <p class="md-highlight-colors__title">{{ text.surface }}</p>
    <QuireToggleGroup :label="text.surface" :items="surfaces" :model-value="[current.color]" :deselectable="false" :columns="6" size="sm"
      @update:model-value="$event[0] && apply({ color: $event[0] as MdHighlightColor })">
      <template #item="{ item }"><span class="qk-prose-highlight-swatch md-highlight-colors__surface" :data-qk-prose-highlight="item.value" /></template>
    </QuireToggleGroup>
    <p class="md-highlight-colors__title">{{ text.ink }}</p>
    <QuireToggleGroup :label="text.ink" :items="inks" :model-value="[current.text ?? 'default']" :deselectable="false" :columns="7" size="sm"
      @update:model-value="$event[0] && apply({ text: $event[0] === 'default' ? undefined : $event[0] as MdHighlightColor })">
      <template #item="{ item }"><span class="qk-prose-highlight-swatch md-highlight-colors__ink" :data-qk-prose-highlight-text="item.value === 'default' ? undefined : item.value">A</span></template>
    </QuireToggleGroup>
  </div>
</template>
<style scoped>
.md-highlight-colors { display: grid; gap: var(--qk-space-inline); padding: var(--qk-space-inline); }
.md-highlight-colors__title { margin: 0; font-size: var(--qk-type-helper-font-size); line-height: var(--qk-type-helper-line-height); color: var(--qk-color-text-secondary); }
.md-highlight-colors__surface { display: block; width: 18px; height: 18px; border-radius: var(--qk-radius-control); border: var(--qk-border-width-default) solid var(--qk-prose-highlight-edge); background: var(--qk-prose-highlight-surface); }
.md-highlight-colors__ink { font-weight: var(--qk-type-heading-font-weight); }
</style>
