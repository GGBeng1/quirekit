import type { HtmlSandboxConfig, HtmlSandboxResolvedConfig } from "../types";

/** Reject excess fields instead of accepting accidental permission passthrough.
 * @param input - Unknown object. @param keys - Exact allowed keys. @returns Validated record.
 */
function record(input: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some(key => !keys.includes(key))) {
    throw new TypeError("sandbox.invalid-config");
  }
  return input as Record<string, unknown>;
}
/** Validate host policy without DOM or network access.
 * @param config - Host-owned configuration. @returns Immutable normalized configuration.
 */
export function defineHtmlSandboxConfig(config: HtmlSandboxConfig = {}): HtmlSandboxResolvedConfig {
  const value = record(config, ["transport", "resources", "execution"]);
  const transport = record(value.transport ?? { kind: "srcdoc" }, ["kind", "runnerUrl"]);
  if (value.resources !== undefined && value.resources !== "embedded") throw new TypeError("sandbox.invalid-resources");
  const execution = value.execution ?? "manual";
  if (execution !== "manual" && execution !== "disabled" && execution !== "on-complete") throw new TypeError("sandbox.invalid-execution");
  if (transport.kind === "hosted") {
    if (typeof transport.runnerUrl !== "string") throw new TypeError("sandbox.invalid-runner-url");
    const url = new URL(transport.runnerUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new TypeError("sandbox.invalid-runner-url");
    return Object.freeze({ resources: "embedded", execution, transport: Object.freeze({ kind: "hosted", runnerUrl: url.href }) });
  }
  if (transport.kind !== "srcdoc" || transport.runnerUrl !== undefined) throw new TypeError("sandbox.invalid-transport");
  return Object.freeze({ resources: "embedded", execution, transport: Object.freeze({ kind: "srcdoc" }) });
}
