<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { computed, ref, watch } from "vue";
import { EditorUIColorButton } from "@quirekit/editor-ui/vue";
import type { QuireKitToolbarRendererScope } from "@quirekit/ui/vue";
import { defaultHorizontalRuleStyle } from "@quirekit/extension-horizontal-rule";
import { captureBlockRule, changeBlockRule } from "../../rule/commands";
import type { BlockRuleContext, BlockRuleTarget } from "../../rule/types";

const { t } = useBlockLocale();
const props = defineProps<{ /** Public object toolbar renderer context. */ scope: QuireKitToolbarRendererScope }>();
const context = computed(() => props.scope.context as BlockRuleContext);
const draft = ref(context.value.target.node.attrs.color as string);
const recent = ref<string[]>([]);
let source: BlockRuleTarget | null = null;
watch(() => props.scope.expanded, open => { if (open) { source = context.value.target; draft.value = source.node.attrs.color; } });
watch(() => context.value.target.node.attrs.color, value => { if (!props.scope.expanded) draft.value = value; });
/** @param color - Explicit color commit; reject a popup whose original target changed. */
function commit(color: string): void {
  if (source && changeBlockRule(context.value.editor, source, { color })) {
    source = captureBlockRule(context.value.editor);
    recent.value = [color, ...recent.value.filter(value => value !== color)].slice(0, 8);
  }
}
/** Applies the current color from the split button without requiring its popup. */
function apply(): void { source = context.value.target; commit(draft.value); }
</script>
<template>
  <EditorUIColorButton :scope="scope" :disclosure-label="t('分隔线颜色选项')" :color="draft"
    :reset-active="context.target.node.attrs.color === defaultHorizontalRuleStyle.color" :recent-colors="recent" :picker-props="{ resetLabel: t('默认颜色') }"
    @preview="draft = $event" @commit="commit" @action="apply" @reset="commit(defaultHorizontalRuleStyle.color)" />
</template>
