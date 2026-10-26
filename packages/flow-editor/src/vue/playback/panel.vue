<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { QuireButton, QuireIcon, QuireIconButton, QuireMenu, QuireSelect } from "@quirekit/ui/vue";
import type { QuireKitMenuEntry } from "@quirekit/ui";
import { readFlowchartPlaybackTrace, type FlowchartPlaybackStep, type FlowchartPlaybackTrace } from "@quirekit/flowchart";
import { useFlowMessages } from "../messages";
import Controls from "./controls.vue";
import Compose from "./compose.vue";
import { planWithSteps } from "./plan";
import type { PlaybackPanelProps } from "./types";
import "./styles.css";

const props = defineProps<PlaybackPanelProps>(), emit = defineEmits<{ close: []; start: []; edit: [trace: FlowchartPlaybackTrace]; snapshot: []; error: [error: unknown] }>();
const { t } = useFlowMessages(), composing = ref(false), editing = ref<FlowchartPlaybackStep>(), page = ref(0);
let draftRun = -1, draftTrace: FlowchartPlaybackTrace | undefined;
const active = computed(() => !!props.state?.active), live = computed(() => props.state?.mode === "live");
const status = computed(() => t(({ idle: "准备步骤", ready: "准备播放", playing: "正在播放", paused: "已暂停", waiting: "等待执行事件", completed: "演示完成" } as const)[props.state?.status ?? "idle"]));
const pageCount = computed(() => Math.max(1, Math.ceil(props.trace.steps.length / 40)));
const rows = computed(() => { const start = page.value * 40; return props.trace.steps.slice(start, start + 40).map((step, offset) => ({ step, index: start + offset })); });
watch(pageCount, count => { page.value = Math.min(page.value, count - 1); });
watch(() => props.state?.runId, () => { page.value = 0; if (props.state?.active) composing.value = false; });
const legend = computed(() => [
  { state: "pending", label: t("待处理"), icon: "clock" }, { state: "running", label: t("处理中"), icon: "play" },
  { state: "completed", label: t("完成"), icon: "check" }, { state: "reused", label: t("复用"), icon: "refreshCw" }, { state: "invalid", label: t("失效"), icon: "close" },
]);
const presentations = computed(() => [{ value: "motion", label: t("数据动效") }, { value: "status", label: t("状态高亮") }]);
/** @param value - User-selected presentation. Updates only the session-local plan. */
function presentation(value: string | undefined): void { if (value === "motion" || value === "status") emit("edit", { ...props.trace, presentation: value }); }
/** @param step - Existing event, absent for an additional step. Opens a detached plan editor after releasing playback ownership. */
function compose(step?: FlowchartPlaybackStep): void {
  if (live.value) return; emit("edit", props.trace); draftRun = props.editor.playback.getState().runId; draftTrace = props.trace; editing.value = step; composing.value = true;
}
/** Rejects a field draft after a host replaced its run or plan. */
function guardDraft(): void { if (props.editor.playback.getState().runId !== draftRun || props.trace !== draftTrace) throw new Error("演示已更换，请重新编排步骤"); }
/** @param step - Captured user event. Validates all IDs before accepting a session-local plan. */
async function apply(step: FlowchartPlaybackStep): Promise<void> {
  try {
    guardDraft();
    const source = await props.editor.getDocument(), targets = new Set([...source.nodes, ...source.edges].map(item => item.id));
    guardDraft();
    const steps = editing.value ? props.trace.steps.map(item => item.id === step.id ? step : item) : [...props.trace.steps, step];
    emit("edit", readFlowchartPlaybackTrace(planWithSteps(props.trace, steps), (id, kind) => targets.has(id) && (!kind || source.edges.some(edge => edge.id === id)))); composing.value = false;
  } catch (error) { emit("error", error); }
}
/** @param step - Requested prefix endpoint. Shows its exact cumulative states without selecting or moving source objects. */
function seek(step: FlowchartPlaybackStep): void {
  try { const p = props.editor.playback; if (!active.value) p.load(props.trace); p.seek(props.trace.steps.findIndex(item => item.id === step.id) + 1); }
  catch (error) { emit("error", error); }
}
/** @param step - Current event. @param direction - Adjacent event movement, or zero for removal. Updates only the detached plan. */
function change(step: FlowchartPlaybackStep, direction: number): void {
  const steps = [...props.trace.steps], index = steps.findIndex(item => item.id === step.id); if (index < 0) return;
  if (!direction) steps.splice(index, 1);
  else { const next = index + direction; if (next < 0 || next >= steps.length) return; [steps[index], steps[next]] = [steps[next]!, steps[index]!]; }
  emit("edit", planWithSteps(props.trace, steps));
}
/** @param step - Exact displayed event. @returns Contextual plan actions with accurate order boundaries. */
function menu(step: FlowchartPlaybackStep): readonly QuireKitMenuEntry[] {
  return [{ value: "edit", label: t("编辑步骤"), icon: "edit" }, { value: "up", label: t("步骤上移"), icon: "arrowUp", disabled: step === props.trace.steps[0] },
    { value: "down", label: t("步骤下移"), icon: "arrowDown", disabled: step === props.trace.steps.at(-1) }, { value: "remove", label: t("移除步骤"), icon: "trash" }];
}
/** @param step - Captured event. @param value - Public Menu action; stale event objects cannot edit a replacement plan. */
function select(step: FlowchartPlaybackStep, value: string): void {
  if (!props.trace.steps.includes(step) || live.value || props.presentationOnly) return;
  if (value === "edit") compose(step); else change(step, value === "up" ? -1 : value === "down" ? 1 : 0);
}
</script>
<template>
  <aside class="qk-flow-playback" :aria-label="t('流程演示')">
    <div class="qk-flow-playback__heading"><h2>{{ trace.title || t('流程演示') }}</h2><QuireIconButton v-if="!presentationOnly" :label="t('退出演示')" variant="ghost" size="sm" @click="emit('close')"><QuireIcon name="close" :size="16" /></QuireIconButton></div>
    <Controls :editor="editor" :state="state" :trace="trace" @start="emit('start')" @error="emit('error', $event)" />
    <div class="qk-flow-playback__scroll">
      <div v-if="!presentationOnly && !live" class="qk-flow-playback__presentation"><span>{{ t('表现方式') }}</span><QuireSelect :model-value="trace.presentation ?? 'status'" :items="presentations" :label="t('表现方式')" width="128px" size="sm" @update:model-value="presentation" /></div>
      <div class="qk-flow-playback__progress"><span>{{ status }}</span><span>{{ t('{index} / {count} 步', { index: state?.index ?? 0, count: active ? state?.count ?? 0 : trace.steps.length }) }}</span></div>
      <div class="qk-flow-playback__explanation" aria-live="polite" aria-atomic="true">
        <h3>{{ state?.current?.title ?? t('选择步骤，开始演示') }}</h3>
        <p v-if="state?.current?.description">{{ state.current.description }}</p>
        <p v-else-if="live">{{ t('新的执行事件到达后，会依次显示节点与连线状态。') }}</p>
      </div>
      <ul v-if="trace.presentation !== 'motion'" class="qk-flow-playback__legend" :aria-label="t('运行状态图例')"><li v-for="item in legend" :key="item.state" :data-state="item.state"><QuireIcon :name="item.icon" :size="12" /><span>{{ item.label }}</span></li></ul>
      <p v-if="state?.reducedMotion" class="qk-flow-playback__helper">{{ t('已按系统偏好减少动效，状态与步骤仍可查看。') }}</p>
      <div class="qk-flow-playback__list-heading"><h3>{{ t('演示步骤') }}</h3>
        <QuireButton v-if="live" size="xs" variant="ghost" @click="emit('snapshot')">{{ t('查看执行记录') }}</QuireButton>
        <QuireButton v-else-if="!presentationOnly && !composing" size="xs" variant="outline" :disabled="editorState.composing" @click="compose()">{{ t('新增步骤') }}</QuireButton>
      </div>
      <Compose v-if="composing" :key="editing?.id ?? 'new'" :editor="editor" :existing="editing" :selected-count="editorState.selectedIds.length" @apply="apply" @close="composing = false" @error="emit('error', $event)" />
      <p v-if="!trace.steps.length && !composing" class="qk-flow-playback__helper">{{ t(live ? '执行记录可按需打开；播放控制始终使用最新事件。' : '选择图形或连线，新增步骤并选择动效。多个目标可同时播放。') }}</p>
      <ol v-if="!composing" class="qk-flow-playback__steps">
        <li v-for="{ step, index } in rows" :key="step.id" :data-current="state?.current?.id === step.id ? '' : undefined">
          <QuireButton class="qk-flow-playback__step" size="sm" variant="ghost" :aria-label="`${index + 1} ${step.title}`" :aria-current="state?.current?.id === step.id ? 'step' : undefined" @click="seek(step)"><span class="qk-flow-playback__step-content"><span class="qk-flow-playback__step-number">{{ index + 1 }}</span><span class="qk-flow-playback__step-title">{{ step.title }}</span></span></QuireButton>
          <div v-if="!presentationOnly && !live" class="qk-flow-playback__step-actions">
            <QuireMenu :items="menu(step)" :aria-label="t('步骤操作')" placement="bottom-end" @select="select(step, $event)"><template #trigger><QuireIconButton :label="t('步骤操作：{title}', { title: step.title })" size="xs" variant="ghost"><QuireIcon name="moreHorizontal" :size="16" /></QuireIconButton></template></QuireMenu>
          </div>
        </li>
      </ol>
      <div v-if="pageCount > 1" class="qk-flow-playback__pagination"><QuireButton size="xs" variant="ghost" :disabled="page === 0" @click="page--">{{ t('上一页步骤') }}</QuireButton><span>{{ Math.min(page + 1, pageCount) }} / {{ pageCount }}</span><QuireButton size="xs" variant="ghost" :disabled="page >= pageCount - 1" @click="page++">{{ t('下一页步骤') }}</QuireButton></div>
      <p v-if="!presentationOnly && !live" class="qk-flow-playback__helper">{{ t('演示步骤仅在当前会话保留，图形源文件不会自动保存编排。') }}</p>
    </div>
  </aside>
</template>
