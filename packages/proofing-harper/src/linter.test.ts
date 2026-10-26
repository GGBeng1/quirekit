import type { ProofingCheckRequest } from "@quirekit/extension-proofing";
import { Dialect, WorkerLinter, type Lint, type Linter } from "harper.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHarperProofingProvider } from "./provider";

vi.mock("harper.js", async (original) => ({
  ...await original<typeof import("harper.js")>(),
  WorkerLinter: vi.fn()
}));

/** @param initial - Starting dialect. @returns Controllable asynchronous engine. */
function engine(initial: Dialect) {
  let dialect = initial;
  return {
    setup: vi.fn(async () => {}),
    setDialect: vi.fn(async (next: Dialect) => { dialect = next; }),
    lint: vi.fn(async (text: string) => {
      await Promise.resolve();
      const kind = `${dialect}:${text}`;
      return [{ lint_kind: () => kind, free: vi.fn() }] as unknown as Lint[];
    }),
    dispose: vi.fn(async () => {})
  };
}

/** @returns Mocked worker instances in creation order. */
function workers() {
  const instances: ReturnType<typeof engine>[] = [];
  vi.mocked(WorkerLinter).mockImplementation(function (init) {
    const instance = engine(init.dialect ?? Dialect.American);
    instances.push(instance);
    return instance as unknown as WorkerLinter;
  });
  return instances;
}

/**
 * @param language - Segment language.
 * @param signal - Request cancellation.
 * @returns One-segment check request.
 */
function request(language: string, signal = new AbortController().signal): ProofingCheckRequest {
  return {
    segments: [{ id: language, text: language, language, surface: "body", startsBlock: true }],
    defaultLanguage: null, maxSuggestions: 3, signal
  };
}

beforeEach(() => { vi.mocked(WorkerLinter).mockReset(); });

describe("default Harper worker lifetime", () => {
  it("uses one lazy worker and keeps concurrent dialect changes atomic", async () => {
    const instances = workers();
    const provider = createHarperProofingProvider({ issueKinds: [] });
    expect(instances).toHaveLength(0);
    const languages = ["en-US", "en-GB", "en-AU", "en-CA", "en-IN", "en-US"];
    await Promise.all(languages.map(language => provider.check(request(language))));
    expect(instances).toHaveLength(1);
    const lints = await Promise.all(instances[0]!.lint.mock.results.map(result => result.value));
    expect(lints.map(batch => batch[0]!.lint_kind())).toEqual([
      "0:en-US", "1:en-GB", "2:en-AU", "3:en-CA", "4:en-IN", "0:en-US"
    ]);
    await provider.dispose?.();
  });

  it("skips canceled work queued behind an active check", async () => {
    const instances = workers();
    const provider = createHarperProofingProvider({ issueKinds: [], preload: true });
    await vi.waitFor(() => expect(instances).toHaveLength(1));
    let release!: (lints: Lint[]) => void;
    instances[0]!.lint.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const first = provider.check(request("en-US"));
    await vi.waitFor(() => expect(instances[0]!.lint).toHaveBeenCalledOnce());
    const abort = new AbortController();
    const canceled = expect(provider.check(request("en-GB", abort.signal))).rejects.toThrow("obsolete");
    abort.abort(new Error("obsolete"));
    release([]);
    await Promise.all([first, canceled]);
    expect(instances).toHaveLength(1);
    expect(instances[0]!.setDialect).not.toHaveBeenCalled();
    expect(instances[0]!.lint).toHaveBeenCalledOnce();
    await provider.dispose?.();
  });

  it("continues after a failed operation and reuses the preloaded worker", async () => {
    const instances = workers();
    const provider = createHarperProofingProvider({ issueKinds: [], preload: true });
    await vi.waitFor(() => expect(instances).toHaveLength(1));
    instances[0]!.lint.mockRejectedValueOnce(new Error("analysis failed"));
    const failed = expect(provider.check(request("en-US"))).rejects.toThrow("analysis failed");
    const next = provider.check(request("en-GB"));
    await Promise.all([failed, next]);
    expect(instances).toHaveLength(1);
    expect(instances[0]!.setup).toHaveBeenCalledOnce();
    expect(instances[0]!.lint).toHaveBeenCalledTimes(2);
    await provider.dispose?.();
  });

  it("drains active work on dispose, rejects waiting and new work, and disposes once", async () => {
    const instances = workers();
    const provider = createHarperProofingProvider({ issueKinds: [], preload: true });
    await vi.waitFor(() => expect(instances).toHaveLength(1));
    let release!: (lints: Lint[]) => void;
    instances[0]!.lint.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    const first = provider.check(request("en-US"));
    await vi.waitFor(() => expect(instances[0]!.lint).toHaveBeenCalledOnce());
    const queued = expect(provider.check(request("en-GB"))).rejects.toThrow("disposed");
    const closing = provider.dispose?.();
    const newWork = expect(provider.check(request("en-AU"))).rejects.toThrow("disposed");
    const disposalsBeforeAnswer = instances[0]!.dispose.mock.calls.length;
    release([]);
    await Promise.all([first, queued, newWork, closing, provider.dispose?.()]);
    expect(disposalsBeforeAnswer).toBe(0);
    expect(instances).toHaveLength(1);
    expect(instances[0]!.dispose).toHaveBeenCalledOnce();
    expect(instances[0]!.lint).toHaveBeenCalledOnce();
  });

  it("preserves host-owned per-dialect engines without changing their configuration", async () => {
    const createLinter = vi.fn((dialect: Dialect) => engine(dialect));
    const provider = createHarperProofingProvider({
      issueKinds: [], createLinter: dialect => createLinter(dialect) as unknown as Linter
    });
    await Promise.all(["en-US", "en-GB", "en-US"].map(language => provider.check(request(language))));
    expect(createLinter.mock.calls).toEqual([[Dialect.American], [Dialect.British]]);
    for (const result of createLinter.mock.results) expect(result.value.setDialect).not.toHaveBeenCalled();
    expect(WorkerLinter).not.toHaveBeenCalled();
    await provider.dispose?.();
    for (const result of createLinter.mock.results) expect(result.value.dispose).toHaveBeenCalledOnce();
  });
});
