<script setup lang="ts">
import { computed } from "vue";
import { QuireSelect, QuireSlider, QuireToolbar } from "@quirekit/ui/vue";
import type { QuireKitToolbarEntry } from "@quirekit/ui";
import { useFlowMessages } from "../messages";
import type { PlaybackControlsProps } from "./types";

const props = defineProps<PlaybackControlsProps>(), emit = defineEmits<{ start: []; error: [error: unknown] }>();
const { t } = useFlowMessages();
const advancing = computed(() => props.state?.status === "playing" || props.state?.status === "waiting");
const count = computed(() => props.state?.active ? props.state.count : props.trace.steps.length);
const progress = computed(() => { if (!props.state?.current) return [0]; return [Math.round(props.editor.playback.getProgress() * 100)]; });
const items = computed<readonly QuireKitToolbarEntry[]>(() => [
  { value: "play", label: t(advancing.value ? "暂停演示" : "播放演示"), icon: advancing.value ? "pause" : "play", disabled: !count.value && props.state?.mode !== "live", tooltip: t("空格：播放 / 暂停") },
  { value: "previous", label: t("上一步"), icon: "skipBack", disabled: !props.state?.index },
  { value: "next", label: t("下一步"), icon: "skipForward", disabled: !count.value || (!!props.state?.active && props.state.index >= count.value) },
  { value: "replay", label: t("重播演示"), icon: "rotateCcw", disabled: !count.value },
]);
const rates = [0.25, 0.5, 1, 1.5, 2, 4].map(rate => ({ value: String(rate), label: `${rate}×` }));
/** @param value - Neutral playback intent. */
function execute(value: string): void {
  try {
    const player = props.editor.playback;
    if (value === "play") { if (advancing.value) player.pause(); else emit("start"); }
    else if (value === "previous") player.seek(Math.max(0, (props.state?.index ?? 0) - 1));
    else {
      if (!props.state?.active) player.load(props.trace);
      if (value === "next") player.step(); else player.replay();
    }
  } catch (error) { emit("error", error); }
}
/** @param rate - Shared Select's string value. */
function setRate(rate: string | undefined): void { if (rate) try { props.editor.playback.setRate(Number(rate)); } catch (error) { emit("error", error); } }
/** @param values - Public single-thumb slider position. Applies a paused, constant-cost current-step preview. */
function setProgress(values: number[] | undefined): void { if (values?.[0] !== undefined) try { props.editor.playback.seekProgress(values[0] / 100); } catch (error) { emit("error", error); } }
</script>
<template>
  <div class="qk-flow-playback__controls">
    <QuireToolbar :label="t('演示播放控制')" :items="items" preserve-focus @execute="execute($event.value)" />
    <QuireSelect :model-value="String(state?.rate ?? 1)" :items="rates" :label="t('播放倍速')" width="76px" size="sm" placement="bottom-end" @update:model-value="setRate" />
  </div>
  <div v-if="state?.current?.effects?.length && !advancing" class="qk-flow-playback__seek"><QuireSlider :label="t('步骤内预览')" :model-value="progress" unit="%" @update:model-value="setProgress" /></div>
</template>
