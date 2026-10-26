<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { QuireButton, QuireIcon, QuireIconButton } from "@quirekit/ui/vue";
import type { Editor } from "@quirekit/core";
import type { BlockContainerState, BlockContainerSurface } from "../../containers/types";
import { blockContainerLabels } from "../../containers/attributes";
import { useBlockContainerScope } from "./state";

const { t } = useBlockLocale();
const props = defineProps<{
  /** Document owner. */ editor: Editor;
  /** Live retained owner. */ surface: BlockContainerSurface;
  /** Header state only. */ state: BlockContainerState;
}>();
const scope = useBlockContainerScope(props.editor);
/** @param mode - User-chosen header task. */
function open(mode: "settings" | "emoji"): void { const position = props.surface.position(); if (position !== undefined) scope.open(position, mode); }
</script>
<template>
  <QuireIconButton v-if="state.kind === 'details'" size="sm" variant="ghost" :label="t('{action}：{title}', { action: state.expanded ? t('收起') : t('展开'), title: state.title || t('详细内容') })" :aria-expanded="state.expanded" @pointerdown.prevent @click="surface.toggle()">
    <QuireIcon :name="state.expanded ? 'chevronDown' : 'chevronRight'" />
  </QuireIconButton>
  <template v-if="state.kind === 'highlight'">
    <QuireButton v-if="state.editable" variant="ghost" size="xs" class="qk-prose-highlight-icon" :aria-label="t('更换高亮块表情')" @pointerdown.prevent @click="open('emoji')">{{ state.emoji || '＋' }}</QuireButton>
    <span v-else class="qk-prose-highlight-icon" aria-hidden="true">{{ state.emoji }}</span>
  </template>
  <span v-else class="qk-block-container__title">{{ state.title || t(blockContainerLabels[state.kind]) }}</span>
  <QuireIconButton v-if="state.editable" size="xs" variant="ghost" :label="t('容器设置')" class="qk-block-container__settings" @pointerdown.prevent @click="open('settings')"><QuireIcon name="moreHorizontal" /></QuireIconButton>
</template>
