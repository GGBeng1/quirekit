import { QuireEditor, type QuireJSONContent } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { WordParagraph } from "@quirekit/classic-paragraph-model";
import {
  createDefaultWordParagraphStyleRegistry,
  WordStyles
} from "@quirekit/classic-styles-model";
import { WordNumbering } from "../extension";
import { resolveWordNumberingMarkers } from "./markers";
import { resolveWordNumberingRegistry } from "../model";
import type { WordNumberingRegistry } from "../types";
import { isWordListKindActive } from "../selection";

describe("Word numbering marker resolution", () => {
  it("numbers through styles, honors direct suppression and ranks style indentation over the level", () => {
    const styles = createDefaultWordParagraphStyleRegistry();
    const normal = styles.styles.Normal!;
    const dxa = (value: number) => ({ unit: "dxa" as const, value });
    const styleRegistry = { ...styles, styles: { ...styles.styles,
      ListNumber: { ...normal, id: "ListNumber", name: "List Number", role: "custom" as const, basedOn: "Normal",
        default: false, numbering: { numId: "first", level: null } },
      ListWide: { ...normal, id: "ListWide", name: "List Wide", role: "custom" as const, basedOn: "ListNumber",
        default: false, paragraph: { indentation: { start: dxa(1440), end: null, firstLine: dxa(-360) } } }
    } };
    const styled = (text: string, styleId: string, wordNumbering: unknown = null): QuireJSONContent => ({
      type: "paragraph",
      attrs: { wordParagraph: { styleId }, wordNumbering },
      content: [{ type: "text", text }]
    });
    const editor = new QuireEditor({
      extensions: [StarterKit, WordParagraph, WordStyles, WordNumbering],
      content: { type: "doc", attrs: {
        wordNumberingRegistry: createRegistry({ first: "quirekit-decimal" }),
        wordStyleRegistry: styleRegistry
      }, content: [styled("a", "ListNumber"), styled("b", "ListNumber", "none"), styled("c", "ListWide"),
        numberedParagraph("d", "first", 0)] }
    });
    const markers = [...resolveWordNumberingMarkers(editor.state.doc).values()];
    expect(markers.map((marker) => marker.text)).toEqual(["1.", "2.", "3."]);
    expect(markers[1]!.indentation.start).toEqual(dxa(1440));
    expect(markers[0]!.indentation.start).not.toEqual(dxa(1440));
    editor.destroy();
  });

  it("resets ordered descendants under bullet ancestors and honors legal numbering", () => {
    const registry = createRegistry({ first: "quirekit-decimal" });
    const base = registry.abstractNums["quirekit-decimal"]!;
    const editor = createEditor({
      wordNumberingRegistry: { ...registry, abstractNums: { ...registry.abstractNums,
        "quirekit-decimal": { ...base, kind: "bullet", levels: { ...base.levels,
          "0": { ...base.levels["0"]!, format: "bullet", text: "•" },
          "1": { ...base.levels["1"]!, text: "%2)", format: "lowerLetter" }
        } }
      } }, content: [numberedParagraph("a", "first", 0), numberedParagraph("b", "first", 1),
        numberedParagraph("c", "first", 1), numberedParagraph("d", "first", 0), numberedParagraph("e", "first", 1)]
    });
    expect([...resolveWordNumberingMarkers(editor.state.doc).values()].map(marker => [marker.text, marker.kind]))
      .toEqual([["•", "bullet"], ["a)", "ordered"], ["b)", "ordered"], ["•", "bullet"], ["a)", "ordered"]]);
    editor.commands.setTextSelection(4);
    expect(isWordListKindActive(editor.state, "ordered")).toBe(true);
    expect(editor.commands.toggleWordOrderedList()).toBe(true);
    expect(editor.state.doc.child(1).attrs.wordNumbering).toBeNull();
    editor.destroy();
    const legal = createEditor({ wordNumberingRegistry: { ...registry, abstractNums: {
      ...registry.abstractNums, "quirekit-decimal": { ...base, levels: { ...base.levels,
        "0": { ...base.levels["0"]!, format: "upperRoman", start: 4 },
        "1": { ...base.levels["1"]!, format: "lowerLetter", text: "%1.%2)", isLegal: true }
      } }
    } }, content: [numberedParagraph("parent", "first", 0), numberedParagraph("child", "first", 1)] });
    expect([...resolveWordNumberingMarkers(legal.state.doc).values()].map(marker => marker.text)).toEqual(["IV.", "4.1)"]);
    legal.destroy();
  });

  it("advances independent ordered instances and expands multilevel labels", () => {
    const editor = createEditor({
      wordNumberingRegistry: createRegistry({
        first: "quirekit-decimal",
        second: "quirekit-decimal"
      }),
      content: [
        numberedParagraph("one", "first", 0),
        numberedParagraph("two", "first", 0),
        numberedParagraph("nested", "first", 1),
        numberedParagraph("separate", "second", 0)
      ]
    });

    expect([...resolveWordNumberingMarkers(editor.state.doc).values()]
      .map((marker) => marker.text))
      .toEqual(["1.", "2.", "2.1.", "1."]);
  });

  it("formats every placeholder with its referenced level definition", () => {
    const registry = createRegistry({ first: "quirekit-decimal" });
    const decimal = registry.abstractNums["quirekit-decimal"];
    if (decimal === undefined) throw new Error("Missing decimal definition fixture.");
    const levelZero = decimal.levels["0"];
    const levelOne = decimal.levels["1"];
    if (levelZero === undefined || levelOne === undefined) {
      throw new Error("Missing multilevel definition fixture.");
    }
    const editor = createEditor({
      wordNumberingRegistry: {
        ...registry,
        abstractNums: {
          ...registry.abstractNums,
          "quirekit-decimal": {
            ...decimal,
            levels: {
              ...decimal.levels,
              "0": { ...levelZero, format: "upperRoman", start: 4 },
              "1": {
                ...levelOne,
                format: "lowerLetter",
                text: "%1.%2)",
                start: 2
              }
            }
          }
        }
      },
      content: [
        numberedParagraph("roman", "first", 0),
        numberedParagraph("letter", "first", 1),
        numberedParagraph("letter next", "first", 1)
      ]
    });

    expect([...resolveWordNumberingMarkers(editor.state.doc).values()]
      .map((marker) => marker.text))
      .toEqual(["IV.", "IV.b)", "IV.c)"]);
  });

  it("uses each referenced level custom expression and marker language", () => {
    const registry = createRegistry({ first: "quirekit-decimal" });
    const decimal = registry.abstractNums["quirekit-decimal"];
    const levelZero = decimal?.levels["0"];
    const levelOne = decimal?.levels["1"];
    if (decimal === undefined || levelZero === undefined || levelOne === undefined) {
      throw new Error("Missing multilevel definition fixture.");
    }
    const editor = createEditor({
      wordNumberingRegistry: {
        ...registry,
        abstractNums: {
          ...registry.abstractNums,
          "quirekit-decimal": {
            ...decimal,
            levels: {
              ...decimal.levels,
              "0": {
                ...levelZero,
                format: "custom",
                customFormat: "0001, 0002, 0003, ...",
                text: "%1."
              },
              "1": {
                ...levelOne,
                format: "ordinal",
                text: "%1.%2",
                markerStyle: {
                  language: { value: "fr-FR" }
                }
              }
            }
          }
        }
      },
      content: [
        numberedParagraph("custom", "first", 0),
        numberedParagraph("localized child", "first", 1)
      ]
    });

    expect([...resolveWordNumberingMarkers(editor.state.doc).values()]
      .map((marker) => marker.text))
      .toEqual(["0001.", "0001.1er"]);
  });

  it("honors omitted, explicit, and never-restart level policies", () => {
    const defaults = createRegistry({ first: "quirekit-decimal" });
    const decimal = defaults.abstractNums["quirekit-decimal"];
    if (decimal === undefined) throw new Error("Missing decimal definition fixture.");
    const levelOne = decimal.levels["1"];
    if (levelOne === undefined) throw new Error("Missing level-one fixture.");
    const neverRestartRegistry: WordNumberingRegistry = {
      ...defaults,
      abstractNums: {
        ...defaults.abstractNums,
        "quirekit-decimal": {
          ...decimal,
          levels: {
            ...decimal.levels,
            "1": { ...levelOne, restartAfterLevel: null }
          }
        }
      }
    };
    const neverRestart = createEditor({
      wordNumberingRegistry: neverRestartRegistry,
      content: [
        numberedParagraph("one", "first", 0),
        numberedParagraph("nested one", "first", 1),
        numberedParagraph("two", "first", 0),
        numberedParagraph("nested two", "first", 1)
      ]
    });

    expect([...resolveWordNumberingMarkers(neverRestart.state.doc).values()]
      .map((marker) => marker.text))
      .toEqual(["1.", "1.1.", "2.", "2.2."]);

    const defaultRestart = createEditor({
      wordNumberingRegistry: defaults,
      content: [
        numberedParagraph("one", "first", 0),
        numberedParagraph("nested one", "first", 1),
        numberedParagraph("two", "first", 0),
        numberedParagraph("nested two", "first", 1)
      ]
    });
    expect([...resolveWordNumberingMarkers(defaultRestart.state.doc).values()]
      .map((marker) => marker.text))
      .toEqual(["1.", "1.1.", "2.", "2.1."]);
  });

  it("resolves bullet and checked task markers without editable text", () => {
    const editor = createEditor({
      wordNumberingRegistry: createRegistry({
        bullets: "quirekit-bullet",
        tasks: "quirekit-task"
      }),
      content: [
        numberedParagraph("bullet", "bullets", 1),
        numberedParagraph("todo", "tasks", 0, false),
        numberedParagraph("done", "tasks", 0, true)
      ]
    });

    const markers = [...resolveWordNumberingMarkers(editor.state.doc).values()];
    expect(markers.map((marker) => marker.text)).toEqual(["◦", "☐", "☑"]);
    expect(markers.map((marker) => marker.checked)).toEqual([null, false, true]);
  });

  it("retains the numbering-level marker style as an explicit resolved delta", () => {
    const registry = createRegistry({ bullets: "quirekit-bullet" });
    const bullets = registry.abstractNums["quirekit-bullet"];
    const level = bullets?.levels["0"];
    if (bullets === undefined || level === undefined) {
      throw new Error("Missing built-in bullet fixture.");
    }
    const markerStyle = {
      fonts: {
        ascii: "Wingdings",
        highAnsi: "Wingdings",
        eastAsia: "SimSun",
        complexScript: "Arial",
        hint: "default" as const
      },
      fontSizePt: 20,
      bold: false,
      italic: true,
      color: "#4472C4",
      underline: true,
      strike: false
    };
    const editor = createEditor({
      wordNumberingRegistry: {
        ...registry,
        abstractNums: {
          ...registry.abstractNums,
          "quirekit-bullet": {
            ...bullets,
            levels: {
              ...bullets.levels,
              "0": { ...level, text: "\uF06C", markerStyle }
            }
          }
        }
      },
      content: [numberedParagraph("styled", "bullets", 0)]
    });

    expect([...resolveWordNumberingMarkers(editor.state.doc).values()][0]).toMatchObject({
      text: "\uF06C",
      markerStyle
    });
  });

  it("aligns built-in level-zero markers with the ordinary paragraph boundary", () => {
    const editor = new QuireEditor({
      extensions: [StarterKit, WordParagraph, WordNumbering]
    });

    for (const command of [
      () => editor.commands.toggleWordBulletList(),
      () => editor.commands.toggleWordOrderedList(),
      () => editor.commands.toggleWordTaskList()
    ]) {
      expect(command()).toBe(true);
      const marker = [...resolveWordNumberingMarkers(editor.state.doc).values()][0];
      expect(marker?.indentation).toEqual({
        start: { unit: "dxa", value: 360 },
        end: null,
        firstLine: { unit: "dxa", value: -360 }
      });
      expect(marker?.justification).toBe("start");
      expect(command()).toBe(true);
    }
  });

  it("merges direct paragraph indentation over level defaults field by field", () => {
    const numbered = numberedParagraph("override", "first", 0);
    const paragraph: QuireJSONContent = {
      ...numbered,
      attrs: {
        ...numbered.attrs,
      wordParagraph: {
        indentation: {
          start: { unit: "dxa", value: 1080 },
          end: { unit: "dxa", value: 240 },
          firstLine: null
        }
      }
      }
    };
    const editor = createEditor({
      wordNumberingRegistry: createRegistry({ first: "quirekit-decimal" }),
      content: [paragraph]
    });

    const marker = [...resolveWordNumberingMarkers(editor.state.doc).values()][0];
    expect(marker?.indentation).toEqual({
      start: { unit: "dxa", value: 1080 },
      end: { unit: "dxa", value: 240 },
      firstLine: { unit: "dxa", value: -360 }
    });
  });

  it("lets explicit direct zeros override inherited list indentation", () => {
    const numbered = numberedParagraph("override", "first", 0);
    const paragraph: QuireJSONContent = {
      ...numbered,
      attrs: {
        ...numbered.attrs,
        wordParagraph: {
          indentation: {
            start: { unit: "character", value: 0 },
            end: null,
            firstLine: { unit: "character", value: 0 }
          }
        }
      }
    };
    const editor = createEditor({
      wordNumberingRegistry: createRegistry({ first: "quirekit-decimal" }),
      content: [paragraph]
    });

    const marker = [...resolveWordNumberingMarkers(editor.state.doc).values()][0];
    expect(marker?.levelIndentation).toEqual({
      start: { unit: "dxa", value: 360 },
      end: null,
      firstLine: { unit: "dxa", value: -360 }
    });
    expect(marker?.indentation).toEqual({
      start: { unit: "character", value: 0 },
      end: null,
      firstLine: { unit: "character", value: 0 }
    });
  });

  it("merges style, numbering-level, and direct indentation field by field", () => {
    const styles = createDefaultWordParagraphStyleRegistry();
    const normal = styles.styles.Normal;
    if (normal === undefined) throw new Error("Missing Normal style fixture.");
    const numbered = numberedParagraph("styled override", "first", 0);
    const paragraph: QuireJSONContent = {
      ...numbered,
      attrs: {
        ...numbered.attrs,
        wordParagraph: {
          styleId: "NumberedBody",
          indentation: {
            start: { unit: "dxa", value: 1080 },
            end: null,
            firstLine: null
          }
        }
      }
    };
    const zeroNumbered = numberedParagraph("explicit zeros", "first", 0);
    const zeroParagraph: QuireJSONContent = {
      ...zeroNumbered,
      attrs: {
        ...zeroNumbered.attrs,
        wordParagraph: {
          styleId: "NumberedBody",
          indentation: {
            start: { unit: "character", value: 0 },
            end: null,
            firstLine: { unit: "character", value: 0 }
          }
        }
      }
    };
    const editor = new QuireEditor({
      extensions: [StarterKit, WordParagraph, WordStyles, WordNumbering],
      content: {
        type: "doc",
        attrs: {
          wordNumberingRegistry: createRegistry({
            first: "quirekit-decimal"
          }),
          wordStyleRegistry: {
            ...styles,
            styles: {
              ...styles.styles,
              NumberedBody: {
                ...normal,
                id: "NumberedBody",
                name: "Numbered Body",
                role: "custom",
                basedOn: "Normal",
                default: false,
                paragraph: {
                  indentation: {
                    start: { unit: "dxa", value: 720 },
                    end: { unit: "dxa", value: 240 },
                    firstLine: { unit: "dxa", value: -180 }
                  }
                }
              }
            }
          }
        },
        content: [paragraph, zeroParagraph]
      }
    });

    const markers = [...resolveWordNumberingMarkers(editor.state.doc).values()];
    expect(markers[0]?.indentation).toEqual({
      start: { unit: "dxa", value: 1080 },
      end: { unit: "dxa", value: 240 },
      firstLine: { unit: "dxa", value: -360 }
    });
    expect(markers[1]?.indentation).toEqual({
      start: { unit: "character", value: 0 },
      end: { unit: "dxa", value: 240 },
      firstLine: { unit: "character", value: 0 }
    });
  });

  it("rejects malformed registries instead of accepting dangling numbering authority", () => {
    const registry = resolveWordNumberingRegistry({
      abstractNums: {},
      nums: { broken: { id: "broken", abstractNumId: "missing" } },
      nextInstanceId: 2
    });

    expect(registry.nums).toEqual({});
    expect(registry.abstractNums["quirekit-decimal"]).toBeDefined();
  });

  it("rejects malformed marker style fields instead of persisting ambiguous paint state", () => {
    const registry = createRegistry({ bullets: "quirekit-bullet" });
    const bullets = registry.abstractNums["quirekit-bullet"];
    const level = bullets?.levels["0"];
    if (bullets === undefined || level === undefined) {
      throw new Error("Missing built-in bullet fixture.");
    }
    const resolved = resolveWordNumberingRegistry({
      ...registry,
      abstractNums: {
        ...registry.abstractNums,
        "quirekit-bullet": {
          ...bullets,
          levels: {
            ...bullets.levels,
            "0": { ...level, markerStyle: { bold: "yes" } }
          }
        }
      }
    });

    expect(resolved.abstractNums["quirekit-bullet"]?.levels["0"]?.markerStyle)
      .toBeUndefined();
    expect(resolved.nums).toEqual({});
  });

  it.each([0, -1, 10.25, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects marker font size %s outside positive OOXML half-point values",
    (fontSizePt) => {
      const registry = createRegistry({ bullets: "quirekit-bullet" });
      const bullets = registry.abstractNums["quirekit-bullet"];
      const level = bullets?.levels["0"];
      if (bullets === undefined || level === undefined) {
        throw new Error("Missing built-in bullet fixture.");
      }

      const resolved = resolveWordNumberingRegistry({
        ...registry,
        abstractNums: {
          ...registry.abstractNums,
          "quirekit-bullet": {
            ...bullets,
            levels: {
              ...bullets.levels,
              "0": { ...level, markerStyle: { fontSizePt } }
            }
          }
        }
      });

      expect(resolved.abstractNums["quirekit-bullet"]?.levels["0"]?.markerStyle)
        .toBeUndefined();
      expect(resolved.nums).toEqual({});
    }
  );
});

/**
 * Creates an editor that accepts flat Word numbering attrs.
 *
 * @param document - JSON document attrs and paragraph content.
 * @returns Editor containing the requested numbering fixture.
 */
function createEditor(document: {
  readonly wordNumberingRegistry: unknown;
  readonly content: readonly QuireJSONContent[];
}): QuireEditor {
  return new QuireEditor({
    extensions: [StarterKit, WordParagraph, WordNumbering],
    content: {
      type: "doc",
      attrs: { wordNumberingRegistry: document.wordNumberingRegistry },
      content: [...document.content]
    }
  });
}

/**
 * Creates a valid registry with the requested concrete instances.
 *
 * @param instances - Map from concrete ids to built-in abstract definition ids.
 * @returns JSON registry accepted by the numbering extension.
 */
function createRegistry(
  instances: Readonly<Record<string, string>>
): WordNumberingRegistry {
  const editor = new QuireEditor({
    extensions: [StarterKit, WordParagraph, WordNumbering]
  });
  editor.commands.toggleWordOrderedList();
  const defaults = resolveWordNumberingRegistry(
    editor.state.doc.attrs.wordNumberingRegistry
  );
  editor.destroy();
  return {
    abstractNums: defaults.abstractNums,
    nums: Object.fromEntries(Object.entries(instances).map(([id, abstractNumId]) => [
      id,
      { id, abstractNumId }
    ])),
    nextInstanceId: 100
  };
}

/**
 * Creates one flat numbered paragraph JSON node.
 *
 * @param text - Editable paragraph text.
 * @param numId - Concrete numbering instance id.
 * @param level - Zero-based numbering level.
 * @param checked - Optional task checked state.
 * @returns JSON node accepted by the editor schema.
 */
function numberedParagraph(
  text: string,
  numId: string,
  level: number,
  checked?: boolean
): QuireJSONContent {
  return {
    type: "paragraph",
    attrs: {
      wordNumbering: {
        numId,
        level,
        startOverride: null,
        task: checked === undefined ? null : { checked }
      }
    },
    content: [{ type: "text", text }]
  };
}
