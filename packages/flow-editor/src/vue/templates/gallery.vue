<script setup lang="ts">
import { useFlowMessages } from "../messages";
import { computed, ref, watch } from "vue";
import { QuireButton, QuireDialogContent, QuireIcon, QuireInput } from "@quirekit/ui/vue";
import type { QuireKitTheme } from "@quirekit/ui";
import type { FlowchartTemplateCategory, FlowchartTemplateId } from "../../templates/types";
import { flowchartTemplates, localizedFlowchartTemplates } from "../../templates/catalog";
import { useTemplatePreviews } from "./previews";
import "./styles.css";

const { t, locale } = useFlowMessages();
const props = defineProps<{ theme: QuireKitTheme; disabled: boolean }>();
const emit = defineEmits<{ apply: [id: FlowchartTemplateId]; close: [] }>();
const mount = ref<HTMLElement>(), query = ref(""), category = ref<FlowchartTemplateCategory | "all">("all"), selected = ref<FlowchartTemplateId | undefined>("blank"), enlarged = ref(false);
const { urls, loading, error, retry } = useTemplatePreviews(mount, () => props.theme, () => locale.value);
const categories = [{ id: "all", label: "全部" }, { id: "er", label: "ER 图" }, { id: "uml", label: "UML 类图" }, { id: "sequence", label: "时序图" }, { id: "swimlane", label: "泳道图" }, { id: "organization", label: "组织结构" }, { id: "analysis", label: "分析图" }, { id: "relationship", label: "关系组合" },
  { id: "planning", label: "时间与循环" }, { id: "architecture", label: "架构关系" }, { id: "workflow", label: "业务流程" }, { id: "data", label: "数据处理" }] as const;
const catalog = computed(() => localizedFlowchartTemplates(locale.value));
const templates = computed(() => catalog.value.filter(item => (category.value === "all" || !item.category || item.category === category.value)
  && `${item.label} ${item.description} ${item.id} ${flowchartTemplates.find(source => source.id === item.id)?.label}`.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase())));
const choice = computed(() => catalog.value.find(item => item.id === selected.value));
watch(templates, items => { if (!items.some(item => item.id === selected.value)) selected.value = items[0]?.id; });
</script>

<template>
  <QuireDialogContent :title="t('选择图表模板')" :description="t('流程、组织、关系与分析，选择一个起点继续编辑。')" size="large" class="qk-flow-templates">
    <div v-show="!enlarged" class="qk-flow-templates__filters">
      <div role="group" :aria-label="t('模板分类')" class="qk-flow-templates__categories">
        <QuireButton v-for="item in categories" :key="item.id" size="sm" :variant="category === item.id ? 'soft' : 'ghost'"
          :aria-pressed="category === item.id" @click="category = item.id">{{ t(item.label) }}</QuireButton>
      </div>
      <QuireInput v-model="query" :aria-label="t('搜索模板')" :placeholder="t('搜索模板')" clearable width="220px" />
    </div>
    <div v-show="!enlarged" class="qk-flow-templates__body">
      <div class="qk-flow-templates__catalog">
        <div class="qk-flow-templates__grid" role="group" :aria-label="t('模板列表')">
          <QuireButton v-for="item in templates" :key="item.id" variant="ghost" :aria-label="item.label" :aria-pressed="selected === item.id"
            class="qk-flow-templates__card" @click="selected = item.id">
            <span class="qk-flow-templates__thumbnail" aria-hidden="true">
              <QuireIcon v-if="item.id === 'blank'" name="plus" :size="24" />
              <img v-else-if="urls[item.id]" :src="urls[item.id]" alt="" />
              <span v-else>{{ loading ? t('生成预览…') : t('预览暂不可用') }}</span>
            </span>
            <span class="qk-flow-templates__card-label">{{ item.label }}</span>
          </QuireButton>
        </div>
        <p v-if="!templates.length" role="status" class="qk-flow-templates__empty">{{ t('没有匹配的模板，试试其他关键词。') }}</p>
      </div>
      <aside class="qk-flow-templates__detail" :aria-label="t('所选模板预览')">
        <div class="qk-flow-templates__large-preview">
          <QuireIcon v-if="selected === 'blank'" name="plus" :size="24" />
          <img v-else-if="selected && urls[selected] && choice" :src="urls[selected]" :alt="t('{label}预览', { label: choice.label })" />
          <span v-else>{{ !selected ? t('选择一个模板') : loading ? t('生成预览…') : t('预览暂不可用') }}</span>
        </div>
        <template v-if="choice"><h3>{{ choice.label }}</h3><p>{{ choice.description }}</p></template>
      </aside>
    </div>
    <figure v-if="enlarged && selected && choice" class="qk-flow-templates__enlarged">
      <img :src="urls[selected]" :alt="t('{label}放大预览', { label: choice.label })" />
      <figcaption>{{ choice.label }} · {{ choice.description }}</figcaption>
    </figure>
    <div ref="mount" class="qk-flow-templates__renderer" aria-hidden="true" inert></div>
    <template #status>
      <span v-if="error" role="alert">{{ t('预览加载失败。') }}<QuireButton size="xs" variant="ghost" @click="retry">{{ t('重新加载') }}</QuireButton></span>
      <span v-else class="qk-flow-templates__note">{{ t('使用模板将替换当前画布，可通过撤销恢复。') }}</span>
    </template>
    <template #footer>
      <QuireButton variant="ghost" :disabled="!selected || selected === 'blank' || !urls[selected]" @click="enlarged = !enlarged">{{ enlarged ? t('返回模板') : t('放大预览') }}</QuireButton>
      <QuireButton variant="outline" @click="emit('close')">{{ t('取消') }}</QuireButton>
      <QuireButton variant="solid" color="primary" :disabled="disabled || !selected" @click="selected && emit('apply', selected)">{{ t('使用模板') }}</QuireButton>
    </template>
  </QuireDialogContent>
</template>
