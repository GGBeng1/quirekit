/** Bootstrap injected before author scripts. Must stay self-contained for serialization.
 * @param runId - Correlation identifier, not a secret or authorization token.
 */
export function guestBootstrap(runId: number): void {
  let port: MessagePort | undefined;
  let loaded = false;
  let sent = 0;
  let scheduled = false;
  const queue: Record<string, unknown>[] = [];
  const post = window.parent.postMessage.bind(window.parent);
  /** @param data - Bounded guest observation. */
  function send(data: Record<string, unknown>): void {
    const envelope = { ...data, version: 1, runId };
    if (port) port.postMessage(envelope);
    else if (queue.length < 200) queue.push(envelope);
  }
  /** @param value - Potentially adversarial author value. @returns Bounded display text. */
  function text(value: unknown): string {
    try {
      return (value instanceof Error ? value.message : typeof value === "object" && value !== null ? Object.prototype.toString.call(value) : String(value)).slice(0, 700);
    } catch { return "[unavailable]"; }
  }
  /** @param level - Display severity. @param code - Observation category. @param args - Author values. */
  function log(level: string, code: string, args: unknown[]): void {
    if (++sent <= 200) send({ type: "diagnostic", level, code, message: args.slice(0, 5).map(text).join(" ").slice(0, 1000) });
  }
  for (const level of ["log", "info", "warn", "error", "debug"] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => { log(level === "warn" || level === "error" ? level : "info", "guest.console", args); original(...args); };
  }
  window.addEventListener("error", event => log("error", "guest.error", [event.message]));
  window.addEventListener("unhandledrejection", event => log("error", "guest.rejection", [event.reason]));
  document.addEventListener("securitypolicyviolation", event => log("warn", "guest.policy", [event.violatedDirective, event.blockedURI]));
  document.addEventListener("keydown", event => { if (event.key === "Escape") send({ type: "exit" }); });
  /** Combine geometry observations to at most one report per animation frame. */
  function measure(): void {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const body = document.body;
      if (!body) return;
      const bounds = body.getBoundingClientRect();
      const margin = Number.parseFloat(getComputedStyle(body).marginBottom) || 0;
      // The root scrollHeight is at least the viewport height and cannot shrink.
      // Measure the body box plus actual overflow; viewport-sized author CSS stays viewport-sized.
      const overflow = body.scrollHeight > body.clientHeight ? bounds.top + body.scrollHeight : 0;
      send({ type: "resize", height: Math.max(0, bounds.bottom + margin, overflow) + scrollY });
    });
  }
  /** A ready report describes the bridge, not author application correctness. */
  function ready(): void {
    loaded = true;
    send({ type: "ready" });
    new ResizeObserver(measure).observe(document.documentElement);
    if (document.body) new ResizeObserver(measure).observe(document.body);
    measure();
  }
  window.addEventListener("message", function connect(event: MessageEvent) {
    if (port || event.source !== parent || event.data?.type !== "connect" || event.data.version !== 1 || event.data.runId !== runId || !event.ports[0]) return;
    port = event.ports[0];
    window.removeEventListener("message", connect);
    for (const item of queue.splice(0)) port.postMessage(item);
    if (loaded) measure();
  });
  post({ type: "hello", version: 1, runId }, "*");
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready, { once: true });
  else ready();
}
