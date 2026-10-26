import { defineHtmlSandboxConfig } from "../policy/config";
import { captureSource } from "../policy/source";
import type { HtmlSandboxEvent, HtmlSandboxPhase, HtmlSandboxState } from "../types";
import type { CreateHtmlSandboxOptions, HtmlSandboxHandle, SandboxTransportHandle } from "./types";
import { mountTransport } from "./transport";
import { reserveFrame } from "./budget";

/** Create a framework-neutral controller; manual mode creates no iframe until run.
 * @param options - Isolated host mount and initial input. @returns Disposable execution controller.
 */
export function createHtmlSandbox(options: CreateHtmlSandboxOptions): HtmlSandboxHandle {
  let source = captureSource(options.source);
  let config = defineHtmlSandboxConfig(options.config);
  let state: HtmlSandboxState = Object.freeze({ phase: "idle", dirty: false, runId: 0 });
  let transport: SandboxTransportHandle | undefined;
  let release: (() => void) | null = null;
  let executed: string | undefined;
  let stopped = false;
  let validSource = true;
  let validConfig = true;
  let count = 0;
  const title = (options.title ?? "HTML preview").slice(0, 200);
  /** Callbacks must not prevent resource cleanup. @param event - Immutable projection. */
  function emit(event: HtmlSandboxEvent): void {
    try { options.onEvent?.(event); } catch { /* Consumer errors cannot change execution ownership. */ }
  }
  /** @param phase - Next lifecycle phase. */
  function transition(phase: HtmlSandboxPhase): void {
    state = Object.freeze({ phase, runId: state.runId, dirty: executed !== undefined && executed !== source.html });
    emit({ type: "state", state });
  }
  /** Retire before emitting any observable failure or stop. */
  function retire(): void { transport?.destroy(); transport = undefined; release?.(); release = null; }
  /** @param code - Host failure code. @param error - Optional error value. */
  function fail(code: string, error: unknown = code): void {
    retire();
    transition("failed");
    emit({ type: "diagnostic", diagnostic: Object.freeze({ code, message: String(error instanceof Error ? error.message : error).slice(0, 4096), level: "error", untrusted: false }) });
  }
  /** @returns Whether a complete snapshot was accepted. */
  function run(): boolean {
    if (state.phase === "disposed") return false;
    if (!validSource || !validConfig || !source.complete || config.execution === "disabled") return false;
    stopped = false;
    retire();
    release = reserveFrame(options.container.ownerDocument);
    if (!release) { fail("sandbox.instance-budget"); return false; }
    const snapshot = source;
    const policy = config;
    executed = snapshot.html;
    count = 0;
    state = Object.freeze({ phase: "starting", dirty: false, runId: state.runId + 1 });
    const id = state.runId;
    emit({ type: "state", state });
    // Consumer callbacks may synchronously stop/destroy/configure the controller.
    if (state.phase !== "starting" || state.runId !== id) return false;
    try {
      transport = mountTransport(options.container, snapshot, policy, id, title, message => {
        if (state.runId !== id || state.phase !== "starting" && state.phase !== "running") return;
        if (message.type === "ready") transition("running");
        else if (message.type === "failed") fail(message.code!);
        else if (message.type === "resize") emit({ type: "resize", height: message.height! });
        else if (message.type === "exit") emit({ type: "exit" });
        else if (message.type === "diagnostic" && count++ < 200) emit({ type: "diagnostic", diagnostic: Object.freeze({ code: message.code!, message: message.message!, level: message.level!, untrusted: true }) });
      });
      return true;
    } catch (error) { fail("sandbox.mount-failed", error); return false; }
  }
  const handle: HtmlSandboxHandle = {
    get state() { return state; },
    run,
    /** @param next - Atomic source replacement. */
    update(next) {
      if (state.phase === "disposed") return;
      let captured;
      try { captured = captureSource(next); } catch (error) { validSource = false; stopped = true; fail("sandbox.invalid-source", error); return; }
      validSource = true;
      const identityChanged = captured.identity !== source.identity;
      const completed = !source.complete && captured.complete;
      const changed = captured.html !== source.html;
      source = captured;
      if (identityChanged) { retire(); executed = undefined; stopped = false; transition("idle"); }
      else if (changed) transition(state.phase);
      if (!stopped && config.execution === "on-complete" && source.complete && (identityChanged || completed) && (executed !== source.html || identityChanged)) run();
    },
    /** @param next - Trusted policy replacement. */
    configure(next) {
      if (state.phase === "disposed") return;
      let value;
      try { value = defineHtmlSandboxConfig(next); } catch (error) { validConfig = false; stopped = true; fail("sandbox.invalid-config", error); return; }
      validConfig = true;
      if (JSON.stringify(value) === JSON.stringify(config)) return;
      retire();
      config = value;
      // A changed authorization policy always requires a fresh explicit run.
      stopped = true;
      transition("stopped");
    },
    stop() { if (state.phase === "disposed") return; stopped = true; retire(); transition("stopped"); },
    destroy() { if (state.phase === "disposed") return; retire(); executed = undefined; transition("disposed"); },
  };
  // Defer automatic execution so the owner can store and cancel its handle first.
  if (config.execution === "on-complete") queueMicrotask(() => {
    if (state.phase === "idle" && !stopped && source.complete && config.execution === "on-complete") run();
  });
  return handle;
}
