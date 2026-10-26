import { describe, it, expect } from "vitest";
import { defineHtmlSandboxConfig } from "./config";
import { captureSource } from "./source";
describe("host policy", () => {
  it("is immutable and defaults to manual execution", () => {
    const policy = defineHtmlSandboxConfig();
    expect(policy).toEqual({ execution: "manual", resources: "embedded", transport: { kind: "srcdoc" } });
    expect(Object.isFrozen(policy.transport)).toBe(true);
  });
  it("rejects policy smuggling and unsafe runner URLs", () => {
    for (const config of [{ sandbox: "allow-same-origin" }, { resources: "all" }, { transport: { kind: "srcdoc", runnerUrl: "https://test.invalid/" } }, ...["http://test.invalid/runner.html", "https://user:secret@test.invalid/", "https://test.invalid/?html=secret"].map(runnerUrl => ({ transport: { kind: "hosted", runnerUrl } }))]) {
      expect(() => defineHtmlSandboxConfig(config as never)).toThrow();
    }
  });
  it("bounds UTF-8 source bytes and captures ownership", () => {
    expect(() => captureSource({ html: "字".repeat(400_000), complete: true, identity: "a" })).toThrow();
    expect(() => captureSource({ html: "", complete: true, identity: "" })).toThrow();
  });
});
