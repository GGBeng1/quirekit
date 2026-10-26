import { describe, expect, it } from "vitest";
import { diagramFrameBootstrap, diagramFrameBootstrapHash } from "./isolated";

describe("sandbox bootstrap", () => {
  it("is allowed by its own CSP hash", async () => {
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(diagramFrameBootstrap)));
    expect(diagramFrameBootstrapHash).toBe(`sha256-${btoa(String.fromCharCode(...digest))}`);
  });
});
