import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useId, watch, type ShallowRef } from "vue";
import type { HtmlSandboxHandle } from "@quirekit/html-sandbox/browser";
import type { HtmlSandboxDiagnostic, HtmlSandboxEvent, HtmlSandboxState } from "@quirekit/html-sandbox";
import type { HtmlSandboxComponentEvents, QuireKitHtmlSandboxProps } from "./types";

/** Bind one lazy browser controller to the Vue lifecycle without duplicating execution state.
 * @param props - Readonly component inputs. @param events - Typed public event sink. @param mount - Template-owned container ref. @returns Mount, state and actions.
 */
export function useHtmlSandboxRuntime(props: QuireKitHtmlSandboxProps, events: HtmlSandboxComponentEvents, mount: ShallowRef<HTMLElement | undefined>) {
  const state = shallowRef<HtmlSandboxState>({ phase: "idle", dirty: false, runId: 0 });
  const logs = shallowRef<readonly HtmlSandboxDiagnostic[]>([]);
  const measured = ref(320);
  const pending = ref(true);
  let loading = false;
  const fallbackIdentity = `html-sandbox-${useId()}`;
  let runtime: HtmlSandboxHandle | undefined;
  let load: Promise<void> | undefined;
  let disposed = false;
  let mounted = false;
  let paused = false;
  let geometryTick = 0;
  let geometryChanges = 0;
  let geometryFrozen = false;
  const source = computed(() => ({ html: props.html, complete: props.complete ?? true, identity: props.identity ?? fallbackIdentity }));
  const bounds = computed(() => {
    const setting = props.height;
    /** @param value - Host dimension. @param fallback - Default dimension. @returns Finite bounded height. */
    const clamp = (value: number | undefined, fallback: number): number => Number.isFinite(value) ? Math.min(2000, Math.max(80, value!)) : fallback;
    if (typeof setting === "number" || setting === undefined) return { auto: false, min: 80, max: 2000, initial: clamp(setting, 320) };
    const min = clamp(setting.min, 160), max = Math.max(min, clamp(setting.max, 800));
    return { auto: true, min, max, initial: Math.max(min, Math.min(max, clamp(setting.initial, 320))) };
  });
  const height = computed(() => bounds.value.auto ? Math.max(bounds.value.min, Math.min(bounds.value.max, measured.value)) : bounds.value.initial);
  watch(bounds, value => { measured.value = value.initial; geometryFrozen = false; geometryChanges = 0; }, { immediate: true });
  /** @param diagnostic - Bounded plain-text report. */
  function diagnostic(diagnostic: HtmlSandboxDiagnostic): void {
    logs.value = [...logs.value.slice(-199), diagnostic];
    events.diagnostic(diagnostic);
  }
  /** @param event - Validated controller event. */
  function receive(event: HtmlSandboxEvent): void {
    if (disposed) return;
    if (event.type === "state") {
      if (event.state.runId !== state.value.runId || event.state.phase === "idle") { logs.value = []; geometryFrozen = false; geometryChanges = 0; }
      state.value = event.state;
      events.state(event.state);
    } else if (event.type === "diagnostic") diagnostic(event.diagnostic);
    else if (event.type === "exit") events.exit();
    else if (event.type === "resize" && bounds.value.auto && !geometryFrozen) {
      const next = Math.max(bounds.value.min, Math.min(bounds.value.max, Math.ceil(event.height)));
      if (next === measured.value) return;
      const now = Date.now();
      if (now - geometryTick > 2000) { geometryTick = now; geometryChanges = 0; }
      if (++geometryChanges > 30) {
        geometryFrozen = true;
        diagnostic({ code: "sandbox.resize-unstable", message: "sandbox.resize-unstable", level: "warn", untrusted: false });
        return;
      }
      measured.value = next;
    }
  }
  watch(height, value => events.resize(value));
  /** Load only for mounted sandbox consumers; imports do not touch browser globals. */
  async function initialize(): Promise<void> {
    if (disposed || runtime || loading || !mount.value) return;
    pending.value = true;
    loading = true;
    try {
      const { createHtmlSandbox } = await import("@quirekit/html-sandbox/browser");
      if (disposed || !mount.value) return;
      runtime = createHtmlSandbox({ container: mount.value, source: source.value, ...(props.config ? { config: props.config } : {}), ...(props.title ? { title: props.title } : {}), onEvent: receive });
      if (paused) runtime.stop();
    } catch (error) {
      if (!disposed) {
        state.value = { phase: "failed", dirty: false, runId: 0 };
        events.state(state.value);
        diagnostic({ code: "sandbox.initialize-failed", message: String(error).slice(0, 4096), level: "error", untrusted: false });
      }
    } finally { pending.value = false; loading = false; }
  }
  // Ark may publish the initial tab panel after the parent mounted hook.
  // Observe the actual mount target, not just the component lifecycle.
  onMounted(() => { mounted = true; if (mount.value) load = initialize(); });
  watch(mount, value => { if (value && mounted && !runtime && !loading) load = initialize(); }, { flush: "post" });
  watch(source, value => { runtime?.update(value); });
  watch(() => props.config, value => { runtime?.configure(value ?? {}); }, { deep: true });
  onBeforeUnmount(() => { disposed = true; runtime?.destroy(); runtime = undefined; });
  /** @returns Admission result, after any pending module load. */
  async function run(): Promise<boolean> {
    paused = false;
    const identity = source.value.identity;
    const previousRun = state.value.runId;
    const wasPending = !runtime;
    if (!runtime) { if (!loading) load = initialize(); await load; }
    if (disposed || paused || source.value.identity !== identity) return false;
    if (wasPending && state.value.runId > previousRun && (state.value.phase === "starting" || state.value.phase === "running")) return true;
    runtime?.configure(props.config ?? {});
    runtime?.update(source.value);
    return runtime?.run() ?? false;
  }
  /** Also cancels a run waiting for the dynamic import to finish. */
  function stop(): void { paused = true; runtime?.stop(); }
  return { mount, state, logs, pending, height, run, stop };
}
