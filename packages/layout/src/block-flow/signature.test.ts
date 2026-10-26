import { describe, expect, it, vi } from "vitest";
import {
  defineQuireLazyLayoutSignature,
  forwardQuireLayoutSignature,
  readMaterializedQuireLayoutSignature
} from ".";

describe("block-flow layout signatures", () => {
  it("forwards lazy signatures without eagerly computing them", () => {
    const compute = vi.fn(() => "stable");
    const source = defineQuireLazyLayoutSignature({}, compute);
    const target = forwardQuireLayoutSignature({}, source);

    expect(compute).not.toHaveBeenCalled();
    expect(readMaterializedQuireLayoutSignature(target)).toBeUndefined();
    expect("layoutSignature" in target).toBe(true);
    expect((target as { readonly layoutSignature?: string }).layoutSignature).toBe("stable");
    expect(compute).toHaveBeenCalledOnce();
  });
});
