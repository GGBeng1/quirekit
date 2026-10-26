<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, watch } from "vue";
import { QuireButton, QuireField, QuireIcon, QuireIconButton, QuireInput, QuireSelect, QuireTextarea } from "@quirekit/ui/vue";
import type { FlowchartEditor } from "@quirekit/flowchart-x6";
import type { FlowchartMotionEffect, FlowchartPlaybackStep, FlowchartRunChange, FlowchartRunState } from "@quirekit/flowchart";
import { useFlowMessages } from "../messages";
import type { PlaybackAnimation, PlaybackCueGroup, PlaybackStepDraft } from "./types";
import { stepEffects } from "./effects";
import { appendStepChanges, appendStepEffects, groupStepEffects } from "./collection";
import Preview from "./preview.vue";
import { v4 as uuidv4 } from "uuid";

const props = defineProps<{ editor: FlowchartEditor; selectedCount: number; existing?: FlowchartPlaybackStep | undefined }>();
const emit = defineEmits<{ apply: [step: FlowchartPlaybackStep]; close: []; error: [error: unknown] }>();
const { t } = useFlowMessages();
const title = ref(props.existing?.title ?? ""), description = ref(props.existing?.description ?? "");
const state = ref<FlowchartRunState>(props.existing?.changes[0]?.state ?? "running"), duration = ref(String(props.existing?.duration ?? 1200));
const stateEdited = ref(false);
const form = ref<HTMLElement>(), queued = shallowRef<readonly FlowchartMotionEffect[]>(), queuedChanges = shallowRef<readonly FlowchartRunChange[]>([]);
const groups = computed(() => groupStepEffects(queued.value ?? []));
const canSubmit = computed(() => !!title.value.trim() && !!(draft.value.targets.length || queuedChanges.value.length || queued.value?.length));
const effect = ref<PlaybackAnimation>(props.existing ? props.existing.effects?.length ? "existing" : "none" : "pulse"), edgeIds = shallowRef<readonly string[]>(props.existing?.effects?.filter(effect => effect.kind === "travel" || effect.kind === "flow").map(effect => effect.id) ?? []);
const direction = ref("forward"), speed = ref("48"), delay = ref("0");
const along = computed(() => effect.value.startsWith("flow-") || ["dot", "beam", "token", "vector"].includes(effect.value));
const continuous = computed(() => effect.value.startsWith("flow-"));
const effects = computed(() => [ ...(props.existing?.effects?.length ? [{ value: "existing", label: t("保留已有动效") }] : []),
  ...[{ value: "flow-dash", label: t("流动虚线") }, { value: "flow-beam", label: t("亮段流动") }, { value: "flow-dot", label: t("光点流动") }].map(item => ({ ...item, disabled: !edgeIds.value.length })),
  { value: "none", label: t("仅状态变化") }, { value: "pulse", label: t("柔和脉冲") }, { value: "appear", label: t("渐显") }, { value: "halo", label: t("扩散光环") },
  ...[{ value: "dot", label: t("单次粒子传递") }, { value: "beam", label: t("单次亮段传递") }, { value: "token", label: t("数据包传递") }, { value: "vector", label: t("向量传递") }].map(item => ({ ...item, disabled: !edgeIds.value.length })) ]);
const draft = shallowRef<PlaybackStepDraft>({ ...(props.existing ? { id: props.existing.id } : {}), targets: [...new Set([...(props.existing?.changes.map(change => change.id) ?? []), ...(props.existing?.effects?.map(effect => effect.id) ?? [])])] });
const choices = computed(() => (["pending", "running", "completed", "reused", "invalid"] as const).map((value, i) => ({ value, label: t(["待处理", "处理中", "完成", "复用", "失效"][i]!) })));
const durations = computed(() => [...new Set([500, 1000, 1200, 2000, 3000, 5000, 10000, props.existing?.duration ?? 1200])].sort((a, b) => a - b).map(ms => ({ value: String(ms), label: t("{seconds} 秒", { seconds: ms / 1000 }) })));
const delays = computed(() => [0, 200, 500, 1000, 1500, 2000].filter(ms => ms <= Number(duration.value) - 100).map(ms => ({ value: String(ms), label: t("{seconds} 秒", { seconds: ms / 1000 }) })));
const directions = computed(() => [{ value: "forward", label: t("沿连线方向") }, { value: "reverse", label: t("反向") }]);
const speeds = computed(() => [{ value: "24", label: t("慢速") }, { value: "48", label: t("标准") }, { value: "96", label: t("快速") }]);
watch(duration, value => { if (Number(delay.value) > Number(value) - 100) delay.value = "0"; });
/** @param value - Selection from the finite animation list. */
function setEffect(value: string | undefined): void { if (effects.value.some(item => item.value === value)) effect.value = value as PlaybackAnimation; }
/** @param preset - Generic effect key. @returns Current localized preset label. */
function effectLabel(preset: PlaybackAnimation): string { return effects.value.find(item => item.value === preset)?.label ?? preset; }
/** @param value - Explicit common state selected by the user. */
function setState(value: string | undefined): void { const selected = choices.value.find(item => item.value === value); if (selected) { state.value = selected.value; stateEdited.value = true; } }
/** @param initial - Initial explicit capture, with a useful default for an edge-only selection. Subsequent selection changes never retarget this draft. */
function capture(initial = false): void {
  try {
    const ids = props.editor.getState().selectedIds;
    if (ids.length > 1000) throw new Error("每步最多选择 1000 个目标");
    const selected = props.editor.getSelection(), first = selected.nodes.find(node => ids.includes(node.id))?.text ?? selected.edges.find(edge => ids.includes(edge.id))?.label, emptyQueueCapture = queued.value !== undefined && !draft.value.targets.length;
    draft.value = { ...draft.value, targets: [...ids] }; edgeIds.value = selected.edges.filter(edge => ids.includes(edge.id)).map(edge => edge.id); stateEdited.value = true;
    if (initial || emptyQueueCapture || effect.value === "existing") { effect.value = edgeIds.value.length && edgeIds.value.length === ids.length ? "flow-dash" : "pulse"; if (initial && effect.value === "flow-dash") duration.value = "5000"; }
    if (!title.value.trim() && ids.length) title.value = effect.value.startsWith("flow-") ? t("连线流动") : first || t("处理选中对象");
  } catch (error) { emit("error", error); }
}
/** @returns Current explicit capture's cues without retargeting queued actions. */
function captureEffects(): readonly FlowchartMotionEffect[] | undefined {
  return stepEffects({ animation: effect.value, targets: draft.value.targets, edges: edgeIds.value, title: title.value,
    direction: direction.value === "reverse" ? "reverse" : "forward", speed: Number(speed.value), delay: Number(delay.value), existing: props.existing?.effects });
}
/** @returns Current capture's deltas, retaining a host's mixed states until explicit state or target edits. */
function captureChanges(): readonly FlowchartRunChange[] {
  return props.existing && !stateEdited.value ? props.existing.changes : (along.value ? edgeIds.value : draft.value.targets).map(id => ({ id, state: state.value }));
}
/** Adds one explicit action group to the current step and releases its capture for another parallel action. */
function append(): void {
  if (!draft.value.targets.length) return;
  try {
    const next = appendStepEffects(queued.value ?? props.existing?.effects ?? [], captureEffects() ?? []);
    queuedChanges.value = appendStepChanges(queued.value === undefined ? props.existing?.changes ?? [] : queuedChanges.value, captureChanges()); queued.value = next;
    draft.value = { ...draft.value, targets: [] }; edgeIds.value = []; effect.value = "pulse"; delay.value = "0";
  } catch (error) { emit("error", error); }
}
/** @param group - Exact authoring summary. Removes only its effects, then focuses a usable capture action or the title field. */
function remove(group: PlaybackCueGroup): void {
  queued.value = queued.value?.filter(effect => !group.effects.includes(effect));
  void nextTick(() => (form.value?.querySelector<HTMLButtonElement>("[data-flow-cue-capture]:not(:disabled)") ?? form.value?.querySelector<HTMLInputElement>("input"))?.focus());
}
/** Emits one explicit event; captured target identities never come from a later selection. */
function apply(): void {
  if (!canSubmit.value) return;
  try {
    const incoming = draft.value.targets.length ? captureEffects() : undefined, delta = draft.value.targets.length ? captureChanges() : [];
    const cues = queued.value === undefined ? incoming : appendStepEffects(queued.value, incoming ?? []), changes = queued.value === undefined ? delta : appendStepChanges(queuedChanges.value, delta);
    emit("apply", { id: draft.value.id ?? `step-${uuidv4()}`, title: title.value, ...(description.value ? { description: description.value } : {}), duration: Number(duration.value), changes, ...(cues ? { effects: cues } : {}) });
  } catch (error) { emit("error", error); }
}
if (!props.existing) capture(true);
</script>
<template>
  <form ref="form" class="qk-flow-playback__compose" @submit.prevent="apply">
    <QuireField :label="t('步骤标题')" width="100%"><template #default="{ controlProps }"><QuireInput v-bind="controlProps" v-model="title" width="100%" :maxlength="10000" /></template></QuireField>
    <QuireField :label="t('步骤说明')" width="100%"><template #default="{ controlProps }"><QuireTextarea v-bind="controlProps" v-model="description" :rows="2" :maxlength="10000" width="100%" /></template></QuireField>
    <div v-if="groups.length" class="qk-flow-playback__effect-groups"><strong>{{ t('已添加 {count} 个动效', { count: queued?.length ?? 0 }) }}</strong><ul>
      <li v-for="group in groups" :key="group.key"><Preview :value="group.preset" /><span class="qk-flow-playback__effect-summary"><span>{{ effectLabel(group.preset) }}</span><small>{{ t('{count} 个目标 · {seconds} 秒开始', { count: group.effects.length, seconds: (group.effects[0]?.delay ?? 0) / 1000 }) }}</small></span><QuireIconButton :label="t('移除动效：{name}', { name: effectLabel(group.preset) })" variant="ghost" size="xs" @click="remove(group)"><QuireIcon name="close" :size="12" /></QuireIconButton></li>
    </ul></div>
    <QuireField :label="t('动效')" width="100%"><template #default="{ controlProps }"><QuireSelect v-bind="controlProps" :model-value="effect" :items="effects" :label="t('动效')" width="100%" @update:model-value="setEffect"><template #item="{ item }"><span class="qk-flow-playback__effect-option"><Preview :value="item.value" /><span>{{ item.label }}</span></span></template></QuireSelect></template></QuireField>
    <div v-if="along" class="qk-flow-playback__fields">
      <QuireField :label="t('流动方向')" width="100%"><template #default="{ controlProps }"><QuireSelect v-bind="controlProps" v-model="direction" :items="directions" :label="t('流动方向')" width="100%" /></template></QuireField>
      <QuireField v-if="continuous" :label="t('流动速度')" width="100%"><template #default="{ controlProps }"><QuireSelect v-bind="controlProps" v-model="speed" :items="speeds" :label="t('流动速度')" width="100%" /></template></QuireField>
    </div>
    <p v-if="along" class="qk-flow-playback__helper">{{ t('应用于已捕获的 {count} 条连线。', { count: edgeIds.length }) }}<template v-if="continuous"> {{ t('循环流动，直到这一阶段结束。') }}</template></p>
    <div class="qk-flow-playback__fields">
      <QuireField :label="t('目标状态')" width="100%"><template #default="{ controlProps }"><QuireSelect v-bind="controlProps" :model-value="state" :items="choices" width="100%" :label="t('目标状态')" @update:model-value="setState" /></template></QuireField>
      <QuireField :label="t('步骤时长')" width="100%"><template #default="{ controlProps }"><QuireSelect v-bind="controlProps" v-model="duration" :items="durations" width="100%" :label="t('步骤时长')" /></template></QuireField>
    </div>
    <QuireField v-if="effect !== 'existing' && effect !== 'none'" :label="t('开始时间')" width="100%"><template #default="{ controlProps }"><QuireSelect v-bind="controlProps" v-model="delay" :items="delays" :label="t('开始时间')" width="100%" /></template></QuireField>
    <div class="qk-flow-playback__capture">
      <QuireButton data-flow-cue-capture size="sm" variant="outline" :disabled="!selectedCount" @click="capture()">{{ t('使用当前选择') }}</QuireButton>
      <span>{{ t('已捕获 {count} 个目标', { count: draft.targets.length }) }}</span>
    </div>
    <div class="qk-flow-playback__form-actions"><QuireButton size="sm" variant="ghost" @click="emit('close')">{{ t('取消') }}</QuireButton><QuireButton data-flow-cue-add size="sm" variant="outline" :disabled="!draft.targets.length" @click="append">{{ t('追加动效') }}</QuireButton><QuireButton type="submit" size="sm" :disabled="!canSubmit">{{ t(existing ? '保存步骤' : '添加步骤') }}</QuireButton></div>
  </form>
</template>
