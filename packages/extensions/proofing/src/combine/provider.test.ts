import { describe, expect, it, vi } from "vitest";
import type { ProofingCheckRequest, ProofingProvider, ProofingProviderIssue } from "../types";
import { combineProofingProviders } from "./provider";

/**
 * Creates a member returning fixed findings for every segment.
 *
 * @param id - Member id.
 * @param issues - Findings relative to each segment.
 * @param languages - Supported language prefixes.
 * @returns Member provider.
 */
function member(id: string, issues: readonly Omit<ProofingProviderIssue, "segmentId">[], languages = ["en"]): ProofingProvider {
  return {
    id,
    getCapabilities: () => ({ issueKinds: ["spelling", "grammar"], supportsLanguage: (language) => languages.some((prefix) => language.startsWith(prefix)) }),
    check: vi.fn(async (request: ProofingCheckRequest) => ({
      issues: request.segments.flatMap((segment) => issues.map((issue) => ({ ...issue, segmentId: segment.id })))
    })),
    suggest: vi.fn(async ({ text, ruleId }) => [`${id}:${text}:${ruleId ?? ""}`])
  };
}

const request = (language: string): ProofingCheckRequest => ({
  segments: [{ id: "s", text: "teh cat go", language, surface: "body", startsBlock: true }],
  defaultLanguage: null,
  maxSuggestions: 3,
  signal: new AbortController().signal
});

describe("combineProofingProviders", () => {
  it("keeps the earlier member's finding when same-category findings overlap", async () => {
    const spelling = member("dict", [{ start: 0, end: 3, kind: "spelling" }]);
    const grammar = member("harper", [{ start: 0, end: 3, kind: "spelling" }, { start: 8, end: 10, kind: "grammar", ruleId: "Agreement" }]);
    const { issues } = await combineProofingProviders([spelling, grammar]).check(request("en-US"));

    expect(issues.map((issue) => [issue.start, issue.kind, issue.ruleId])).toEqual([
      [0, "spelling", "dict\u0000"],
      [8, "grammar", "harper\u0000Agreement"]
    ]);
  });

  it("sends each member only the languages it supports and routes suggestions back", async () => {
    const english = member("en", [], ["en"]);
    const french = member("fr", [], ["fr"]);
    const combined = combineProofingProviders([english, french]);
    await combined.check(request("fr-FR"));

    expect(english.check).not.toHaveBeenCalled();
    expect(await combined.suggest!({ text: "teh", language: "fr-FR", kind: "spelling", ruleId: "fr\u0000rule", maxSuggestions: 3, signal: new AbortController().signal }))
      .toEqual(["fr:teh:rule"]);
  });

  it("reports a failing member and keeps the others' findings", async () => {
    const onProviderError = vi.fn();
    const broken: ProofingProvider = { id: "broken", check: async () => { throw new Error("offline"); } };
    const working = member("dict", [{ start: 0, end: 3, kind: "spelling" }]);
    const { issues } = await combineProofingProviders([broken, working], { onProviderError }).check(request("en-US"));

    expect(issues).toHaveLength(1);
    expect(onProviderError).toHaveBeenCalledWith(expect.objectContaining({ kind: "provider-error" }), broken);
    await expect(combineProofingProviders([broken]).check(request("en-US"))).rejects.toThrow("offline");
  });
});
