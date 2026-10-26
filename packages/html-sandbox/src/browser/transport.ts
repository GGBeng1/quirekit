import type { HtmlSandboxResolvedConfig, HtmlSandboxSource } from "../types";
import type { SandboxMessage } from "../protocol/types";
import type { SandboxTransportHandle } from "./types";
import { DENIED_FEATURES } from "../policy/csp";
import { readMessage } from "../protocol/read";
import { prepareDocument } from "../document/prepare";

/** Mount one disposable frame; all callbacks are correlated to this generation.
 * @param container - Host mount. @param source - Captured source. @param config - Validated policy.
 * @param runId - Fresh generation. @param title - Accessible name. @param receive - Bounded event sink.
 * @returns Disposable frame and protocol resources.
 */
export function mountTransport(container: HTMLElement, source: HtmlSandboxSource, config: HtmlSandboxResolvedConfig, runId: number, title: string, receive: (message: SandboxMessage) => void): SandboxTransportHandle {
  const doc = container.ownerDocument;
  const win = doc.defaultView!;
  const frame = doc.createElement("iframe");
  frame.setAttribute("sandbox", "allow-scripts");
  frame.setAttribute("allow", DENIED_FEATURES);
  frame.referrerPolicy = "no-referrer";
  frame.title = title;
  frame.style.cssText = "display:block;width:100%;height:100%;border:0;color-scheme:light";
  let port: MessagePort | undefined;
  let disposed = false;
  let connected = false;
  let loads = 0;
  let messages = 0;
  let tick = Date.now();
  let frameRequest = 0;
  let nextHeight = 0;
  let lastHeight = -1;
  let ready = false;
  let runnerAccepted = false;
  /** @param code - Host failure code. */
  function fail(code: string): void { receive({ version: 1, runId, type: "failed", code, level: "error", message: code }); }
  const timeout = win.setTimeout(() => fail("sandbox.handshake-timeout"), 10_000);
  /** @param event - Untrusted cloned event from this run's port. */
  function message(event: MessageEvent): void {
    if (disposed) return;
    const now = Date.now();
    if (now - tick > 1000) { tick = now; messages = 0; }
    if (++messages > 300) { fail("sandbox.message-budget"); return; }
    if (config.transport.kind === "hosted" && !runnerAccepted) {
      if (event.data?.type !== "accept" || event.data.version !== 1 || event.data.resources !== "embedded" || event.data.runId !== runId) { fail("sandbox.runner-incompatible"); return; }
      runnerAccepted = true;
      port?.postMessage({ type: "execute", version: 1, runId, source });
      return;
    }
    const data = readMessage(event.data, runId);
    if (!data) return;
    // The author shares the guest realm and may forge bridge observations.
    // Only locally generated failures carry host-authored diagnostic codes.
    if (data.type === "failed") { fail("sandbox.remote-failed"); return; }
    if (data.type === "ready") {
      if (ready) return;
      ready = true;
      win.clearTimeout(timeout);
    }
    if (data.type === "resize") {
      nextHeight = data.height!;
      if (!frameRequest) frameRequest = win.requestAnimationFrame(() => {
        frameRequest = 0;
        if (!disposed && nextHeight !== lastHeight) { lastHeight = nextHeight; receive({ version: 1, runId, type: "resize", height: nextHeight }); }
      });
      return;
    }
    receive(data);
  }
  /** Transfer a one-run port only to the exact frame Window. */
  function connect(): void {
    if (disposed || connected || !frame.contentWindow) return;
    connected = true;
    const channel = new MessageChannel();
    port = channel.port1;
    port.onmessage = message;
    port.start();
    const payload = config.transport.kind === "hosted"
      ? { type: "initialize", version: 1, runId, resources: "embedded" }
      : { type: "connect", version: 1, runId };
    frame.contentWindow.postMessage(payload, "*", [channel.port2]);
  }
  /** @param event - Initial opaque-window greeting. */
  function hello(event: MessageEvent): void {
    if (event.source === frame.contentWindow && event.data?.type === "hello" && event.data.version === 1 && event.data.runId === runId) connect();
  }
  /** A second document load retires the run, but cannot undo a navigation request. */
  function loaded(): void {
    if (++loads > 1) { fail("sandbox.unexpected-navigation"); return; }
    if (config.transport.kind === "hosted") connect();
  }
  /** Release only this instance, including initial-setup failure paths. */
  function destroy(): void {
    disposed = true;
    win.clearTimeout(timeout);
    win.cancelAnimationFrame(frameRequest);
    win.removeEventListener("message", hello);
    frame.removeEventListener("load", loaded);
    if (port) { port.onmessage = null; port.close(); }
    frame.remove();
  }
  try {
    if (config.transport.kind === "hosted") frame.src = config.transport.runnerUrl;
    else frame.srcdoc = prepareDocument(source.html, runId);
    if (config.transport.kind === "srcdoc") win.addEventListener("message", hello);
    frame.addEventListener("load", loaded);
    container.append(frame);
  } catch (error) { destroy(); throw error; }
  return { destroy };
}
