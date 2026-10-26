import type { ProofingCheckRequest } from "@quirekit/extension-proofing";
import type { Lint, Linter } from "harper.js";
import { describe, expect, it, vi } from "vitest";
import { createHarperProofingProvider } from "./provider";

/** @returns One owned WASM-result stand-in and its nested resource spies. */
function result() {
  const span = { start: 0, end: 5, free: vi.fn() };
  const suggestions = [
    { get_replacement_text: vi.fn(() => " is "), free: vi.fn() },
    { get_replacement_text: vi.fn(() => "is"), free: vi.fn() }
  ];
  const lint = {
    lint_kind: vi.fn(() => "Agreement"),
    span: vi.fn(() => span),
    get_problem_text: vi.fn(() => "is is"),
    suggestions: vi.fn(() => suggestions),
    message: vi.fn(() => "Repeated word"),
    free: vi.fn()
  };
  return { span, suggestions, lint };
}

/** @param signal - Request cancellation. @returns Minimal valid English request. */
function request(signal = new AbortController().signal): ProofingCheckRequest {
  return {
    segments: [{ id: "s", text: "is is", language: "en-US", surface: "body", startsBlock: true }],
    defaultLanguage: null,
    maxSuggestions: 3,
    signal
  };
}

/** @param lint - Injected engine response. @returns Provider using the injected linter. */
function provider(lint: () => Promise<Lint[]>) {
  return createHarperProofingProvider({ createLinter: () => ({ lint }) as unknown as Linter });
}

describe("Harper WASM result ownership", () => {
  it("releases copied results and all suggestion handles after deduplication", async () => {
    const owned = result();
    const engine = provider(async () => [owned.lint as unknown as Lint]);
    expect((await engine.check(request())).issues).toEqual([{
      segmentId: "s", start: 0, end: 5, kind: "grammar", message: "Repeated word",
      replacements: ["is"], ruleId: "Agreement"
    }]);
    expect(owned.lint.free).toHaveBeenCalledOnce();
    expect(owned.span.free).toHaveBeenCalledOnce();
    for (const suggestion of owned.suggestions) expect(suggestion.free).toHaveBeenCalledOnce();
  });

  it("releases filtered and invalid findings without creating suggestions", async () => {
    const filtered = result();
    filtered.lint.lint_kind.mockReturnValue("Typo");
    const invalid = result();
    invalid.lint.get_problem_text.mockReturnValue("different text");
    const engine = provider(async () => [filtered.lint, invalid.lint] as unknown as Lint[]);
    expect((await engine.check(request())).issues).toEqual([]);
    for (const owned of [filtered, invalid]) {
      expect(owned.lint.free).toHaveBeenCalledOnce();
      expect(owned.span.free).toHaveBeenCalledTimes(owned.lint.span.mock.calls.length);
      expect(owned.lint.suggestions).not.toHaveBeenCalled();
    }
  });

  it("releases the complete batch and suggestion array when projection throws", async () => {
    const broken = result();
    broken.suggestions[0]!.get_replacement_text.mockImplementation(() => { throw new Error("decode failed"); });
    const unread = result();
    const engine = provider(async () => [broken.lint, unread.lint] as unknown as Lint[]);
    await expect(engine.check(request())).rejects.toThrow("decode failed");
    for (const suggestion of broken.suggestions) expect(suggestion.free).toHaveBeenCalledOnce();
    expect(broken.span.free).toHaveBeenCalledOnce();
    expect(broken.lint.free).toHaveBeenCalledOnce();
    expect(unread.lint.free).toHaveBeenCalledOnce();
    expect(unread.lint.span).not.toHaveBeenCalled();
  });

  it("releases an answer canceled while awaiting the worker without projecting it", async () => {
    const abort = new AbortController();
    const owned = result();
    const engine = provider(async () => {
      abort.abort(new Error("canceled check"));
      return [owned.lint as unknown as Lint];
    });
    await expect(engine.check(request(abort.signal))).rejects.toThrow("canceled check");
    expect(owned.lint.free).toHaveBeenCalledOnce();
    expect(owned.lint.span).not.toHaveBeenCalled();
  });
});
