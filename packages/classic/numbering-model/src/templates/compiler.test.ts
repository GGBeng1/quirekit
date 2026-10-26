import { describe, expect, it } from "vitest";
import {
  createBuiltinWordNumberingPresets,
  decimalDotWordOrderedPresetId,
  defaultWordOrderedPresetId
} from "../presets";
import type {
  WordNumberingPresetContribution,
  WordNumberingPresetRegistry
} from "../presets";
import { compileWordNumberingTemplate } from "./compiler";

describe("Word numbering template compiler", () => {
  it("materializes partial multilevel overrides into an owned nine-level preset", () => {
    const registry = createRegistry(createBuiltinWordNumberingPresets());
    const base = registry.get(defaultWordOrderedPresetId);
    const preset = compileWordNumberingTemplate({
      id: "consumer.legal-outline",
      basePresetId: defaultWordOrderedPresetId,
      scope: "multilevel",
      levels: [
        {
          level: 0,
          text: "%1)",
          paragraphIndentation: {
            start: { unit: "dxa", value: 720 }
          }
        },
        {
          level: 2,
          format: "lowerLetter",
          text: "%1.%2.%3)",
          restartAfterLevel: 0,
          markerStyle: {
            bold: true,
            complexScriptBold: false,
            complexScriptItalic: true,
            complexScriptFontSizePt: 12,
            fonts: {
              ascii: "Carlito",
              asciiTheme: "majorAscii",
              eastAsiaTheme: "minorEastAsia"
            }
          }
        }
      ]
    }, registry);

    expect(preset.scope).toBe("multilevel");
    expect(preset.kind).toBe("ordered");
    expect(preset.scope === "multilevel"
      && Object.keys(preset.levels)).toEqual([
      "0", "1", "2", "3", "4", "5", "6", "7", "8"
    ]);
    expect(preset.scope === "multilevel" && preset.levels["0"]).toMatchObject({
      text: "%1)",
      paragraphIndentation: {
        start: { unit: "dxa", value: 720 },
        end: null,
        firstLine: { unit: "dxa", value: -360 }
      }
    });
    expect(preset.scope === "multilevel" && preset.levels["1"]).toEqual(
      base?.scope === "multilevel" ? base.levels["1"] : undefined
    );
    expect(preset.scope === "multilevel" && preset.levels["2"]).toMatchObject({
      format: "lowerLetter",
      text: "%1.%2.%3)",
      restartAfterLevel: 0,
      markerStyle: {
        bold: true,
        complexScriptBold: false,
        complexScriptItalic: true,
        complexScriptFontSizePt: 12,
        fonts: {
          ascii: "Carlito",
          asciiTheme: "majorAscii",
          eastAsiaTheme: "minorEastAsia"
        }
      }
    });
    expect(Object.isFrozen(preset)).toBe(true);
    expect(preset.scope === "multilevel"
      && Object.isFrozen(preset.levels["2"]?.markerStyle?.fonts)).toBe(true);
    expect(base?.scope === "multilevel" && base.levels["0"]?.text).toBe("%1.");
  });

  it("compiles portable single-level templates and explicit restart defaults", () => {
    const registry = createRegistry(createBuiltinWordNumberingPresets());
    const preset = compileWordNumberingTemplate({
      id: "consumer.decimal-paren",
      basePresetId: decimalDotWordOrderedPresetId,
      scope: "singleLevel",
      level: {
        text: "(%1)",
        restartAfterLevel: "default",
        markerStyle: {
          color: "#2563EB",
          underline: true
        }
      }
    }, registry);

    expect(preset).toMatchObject({
      id: "consumer.decimal-paren",
      kind: "ordered",
      scope: "singleLevel",
      level: {
        format: "decimal",
        text: "(%1)",
        markerStyle: {
          color: "#2563EB",
          underline: true
        }
      }
    });
    expect(preset.scope === "singleLevel"
      && "restartAfterLevel" in preset.level).toBe(false);
  });

  it("rejects mismatched scope, unordered levels, and invalid semantic overrides", () => {
    const registry = createRegistry(createBuiltinWordNumberingPresets());

    expect(() => compileWordNumberingTemplate({
      id: "consumer.scope",
      basePresetId: decimalDotWordOrderedPresetId,
      scope: "multilevel",
      levels: [{ level: 0 }]
    }, registry)).toThrow(/scope/u);
    expect(() => compileWordNumberingTemplate({
      id: "consumer.order",
      basePresetId: defaultWordOrderedPresetId,
      scope: "multilevel",
      levels: [{ level: 2 }, { level: 1 }]
    }, registry)).toThrow(/ascending/u);
    expect(() => compileWordNumberingTemplate({
      id: "consumer.reference",
      basePresetId: defaultWordOrderedPresetId,
      scope: "multilevel",
      levels: [{ level: 0, text: "%2." }]
    }, registry)).toThrow(/deeper level/u);
    expect(() => compileWordNumberingTemplate({
      id: "consumer.format",
      basePresetId: decimalDotWordOrderedPresetId,
      scope: "singleLevel",
      level: { format: "bullet", text: "•" }
    }, registry)).toThrow(/incompatible/u);
  });
});

/**
 * Builds the public immutable lookup shape around already normalized built-ins.
 *
 * @param presets - Semantic presets used as compiler bases.
 * @returns Minimal deterministic registry.
 */
function createRegistry(
  presets: readonly WordNumberingPresetContribution[]
): WordNumberingPresetRegistry {
  const byId = new Map(presets.map((preset) => [preset.id, preset]));
  return {
    presets,
    get(id: string) {
      return byId.get(id);
    }
  };
}
