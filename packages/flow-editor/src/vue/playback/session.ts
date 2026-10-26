import { computed, ref, shallowRef, watch, type ShallowRef } from "vue";
import type { FlowchartPlaybackState, FlowchartPlaybackTrace } from "@quirekit/flowchart";
import type { FlowchartEditor } from "@quirekit/flowchart-x6";
import type { FlowEditorProps } from "../types";
import { useFlowMessages } from "../messages";

/** @param editor - Current graph lifetime. @param props - Controlled host sequence/mode. @param report - Existing error port. @param publish - Small semantic event. @returns Run-scoped UI projections, without per-frame or per-live-event trace copies. */
export function useFlowPlaybackSession(editor: ShallowRef<FlowchartEditor | undefined>, props: FlowEditorProps,
  report: (error: unknown) => void, publish: (state: FlowchartPlaybackState) => void) {
  const { t } = useFlowMessages(), open = ref(false), state = shallowRef<FlowchartPlaybackState>();
  const trace = shallowRef<FlowchartPlaybackTrace>({ title: t("流程演示"), presentation: "motion", steps: [] });
  watch(editor, (instance, _previous, cleanup) => {
    state.value = undefined; trace.value = { title: t("流程演示"), presentation: "motion", steps: [] }; open.value = props.mode === "presentation";
    if (!instance) return;
    let lastRun = -1;
    const off = instance.playback.subscribe(value => {
      state.value = value;
      if (value.active) {
        open.value = true;
        if (lastRun !== value.runId) trace.value = value.mode === "preset" ? instance.playback.getTrace() : { title: value.title, presentation: value.presentation, steps: [] };
        else if (value.mode === "live" && trace.value.presentation !== value.presentation) trace.value = { ...trace.value, presentation: value.presentation };
      }
      lastRun = value.runId; publish(value);
    });
    cleanup(off);
  }, { flush: "sync" });
  watch([editor, () => props.playback, () => props.mode], ([instance, preset, mode]) => {
    if (!instance) return;
    try { if (preset) instance.playback.load(preset); if (mode === "presentation") open.value = true; }
    catch (error) { report(error); }
  }, { flush: "sync" });
  /** @param value - Session-local user plan. Ends the old presentation before accepting a draft. */
  function edit(value: FlowchartPlaybackTrace): void { editor.value?.playback.close(); trace.value = value; }
  /** Reads live recorded steps only after an explicit user request. */
  function snapshot(): void { if (editor.value) trace.value = editor.value.playback.getTrace(); }
  /** @param value - Checked UI plan to start. Loads atomically against the current graph before automatic playback. */
  function play(value = trace.value): void {
    const instance = editor.value; if (!instance) return;
    try { if (!instance.playback.getState().active) instance.playback.load(value); instance.playback.play(); }
    catch (error) { report(error); }
  }
  /** Ends transient presentation and gives keyboard ownership back to this canvas. */
  function close(): void { editor.value?.playback.close(); open.value = false; editor.value?.focus(); }
  const visible = computed(() => open.value || props.mode === "presentation");
  return { open, visible, state, trace, edit, snapshot, play, close };
}
