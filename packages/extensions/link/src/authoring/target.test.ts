import { describe, expect, it } from "vitest";
import { normalizeLinkAuthoringHref } from "./target";

describe("link authoring targets", () => {
  it.each([
    ["www.example.com/docs", "https://www.example.com/docs"],
    [" example.com ", "https://example.com"],
    ["editor@example.com", "mailto:editor@example.com"],
    ["https://example.com/a?q=x#y", "https://example.com/a?q=x#y"],
    ["mailto:editor@example.com?subject=Hi", "mailto:editor@example.com?subject=Hi"],
    ["tel:+861234", "tel:+861234"],
    ["../docs", "../docs"], ["./page.html", "./page.html"],
    ["/docs", "/docs"], ["#bookmark", "#bookmark"]
  ])("normalizes %s only at authoring time", (input, expected) => {
    expect(normalizeLinkAuthoringHref(input)).toBe(expected);
  });
  it.each(["", "not-a-website", "https://", "https://?bad", "javascript:alert(1)",
    "data:text/html,x", "https://exa mple.com", "www.example.com\nalert", "a".repeat(2049)])(
    "rejects ambiguous or unsafe input %s", value => {
      expect(normalizeLinkAuthoringHref(value)).toBeNull();
    }
  );
});
