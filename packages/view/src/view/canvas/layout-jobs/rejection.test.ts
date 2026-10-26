import { describe, expect, it } from "vitest";
import { resolveCanvasLayoutJobRejectionAction } from "./rejection";

describe("resolveCanvasLayoutJobRejectionAction", () => {
  it.each(["canceled", "stale-layout", "stale-state", "superseded"] as const)(
    "retries transient %s rejections",
    (reason) => expect(resolveCanvasLayoutJobRejectionAction(reason)).toBe("retry")
  );
  it.each(["failed", "invalid-result", "protocol-mismatch"] as const)(
    "falls back after permanent %s rejections",
    (reason) => expect(resolveCanvasLayoutJobRejectionAction(reason)).toBe("fallback")
  );
  it("stops after runtime destruction", () => {
    expect(resolveCanvasLayoutJobRejectionAction("destroyed")).toBe("stop");
  });
});
