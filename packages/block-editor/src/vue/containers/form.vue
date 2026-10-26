<script setup lang="ts">
import { useBlockLocale } from "../localization/use-locale";
import { ref, computed } from "vue";
import { QuireField, QuireInput, QuireSelect, QuireToggleGroup, QuireButton } from "@quirekit/ui/vue";
import type { BlockContainerAttributes } from "../../containers/types";
import { blockContainerKinds, blockContainerLabels, blockContainerColors } from "../../containers/attributes";
import type { BlockContainerTarget, BlockContainerDraft } from "./types";

const { t, localize } = useBlockLocale();
const props = defineProps<{ /** Frozen canonical source. */ target: BlockContainerTarget }>();
const emit = defineEmits<{ apply: [attrs: BlockContainerAttributes]; cancel: []; unwrap: []; remove: [] }>();
const { kind, title, emoji, color, textColor } = props.target.node.attrs as BlockContainerAttributes;
const value = ref<BlockContainerDraft>({ kind, title, emoji, color, textColor });
const kinds = blockContainerKinds.map(kind => ({ value: kind, label: blockContainerLabels[kind] }));
const names = { orange: "橙色", red: "红色", green: "绿色", blue: "蓝色", purple: "紫色", gray: "灰色" };
const backgrounds = computed(() => blockContainerColors.map(color => ({ value: color, label: t("{color}背景", { color: t(names[color]) }) })));
const inks = computed(() => [{ value: "default", label: "默认文字" }, ...blockContainerColors.map(color => ({ value: color, label: t("{color}文字", { color: t(names[color]) }) }))]);
const composing = ref(false);
</script>
<template>
  <form class="qk-block-container-form" @submit.prevent="!composing && emit('apply', value)" @compositionstart="composing = true" @compositionend="composing = false"
    @keydown.enter.capture="($event.isComposing || composing) && $event.preventDefault()">
    <QuireField :label="t('块样式')" v-slot="field"><QuireSelect v-bind="field.controlProps" :label="t('块样式')" v-model="value.kind" :items="localize(kinds)" /></QuireField>
    <QuireField v-if="value.kind !== 'highlight'" :label="t('标题')" v-slot="field"><QuireInput v-bind="field.controlProps" v-model="value.title" :placeholder="t('输入标题，留空显示“{title}”', { title: t(blockContainerLabels[value.kind]) })" :maxlength="240" autofocus /></QuireField>
    <template v-else>
      <p class="qk-type-helper">{{ t("背景色") }}</p>
      <QuireToggleGroup :label="t('背景色')" :items="localize(backgrounds)" :model-value="[value.color]" :deselectable="false" :columns="6" size="sm" @update:model-value="$event[0] && (value.color = $event[0] as BlockContainerAttributes['color'])">
        <template #item="{ item }"><span class="qk-prose-highlight-swatch qk-block-container-swatch" :data-qk-prose-highlight="item.value" /></template>
      </QuireToggleGroup>
      <p class="qk-type-helper">{{ t("文字颜色") }}</p>
      <QuireToggleGroup :label="t('文字颜色')" :items="localize(inks)" :model-value="[value.textColor ?? 'default']" :deselectable="false" :columns="7" size="sm" @update:model-value="$event[0] && (value.textColor = $event[0] === 'default' ? null : $event[0] as BlockContainerAttributes['textColor'])">
        <template #item="{ item }"><span class="qk-prose-highlight-swatch" :data-qk-prose-highlight-text="item.value === 'default' ? undefined : item.value">A</span></template>
      </QuireToggleGroup>
    </template>
    <div class="qk-block-container-form__actions">
      <QuireButton variant="ghost" @click="emit('unwrap')">{{ t("移出容器") }}</QuireButton><QuireButton variant="ghost" @click="emit('remove')">{{ t("删除块") }}</QuireButton>
      <QuireButton variant="ghost" @click="emit('cancel')">{{ t("取消") }}</QuireButton><QuireButton type="submit" color="primary" variant="solid">{{ t("确认") }}</QuireButton>
    </div>
  </form>
</template>
