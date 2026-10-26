import { describe, expect, it } from "vitest";
import {
  matchesClassicFontOption,
  projectClassicFontOptionSources,
  resolveClassicFontAvailabilityDiagnostic,
  resolveClassicDocumentFontFamilies,
  resolveClassicDocumentFontTarget,
  resolveClassicMarkedFontTarget
} from "./model";

describe("Classic compact font picker model", () => {
  it("keeps complex-script defaults and direct overrides separate from the Latin slot", () => {
    expect(resolveClassicMarkedFontTarget({ fontFamily: "Common", fontFamilyLatin: "Latin", fontFamilyComplexScript: "Amiri" }, "complexScript"))
      .toEqual({ family: "Amiri", hasDirect: true });
    expect(resolveClassicMarkedFontTarget({ fontFamily: "Common", fontFamilyLatin: "Latin" }, "complexScript"))
      .toEqual({ family: "Common", hasDirect: true });
    expect(resolveClassicDocumentFontFamilies({ body: { latin: "Latin", eastAsia: "CJK", complexScript: "Amiri" } }, "complexScript"))
      .toEqual(["Amiri"]);
  });

  it("reports mixed all-script state for independent direct slots", () => {
    expect(resolveClassicMarkedFontTarget({
      fontFamilyLatin: "Arial",
      fontFamilyEastAsia: "宋体"
    }, "all")).toEqual({ family: null, hasDirect: true });
  });

  it("uses the generic family as the all-script fallback", () => {
    expect(resolveClassicMarkedFontTarget({
      fontFamily: "Noto Serif SC",
      fontFamilyLatin: "Arial"
    }, "eastAsia")).toEqual({
      family: "Noto Serif SC",
      hasDirect: true
    });
  });

  it("reads independent families from the document theme", () => {
    const theme = { body: { latin: "Aptos", eastAsia: "等线" } };

    expect(resolveClassicDocumentFontTarget(theme, "latin")).toBe("Aptos");
    expect(resolveClassicDocumentFontTarget(theme, "eastAsia")).toBe("等线");
    expect(resolveClassicDocumentFontTarget(theme, "all")).toBeNull();
    expect(resolveClassicDocumentFontFamilies(theme, "all")).toEqual([
      "Aptos",
      "等线"
    ]);
  });

  it("reports one document default only when every role and script agrees", () => {
    const uniform = {
      body: {
        latin: "Company Sans",
        eastAsia: "Company Sans",
        complexScript: "Company Sans"
      },
      heading: {
        latin: "Company Sans",
        eastAsia: "Company Sans",
        complexScript: "Company Sans"
      }
    };
    const mixed = {
      ...uniform,
      heading: { ...uniform.heading, eastAsia: "Company Display" }
    };

    expect(resolveClassicDocumentFontTarget(uniform, "document"))
      .toBe("Company Sans");
    expect(resolveClassicDocumentFontTarget(mixed, "document")).toBeNull();
    expect(resolveClassicDocumentFontFamilies(mixed, "document")).toEqual([
      "Company Sans",
      "Company Display"
    ]);
  });

  it("matches both CSS identity and localized display name", () => {
    expect(matchesClassicFontOption("ping", ["PingFang SC", "苹方"])).toBe(true);
    expect(matchesClassicFontOption("苹", ["PingFang SC", "苹方"])).toBe(true);
    expect(matchesClassicFontOption("宋", ["PingFang SC", "苹方"])).toBe(false);
  });

  it("keeps an unimported effective family as the first real option", () => {
    const imported = [
      { family: "Roboto", sourceId: "fixture" },
      { family: "Noto Sans SC", sourceId: "fixture" }
    ];

    expect(projectClassicFontOptionSources(
      "Noto Serif SC",
      ["Noto Serif SC"],
      imported
    )).toEqual([
      {
        family: "Noto Serif SC",
        imported: undefined,
        current: true,
        documentDefault: true
      },
      {
        family: "Roboto",
        imported: imported[0],
        current: false,
        documentDefault: false
      },
      {
        family: "Noto Sans SC",
        imported: imported[1],
        current: false,
        documentDefault: false
      }
    ]);
  });

  it("moves an imported effective family first without duplicating it", () => {
    const imported = [
      { family: "Roboto", sourceId: "fixture-a" },
      { family: "Noto Serif SC", sourceId: "fixture-b" },
      { family: "Noto Serif SC", sourceId: "fixture-c" }
    ];

    expect(projectClassicFontOptionSources(
      "noto serif sc",
      ["Noto Serif SC"],
      imported
    )).toEqual([
      {
        family: "noto serif sc",
        imported: imported[1],
        current: true,
        documentDefault: true
      },
      {
        family: "Roboto",
        imported: imported[0],
        current: false,
        documentDefault: false
      }
    ]);
  });

  it("retains document defaults below a different direct current family", () => {
    const imported = [
      { family: "Roboto", sourceId: "fixture-a" },
      { family: "Noto Serif SC", sourceId: "fixture-b" }
    ];

    expect(projectClassicFontOptionSources(
      "Roboto",
      ["Noto Serif SC"],
      imported
    )).toEqual([
      {
        family: "Roboto",
        imported: imported[0],
        current: true,
        documentDefault: false
      },
      {
        family: "Noto Serif SC",
        imported: imported[1],
        current: false,
        documentDefault: true
      }
    ]);
  });

  it("retains distinct default script families for a mixed selection", () => {
    expect(projectClassicFontOptionSources(
      null,
      ["Aptos", "等线"],
      []
    )).toEqual([
      {
        family: "Aptos",
        imported: undefined,
        current: false,
        documentDefault: true
      },
      {
        family: "等线",
        imported: undefined,
        current: false,
        documentDefault: true
      }
    ]);
  });

  it("projects mounted families as logical choices before imported families", () => {
    const imported = [{ family: "Remote Serif", sourceId: "remote" }];
    const mounted = [
      { family: "Noto Serif SC", displayName: "Noto 宋体" },
      { family: "Remote Serif", displayName: "Bundled Serif" }
    ];

    expect(projectClassicFontOptionSources(
      "Noto Serif SC",
      ["Noto Serif SC"],
      imported,
      mounted
    )).toEqual([
      {
        family: "Noto Serif SC",
        imported: undefined,
        mounted: mounted[0],
        current: true,
        documentDefault: true
      },
      {
        family: "Remote Serif",
        imported: undefined,
        mounted: mounted[1],
        current: false,
        documentDefault: false
      }
    ]);
  });

  it("attaches warnings only after exact current-family resolution fails", () => {
    const base = {
      requestedFamily: "Missing Serif",
      renderedFamily: null,
      source: null
    } as const;

    expect(resolveClassicFontAvailabilityDiagnostic(
      "Missing Serif",
      { ...base, status: "pending" }
    )).toBeNull();
    expect(resolveClassicFontAvailabilityDiagnostic(
      "Missing Serif",
      { ...base, status: "available", renderedFamily: "Missing Serif", source: "requested" }
    )).toBeNull();
    expect(resolveClassicFontAvailabilityDiagnostic(
      "Other Serif",
      { ...base, status: "unresolved" }
    )).toBeNull();
    expect(resolveClassicFontAvailabilityDiagnostic(
      " missing serif ",
      { ...base, status: "unresolved" }
    )).toBe("unresolved");
    expect(resolveClassicFontAvailabilityDiagnostic(
      "Missing Serif",
      {
        ...base,
        status: "substituted",
        renderedFamily: "Fallback Serif",
        source: "document-alternate"
      }
    )).toBe("substituted");
  });
});
