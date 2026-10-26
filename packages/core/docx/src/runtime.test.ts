import { afterEach, describe, expect, it } from "vitest";
import { copyDocxBytes, isEmptyDocxPackagePlan, loadDocxRuntime, provideDocxRuntime } from "./runtime";
import type { DocxManagerRuntime } from "./types";

// The real implementation lives outside this package; an opaque stand-in proves loader selection only.
const registered = { id: "registered" } as unknown as DocxManagerRuntime;
const own = { id: "own" } as unknown as DocxManagerRuntime;

afterEach(() => provideDocxRuntime(undefined));

describe("DOCX runtime loading", () => {
  it("explains how to provide an implementation when none is registered", async () => {
    await expect(loadDocxRuntime(undefined)).rejects.toThrow("provideDocxRuntime");
  });

  it("uses the registered loader and lets a Manager's own loader take precedence", async () => {
    provideDocxRuntime(async () => registered);
    await expect(loadDocxRuntime(undefined)).resolves.toBe(registered);
    await expect(loadDocxRuntime(async () => own)).resolves.toBe(own);
  });
});

describe("DOCX package helpers", () => {
  it("detects package plans without resources, relationships or parts", () => {
    expect(isEmptyDocxPackagePlan({ resources: [], relationships: [], parts: [] } as never)).toBe(true);
    expect(isEmptyDocxPackagePlan({ resources: [], relationships: [], parts: [{}] } as never)).toBe(false);
  });

  it("copies a byte view without the surrounding buffer", () => {
    const view = new Uint8Array([9, 1, 2, 3, 9]).subarray(1, 4);
    const copy = copyDocxBytes(view);
    expect([...copy]).toEqual([1, 2, 3]);
    expect(copy.buffer.byteLength).toBe(3);
  });
});
