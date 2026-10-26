import {
  Extension,
  Mark,
  Node,
  QuireEditor
} from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { WordParagraph } from "@quirekit/classic-paragraph-model";
import { describe, expect, it } from "vitest";
import { WordNumbering } from "../extension";
import { createDefaultWordNumberingRegistry } from "../model";
import { collectWordNumberingPresetRegistry } from "./registry";
import type { WordNumberingPresetContribution } from "./types";

describe("Word numbering preset registry", () => {
  it("collects built-in and Extension, Node, and Mark presets in declaration order", () => {
    const extension = Extension.create({
      name: "decimalPreset",
      addWordNumberingPresets() {
        return [singleLevelPreset("custom.decimal")];
      }
    });
    const node = Node.create({
      name: "presetBlock",
      group: "block",
      content: "inline*",
      addWordNumberingPresets() {
        return [singleLevelPreset("custom.node")];
      }
    });
    const mark = Mark.create({
      name: "presetMark",
      addWordNumberingPresets() {
        return [singleLevelPreset("custom.mark")];
      }
    });
    const editor = new QuireEditor({
      extensions: [
        StarterKit,
        WordParagraph,
        WordNumbering,
        extension,
        node,
        mark
      ]
    });

    const registry = collectWordNumberingPresetRegistry(editor.extensions);
    expect(registry.presets.map((preset) => preset.id)).toEqual([
      "word.ordered.default",
      "word.ordered.decimal-dot",
      "word.ordered.decimal-right-paren",
      "word.ordered.parenthesized-decimal",
      "word.ordered.lower-letter-dot",
      "word.ordered.parenthesized-letter",
      "word.ordered.upper-letter-dot",
      "word.ordered.lower-roman-dot",
      "word.ordered.upper-roman-dot",
      "word.ordered.enclosed-circle",
      "word.ordered.mixed",
      "word.ordered.mixed-enclosed",
      "word.ordered.office",
      "word.bullet.default",
      "word.bullet.disc",
      "word.bullet.circle",
      "word.bullet.square",
      "word.bullet.diamond",
      "word.task.default",
      "custom.decimal",
      "custom.node",
      "custom.mark"
    ]);
    expect(registry.get("custom.node")?.scope).toBe("singleLevel");
  });

  it("owns deep-frozen copies instead of caller-mutable preset records", () => {
    const source = singleLevelPreset("custom.owned");
    const extension = Extension.create({
      name: "ownedPreset",
      addWordNumberingPresets() {
        return [source];
      }
    });
    const editor = new QuireEditor({ extensions: [StarterKit, extension] });
    const preset = collectWordNumberingPresetRegistry(editor.extensions)
      .get("custom.owned")!;

    expect(Object.isFrozen(preset)).toBe(true);
    expect(Object.isFrozen(preset.scope === "singleLevel" && preset.level)).toBe(true);
    if (source.scope === "singleLevel") {
      (source.level.paragraphIndentation as { start: unknown }).start = null;
    }
    expect(preset.scope === "singleLevel"
      && preset.level.paragraphIndentation.start).toEqual({ unit: "dxa", value: 720 });
  });

  it("rejects duplicate ids with both extension owners", () => {
    const first = Extension.create({
      name: "firstPresetOwner",
      addWordNumberingPresets() {
        return [singleLevelPreset("custom.duplicate")];
      }
    });
    const second = Extension.create({
      name: "secondPresetOwner",
      addWordNumberingPresets() {
        return [singleLevelPreset("custom.duplicate")];
      }
    });
    const editor = new QuireEditor({ extensions: [StarterKit, first, second] });

    expect(() => collectWordNumberingPresetRegistry(editor.extensions))
      .toThrow(/firstPresetOwner.*secondPresetOwner/u);
  });

  it("rejects partial multilevel, incompatible kinds, and deeper references", () => {
    const defaults = createDefaultWordNumberingRegistry();
    const partial = Extension.create({
      name: "partialPreset",
      addWordNumberingPresets() {
        return [{
          id: "custom.partial",
          kind: "ordered",
          scope: "multilevel",
          levels: { "0": defaults.abstractNums["quirekit-decimal"]!.levels["0"]! }
        } as WordNumberingPresetContribution];
      }
    });
    const incompatible = Extension.create({
      name: "incompatiblePreset",
      addWordNumberingPresets() {
        return [{ ...singleLevelPreset("custom.incompatible"), kind: "bullet" }];
      }
    });
    const deeper = Extension.create({
      name: "deeperPreset",
      addWordNumberingPresets() {
        const definition = defaults.abstractNums["quirekit-decimal"]!;
        return [{
          id: "custom.deeper",
          kind: "ordered",
          scope: "multilevel",
          levels: {
            ...definition.levels,
            "0": { ...definition.levels["0"]!, text: "%2." }
          }
        } as const];
      }
    });

    expect(() => collect(partial)).toThrow(/levels 0 through 8/u);
    expect(() => collect(incompatible)).toThrow(/incompatible/u);
    expect(() => collect(deeper)).toThrow(/deeper level/u);
  });
});

/**
 * Creates one valid destination-independent decimal preset.
 *
 * @param id - Stable test preset id.
 * @returns Mutable source record used to prove registry ownership.
 */
function singleLevelPreset(id: string): WordNumberingPresetContribution {
  return {
    id,
    kind: "ordered",
    scope: "singleLevel",
    level: {
      format: "decimal",
      text: "%1)",
      start: 1,
      suffix: "tab",
      justification: "start",
      paragraphIndentation: {
        start: { unit: "dxa", value: 720 },
        end: null,
        firstLine: { unit: "dxa", value: -360 }
      }
    }
  };
}

/**
 * Collects presets from one isolated test extension.
 *
 * @param extension - Extension carrying the candidate contribution.
 * @returns Resolved registry or throws its validation diagnostic.
 */
function collect(extension: ReturnType<typeof Extension.create>) {
  const editor = new QuireEditor({ extensions: [StarterKit, extension] });
  return collectWordNumberingPresetRegistry(editor.extensions);
}
