<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed, markRaw } from "vue";
import type { Editor } from "@quirekit/core";
import { EditorUIAnchoredOverlay, EditorUIObjectToolbar } from "@quirekit/editor-ui/vue";
import { horizontalRulePresets, type HorizontalRuleStyleInput } from "@quirekit/extension-horizontal-rule";
import type { QuireKitToolbarEntry, QuireKitToolbarOpenChangeEvent } from "@quirekit/ui";
import { changeBlockRule } from "../../rule/commands";
import type { BlockRuleTarget } from "../../rule/types";
import { useBlockRuleContext } from "./context";
import RuleColor from "./color.vue";
import { blockRulePresetLabels as labels } from "../../rule/presets";

const { t, localize } = useBlockLocale();
const props = defineProps<{ /** Canonical document session. */ editor: Editor }>();
const { target, anchor, measure } = useBlockRuleContext(props.editor);
const renderers = { color: markRaw(RuleColor) };
let source: BlockRuleTarget | null = null;
const items = computed<readonly QuireKitToolbarEntry[]>(() => [
  { value: "style", label: "分隔线样式", text: "样式", icon: "horizontalRule", kind: "menu", trigger: "disclosure",
    items: horizontalRulePresets.map(preset => ({ value: `preset:${preset.id}`, label: labels[preset.id] ?? preset.label })) },
  { value: "thickness", label: "分隔线粗细", text: t("{value} 磅", { value: target.value?.node.attrs.thicknessPt ?? 1.5 }), kind: "menu", trigger: "disclosure",
    items: [0.25, 0.75, 1.5, 3, 4.5, 6].map(value => ({ value: `thickness:${value}`, label: t("{value} 磅", { value }) })) },
  { value: "width", label: "分隔线宽度", text: `${target.value?.node.attrs.widthPercent ?? 100}%`, kind: "menu", trigger: "disclosure",
    items: [25, 50, 75, 100].map(value => ({ value: `width:${value}`, label: `${value}%` })) },
  { value: "alignment", label: "分隔线对齐", icon: "alignCenter", kind: "menu", trigger: "disclosure", items: [
    { value: "align:left", label: "左对齐", icon: "alignLeft" }, { value: "align:center", label: "居中", icon: "alignCenter" }, { value: "align:right", label: "右对齐", icon: "alignRight" }
  ] },
  { value: "color", label: "分隔线颜色", icon: "textColor", iconAccentColor: target.value?.node.attrs.color, kind: "custom", renderer: "color", popup: "dialog" },
  { value: "delete", label: "删除分隔线", icon: "trash2" }
]);
/** @param event - Public menu lifecycle; freeze the exact source before native focus moves. */
function opened(event: QuireKitToolbarOpenChangeEvent): void { if (event.expanded) source = target.value; }
/** @param value - Public object-toolbar action, sharing Classic's canonical presets and update command. */
function execute(value: string): void {
  const current = value === "delete" ? target.value : source;
  if (!current) return;
  let style: HorizontalRuleStyleInput | null;
  if (value === "delete") style = null;
  else if (value.startsWith("preset:")) { const preset = horizontalRulePresets.find(item => item.id === value.slice(7)); if (!preset) return; style = preset.style; }
  else if (value.startsWith("thickness:")) style = { thicknessPt: Number(value.slice(10)) };
  else if (value.startsWith("width:")) style = { widthPercent: Number(value.slice(6)) };
  else if (value.startsWith("align:")) style = { alignment: value.slice(6) as "left" | "center" | "right" };
  else return;
  changeBlockRule(props.editor, current, style);
}
</script>
<template>
  <EditorUIAnchoredOverlay :show="!!target" :anchor="anchor" :resolve-anchor="measure" placement="top-start" layer="chrome">
    <EditorUIObjectToolbar v-if="target" :key="target.pos" :label="t('分隔线快捷工具')" :items="localize(items)" :renderers="renderers" :context="{ editor, target }" @execute="execute($event.value)" @open-change="opened" />
  </EditorUIAnchoredOverlay>
</template>
