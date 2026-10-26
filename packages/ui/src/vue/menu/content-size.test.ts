import { describe, expect, it } from "vitest";
import { menuVariableReferences } from "../../components/menu";
import { resolveViewportMenuContentStyle, resolveMenuContentStyle } from "./content-size";

describe("Menu content sizing", () => {
  it("uses the stable component width when no sizing constraint is supplied", () => {
    expect(resolveMenuContentStyle(undefined, undefined, undefined)).toEqual({
      width: menuVariableReferences.geometry.contentWidth
    });
  });

  it("lets min and max constraints grow from content without inheriting the default width", () => {
    expect(resolveMenuContentStyle(undefined, "160px", "280px")).toEqual({
      width: "auto",
      minWidth: "160px",
      maxWidth: "280px"
    });
  });

  it("keeps an explicit width authoritative while retaining optional bounds", () => {
    expect(resolveMenuContentStyle("18rem", undefined, "90vw")).toEqual({
      width: "18rem",
      maxWidth: "90vw"
    });
  });

  it("caps an oversized context-menu minimum along with its maximum", () => {
    expect(resolveViewportMenuContentStyle(640, 600, "42rem")).toEqual({
      width: 640,
      minWidth: "min(600px, calc(100vw - 16px))",
      maxWidth: "min(42rem, calc(100vw - 16px))",
      maxHeight: "min(60dvh, var(--available-height, calc(100dvh - 16px)))"
    });
  });

  it("retains ordinary default width while limiting contextual overflow", () => {
    expect(resolveViewportMenuContentStyle(undefined, undefined, undefined)).toEqual({
      width: menuVariableReferences.geometry.contentWidth,
      maxWidth: "min(100vw, calc(100vw - 16px))",
      maxHeight: "min(60dvh, var(--available-height, calc(100dvh - 16px)))"
    });
  });
});
