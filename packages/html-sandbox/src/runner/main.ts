import { createHtmlSandbox } from "../browser/create";
import { captureSource } from "../policy/source";
import type { HtmlSandboxHandle } from "../browser/types";

let active: HtmlSandboxHandle | undefined;
let channel: MessagePort | undefined;
/** Accept exactly one parent connection; the URL never contains document content.
 * @param event - Initial parent handshake.
 */
function initialize(event: MessageEvent): void {
  if (channel || event.source !== parent || event.data?.type !== "initialize" || !event.ports[0]) return;
  const port = event.ports[0];
  channel = port;
  const runId = event.data.runId;
  if (event.data.version !== 1 || event.data.resources !== "embedded" || !Number.isSafeInteger(runId) || runId < 1) { port.postMessage({ type: "incompatible" }); port.close(); return; }
  window.removeEventListener("message", initialize);
  const mount = document.getElementById("sandbox-root")!;
  port.onmessage = message => {
    if (active || message.data?.type !== "execute" || message.data.version !== 1 || message.data.runId !== runId) return;
    try {
      const source = captureSource(message.data.source);
      if (!source.complete) throw new Error("sandbox.incomplete");
      active = createHtmlSandbox({ container: mount, source, config: { execution: "manual" }, onEvent: result => {
        if (result.type === "state") {
          if (result.state.phase === "running") port.postMessage({ type: "ready", version: 1, runId });
          if (result.state.phase === "failed") port.postMessage({ type: "failed", version: 1, runId, code: "sandbox.runner-failed", message: "sandbox.runner-failed", level: "error" });
        } else if (result.type === "diagnostic") port.postMessage({ type: "diagnostic", version: 1, runId, ...result.diagnostic });
        else port.postMessage({ ...result, version: 1, runId });
      } });
      active.run();
    } catch {
      port.postMessage({ type: "failed", version: 1, runId, code: "sandbox.runner-invalid-source", message: "sandbox.runner-invalid-source", level: "error" });
      port.close();
    }
  };
  port.start();
  port.postMessage({ type: "accept", version: 1, runId, resources: "embedded" });
}
window.addEventListener("message", initialize);
window.addEventListener("pagehide", () => { active?.destroy(); channel?.close(); });
