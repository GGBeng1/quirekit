import type {
  ClassicEditorHostAcquireIntent,
  ClassicEditorHostServices
} from "../../types/host";
import { createDefaultClassicEditorHostServices } from "./services";

/** Deferred promise controlled by one Host coordinator test. */
export interface HostTestDeferred<Value> {
  /** Pending promise returned by a fixture adapter. */
  readonly promise: Promise<Value>;
  /** Settles the pending promise. */
  readonly resolve: (value: Value) => void;
}

/**
 * Creates one bounded typed acquire intent.
 *
 * @param override - Optional correlation or policy facts to replace.
 * @returns Complete acquire intent.
 */
export function createHostTestAcquireIntent(
  override: Partial<ClassicEditorHostAcquireIntent> = {}
): ClassicEditorHostAcquireIntent {
  return {
    kind: "acquire",
    jobId: "job",
    operationId: "operation",
    attempt: 0,
    generation: 1,
    purpose: "image",
    policyRevision: "policy-1",
    source: { kind: "file", id: "source" },
    ...override
  };
}

/**
 * Completes a partial typed adapter fixture with deterministic denied methods.
 *
 * @param override - Adapter methods exercised by the current test.
 * @returns Complete Host service contract without unsafe casts.
 */
export function createHostTestServices(
  override: Partial<ClassicEditorHostServices> = {}
): ClassicEditorHostServices {
  return {
    ...createDefaultClassicEditorHostServices(),
    ...override
  };
}

/**
 * Creates one externally settled promise.
 *
 * @returns Deferred promise and its resolver.
 */
export function createHostTestDeferred<Value>(): HostTestDeferred<Value> {
  let settle: ((value: Value) => void) | undefined;
  const promise = new Promise<Value>((resolve) => {
    settle = resolve;
  });
  return {
    promise,
    resolve: (value) => {
      if (settle === undefined) throw new Error("Host test deferred is unavailable.");
      settle(value);
    }
  };
}
