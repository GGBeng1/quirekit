import { describe, expect, it } from "vitest";
import {
  computeQuireWebFontSha256,
  verifyQuireWebFontIntegrity
} from "./integrity";

describe("web-font integrity", () => {
  it("computes and verifies SRI-shaped SHA-256 values", async () => {
    const bytes = new TextEncoder().encode("quirekit-font-fixture").buffer;
    const digest = await computeQuireWebFontSha256(bytes);

    expect(digest).toMatch(/^sha256-/);
    await expect(verifyQuireWebFontIntegrity(bytes, digest)).resolves.toBe(digest);
  });

  it("rejects bytes that do not match the manifest digest", async () => {
    const bytes = new TextEncoder().encode("wrong").buffer;

    await expect(
      verifyQuireWebFontIntegrity(bytes, "sha256-vurI8Ao7d5mYH9vJ3eJm+Z5Lw9Y=")
    ).rejects.toMatchObject({ code: "integrity" });
  });
});
