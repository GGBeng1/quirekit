import { createEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import {
  DoubleStrike,
  Subscript,
  Superscript,
  TextStyle
} from "@quirekit/extension-text-style";
import { describe, expect, it } from "vitest";
import { buildQuireDisplayList } from "../../display-list";
import { buildQuireLayoutSnapshot } from "..";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import { CanvasBlockShapeCache } from "../../layout/cache";
import { resolveQuireMarkedFont } from "../prosemirror/font";

const fixedMeasurer: QuireTextMeasurer = {
  measureText: (text) => ({ width: Array.from(text).length * 10 })
};

describe("mark canvasStyle on canvas", () => {
  it("lays out script positions and paints double strike through shared products", () => {
    const metricMeasurer: QuireTextMeasurer = {
      measureText: (text, font) => {
        const px = Number.parseFloat(font) || 16;
        return {
          width: Array.from(text).length * px,
          ascent: px * 0.7,
          descent: px * 0.2
        };
      }
    };
    const editor = createEditor({
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        DoubleStrike,
        Superscript,
        Subscript
      ]
    });
    const schema = editor.state.schema;
    editor.setContent(schema.nodes.doc!.create(
      null,
      schema.nodes.paragraph!.create(null, [
        schema.text("a"),
        schema.text("s", [schema.marks.superscript!.create()]),
        schema.text("d", [schema.marks.doubleStrike!.create()])
      ])
    ));
    const snapshot = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect: { x: 0, y: 0, width: 300, height: 200 },
      textMeasurer: metricMeasurer,
      font: "20px sans-serif",
      textBaselineOffset: 18
    });
    const fragments = snapshot.root.children?.[0]?.textFragments ?? [];
    const plain = fragments.find((fragment) => fragment.text === "a");
    const superscript = fragments.find((fragment) => fragment.text === "s");
    const doubleStrike = fragments.find((fragment) => fragment.text === "d");

    expect(superscript?.font).toBe("13px sans-serif");
    expect(superscript?.baseline).toBeLessThan(plain!.baseline);
    expect(doubleStrike?.textDecoration).toEqual(["double-line-through"]);
    const doubleLines = buildQuireDisplayList({ snapshot }).commands.flatMap(
      (command) => (
        command.kind === "line" && command.range?.from === doubleStrike?.range.from
          ? [command]
          : []
      )
    );
    expect(doubleLines).toHaveLength(2);
    expect(doubleLines[0]?.from.y).not.toBe(doubleLines[1]?.from.y);

    editor.destroy();
  });

  it("renders a bold run with bold font via the Bold extension canvasStyle", () => {
    const editor = createEditor({ extensions: [StarterKit.configure({ undoRedo: false })] });
    const schema = editor.state.schema;
    const doc = schema.nodes.doc!;
    const paragraph = schema.nodes.paragraph!;
    const bold = schema.marks.bold!;

    editor.setContent(
      doc.create(
        null,
        paragraph.create(null, [
          schema.text("plain "),
          schema.text("strong", [bold.create()])
        ])
      )
    );

    const snapshot = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect: { x: 0, y: 0, width: 300, height: 200 },
      textMeasurer: fixedMeasurer,
      font: "16px sans-serif",
      textBaselineOffset: 18
    });

    const fragments = snapshot.root.children?.[0]?.textFragments ?? [];
    expect(fragments.find((fragment) => fragment.text === "plain ")?.font).toBe("16px sans-serif");
    expect(fragments.find((fragment) => fragment.text === "strong")?.font).toBe(
      "bold 16px sans-serif"
    );
  });

  it("applies direct normal emphasis after an inherited style and recovery conflict", () => {
    const editor = createEditor({
      extensions: [StarterKit.configure({ undoRedo: false }), TextStyle]
    });
    const textStyle = editor.state.schema.marks.textStyle!;
    const bold = editor.state.schema.marks.bold!;
    const italic = editor.state.schema.marks.italic!;
    const directOff = textStyle.create({ bold: false, italic: false });
    const resolveMarkStyle = (mark: typeof directOff) => (
      editor.state.extensions.find((extension) => extension.name === mark.type.name)
        ?.canvasStyle?.[mark.type.name]?.(mark) ?? null
    );

    expect(resolveQuireMarkedFont(
      "16px sans-serif",
      [directOff],
      resolveMarkStyle,
      { fontWeight: "bold", fontStyle: "italic" }
    )).toBe("16px sans-serif");
    expect(resolveQuireMarkedFont(
      "16px sans-serif",
      [directOff, bold.create(), italic.create()],
      resolveMarkStyle,
      { fontWeight: "bold", fontStyle: "italic" }
    )).toBe("16px sans-serif");

    editor.destroy();
  });

  it("paints a textStyle color as the run's glyph fill", () => {
    const editor = createEditor({ extensions: [StarterKit.configure({ undoRedo: false }), TextStyle] });
    const schema = editor.state.schema;

    editor.setContent(
      schema.nodes.doc!.create(
        null,
        schema.nodes.paragraph!.create(null, [
          schema.text("a"),
          schema.text("red", [schema.marks.textStyle!.create({ color: "#ff0000" })])
        ])
      )
    );

    const snapshot = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect: { x: 0, y: 0, width: 300, height: 200 },
      textMeasurer: fixedMeasurer,
      font: "16px sans-serif",
      textBaselineOffset: 18
    });

    expect(
      snapshot.root.children?.[0]?.textFragments?.find((fragment) => fragment.text === "red")?.textColor
    ).toBe("#ff0000");

    const displayList = buildQuireDisplayList({ snapshot });
    const redCommand = displayList.commands.find(
      (command) => command.kind === "text" && command.text === "red"
    );
    expect(redCommand).toMatchObject({ kind: "text", fillStyle: "#ff0000" });
  });

  it("projects point character spacing into shared layout and paint commands", () => {
    const editor = createEditor({
      extensions: [StarterKit.configure({ undoRedo: false }), TextStyle]
    });
    const schema = editor.state.schema;
    editor.setContent(schema.nodes.doc!.create(
      null,
      schema.nodes.paragraph!.create(null, [
        schema.text("AB", [
          schema.marks.textStyle!.create({ letterSpacing: "1.5pt" })
        ])
      ])
    ));
    const spacingMark = editor.state.doc.child(0).child(0).marks[0]!;
    expect(spacingMark.attrs.letterSpacing).toBe("1.5pt");
    expect(editor.state.extensions
      .find((extension) => extension.name === "textStyle")
      ?.canvasStyle?.textStyle?.(spacingMark))
      .toMatchObject({ letterSpacing: "1.5pt" });

    const snapshot = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect: { x: 0, y: 0, width: 300, height: 200 },
      textMeasurer: fixedMeasurer,
      font: "16px sans-serif",
      textBaselineOffset: 18
    });
    const fragment = snapshot.root.children?.[0]?.textFragments?.[0];

    expect(fragment).toMatchObject({
      letterSpacing: 2,
      rect: { width: 24 },
      caretStops: [{ localX: 0 }, { localX: 12 }, { localX: 24 }]
    });
    expect(buildQuireDisplayList({ snapshot }).commands).toContainEqual(
      expect.objectContaining({
        kind: "text",
        text: "AB",
        letterSpacing: 2
      })
    );
    editor.destroy();
  });

  it("paints a textStyle background as a measured content-layer fill", () => {
    const editor = createEditor({
      extensions: [StarterKit.configure({ undoRedo: false }), TextStyle]
    });
    const schema = editor.state.schema;

    editor.setContent(
      schema.nodes.doc!.create(
        null,
        schema.nodes.paragraph!.create(null, [
          schema.text("plain"),
          schema.text("shade", [
            schema.marks.textStyle!.create({ backgroundColor: "#fef08a" })
          ])
        ])
      )
    );

    const snapshot = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect: { x: 0, y: 0, width: 300, height: 200 },
      textMeasurer: fixedMeasurer,
      font: "16px sans-serif",
      textBaselineOffset: 18
    });
    const shadedFragment = snapshot.root.children?.[0]?.textFragments?.find(
      (fragment) => fragment.text === "shade"
    );

    expect(shadedFragment).toMatchObject({
      textBackgroundColor: "#fef08a",
      rect: { width: 50 }
    });
    expect(buildQuireDisplayList({ snapshot }).commands).toContainEqual(
      expect.objectContaining({
        kind: "fill-rect",
        layer: "content",
        fillStyle: "#fef08a",
        range: shadedFragment?.range,
        rect: shadedFragment?.rect
      })
    );
  });

  it("paints strike and underline marks as decoration lines that accumulate", () => {
    const editor = createEditor({ extensions: [StarterKit.configure({ undoRedo: false })] });
    const schema = editor.state.schema;

    editor.setContent(
      schema.nodes.doc!.create(
        null,
        schema.nodes.paragraph!.create(null, [
          schema.text("s", [schema.marks.strike!.create()]),
          schema.text("u", [schema.marks.underline!.create()]),
          schema.text("b", [schema.marks.strike!.create(), schema.marks.underline!.create()])
        ])
      )
    );

    const snapshot = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect: { x: 0, y: 0, width: 300, height: 200 },
      textMeasurer: fixedMeasurer,
      font: "16px sans-serif",
      textBaselineOffset: 18
    });
    const fragments = snapshot.root.children?.[0]?.textFragments ?? [];

    expect(fragments.find((f) => f.text === "s")?.textDecoration).toEqual(["line-through"]);
    expect(fragments.find((f) => f.text === "u")?.textDecoration).toEqual(["underline"]);
    expect(fragments.find((f) => f.text === "b")?.textDecoration).toEqual(["line-through", "underline"]);

    // The decoration lines are emitted as line commands (b has two).
    const lineCommands = buildQuireDisplayList({ snapshot }).commands.filter(
      (command) => command.kind === "line"
    );
    expect(lineCommands.length).toBe(4);
  });

  it("preserves consecutive spaces in the painted text and every caret position", () => {
    const editor = createEditor({ extensions: [StarterKit.configure({ undoRedo: false })] });
    const schema = editor.state.schema;

    editor.setContent(
      schema.nodes.doc!.create(null, schema.nodes.paragraph!.create(null, schema.text("a    b")))
    );

    const snapshot = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect: { x: 0, y: 0, width: 300, height: 200 },
      textMeasurer: fixedMeasurer,
      font: "16px sans-serif",
      textBaselineOffset: 18
    });
    const fragment = snapshot.root.children?.[0]?.textFragments?.[0];

    // Editable text keeps every typed space; the painted run shows all four and
    // each document position is navigable.
    expect(fragment?.text).toBe("a    b");
    expect(new Set(fragment!.caretStops.map((stop) => stop.position.pos)).size).toBe(7);
  });

  it("anchors a caret stop on an empty paragraph so it stays navigable", () => {
    const editor = createEditor({ extensions: [StarterKit.configure({ undoRedo: false })] });
    const schema = editor.state.schema;

    editor.setContent(
      schema.nodes.doc!.create(null, [
        schema.nodes.paragraph!.create(null, schema.text("a")),
        schema.nodes.paragraph!.create(),
        schema.nodes.paragraph!.create(null, schema.text("b"))
      ])
    );

    const snapshot = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect: { x: 0, y: 0, width: 300, height: 200 },
      textMeasurer: fixedMeasurer,
      font: "16px sans-serif",
      textBaselineOffset: 18
    });

    const emptyBlock = snapshot.root.children?.[1];
    const fragment = emptyBlock?.textFragments?.[0];

    // The empty paragraph still produces one zero-width caret-anchor fragment, so
    // the caret can sit on it and vertical navigation does not skip it.
    expect(fragment?.text).toBe("");
    expect(fragment?.caretStops).toHaveLength(1);
    expect(fragment?.range.from).toBe(fragment?.range.to);
  });

  it("takes advances from the shaping measurer for cursive runs", () => {
    // A measurer that reports 10/char by width but 5/char when shaped; a cursive
    // (RTL) run must use the shaped advances, since width measurement can't model
    // joining.
    const shapingMeasurer: QuireTextMeasurer = {
      measureText: (text) => ({ width: Array.from(text).length * 10 }),
      shapeRun: (text) => {
        const chars = Array.from(text);
        return {
          clusters: chars.map((_, index) => ({ from: index, to: index + 1, x: index * 5, advance: 5, rtl: true })),
          width: chars.length * 5,
          ascent: 12,
          descent: 4
        };
      }
    };
    const editor = createEditor({ extensions: [StarterKit.configure({ undoRedo: false })] });
    const schema = editor.state.schema;
    editor.setContent(
      schema.nodes.doc!.create(null, schema.nodes.paragraph!.create(null, schema.text("אבג")))
    );

    const snapshot = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect: { x: 0, y: 0, width: 300, height: 200 },
      textMeasurer: shapingMeasurer,
      font: "16px sans-serif",
      textBaselineOffset: 18
    });
    const fragment = snapshot.root.children?.[0]?.textFragments?.[0];

    // Three shaped clusters of advance 5 → width 15, not 30 from width measurement.
    expect(fragment?.rect.width).toBe(15);
  });

  it("lays out a Hebrew run right-to-left with mirrored caret stops", () => {
    const editor = createEditor({ extensions: [StarterKit.configure({ undoRedo: false })] });
    const schema = editor.state.schema;

    editor.setContent(
      schema.nodes.doc!.create(null, schema.nodes.paragraph!.create(null, schema.text("אבג")))
    );

    const snapshot = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect: { x: 0, y: 0, width: 300, height: 200 },
      textMeasurer: fixedMeasurer,
      font: "16px sans-serif",
      textBaselineOffset: 18
    });
    const fragment = snapshot.root.children?.[0]?.textFragments?.[0];

    expect(fragment?.direction).toBe("rtl");
    // Caret stops are in visual (ascending local x) order despite the RTL run.
    const localXs = fragment!.caretStops.map((stop) => stop.localX);
    expect(localXs).toEqual([...localXs].sort((first, second) => first - second));
    // The logical-first position sits at the right edge.
    const firstStop = fragment!.caretStops.find((stop) => stop.position.pos === fragment!.range.from);
    expect(firstStop?.localX).toBe(fragment!.rect.width);
  });

  it("grows a paragraph's height when an inline run is taller (line-box from content)", () => {
    // A measurer that reports per-font ascent/descent from the px size.
    const metricMeasurer: QuireTextMeasurer = {
      measureText: (text, font) => {
        const px = Number.parseFloat(font) || 16;
        return { width: Array.from(text).length * 10, ascent: px * 0.9, descent: px * 0.3 };
      }
    };
    const heightOf = (withBig: boolean): number => {
      const editor = createEditor({ extensions: [StarterKit.configure({ undoRedo: false }), TextStyle] });
      const schema = editor.state.schema;
      editor.setContent(
        schema.nodes.doc!.create(
          null,
          schema.nodes.paragraph!.create(
            null,
            withBig
              ? [schema.text("a"), schema.text("big", [schema.marks.textStyle!.create({ fontSize: "28px" })])]
              : [schema.text("a")]
          )
        )
      );
      const snapshot = buildQuireLayoutSnapshot({
        state: editor.state,
        viewportRect: { x: 0, y: 0, width: 300, height: 200 },
        textMeasurer: metricMeasurer,
        font: "16px sans-serif",
        textBaselineOffset: 18
      });
      return snapshot.root.children?.[0]?.rect.height ?? 0;
    };

    expect(heightOf(true)).toBeGreaterThan(heightOf(false));
  });

  it("applies an absolute textStyle font-size to the run font", () => {
    const editor = createEditor({ extensions: [StarterKit.configure({ undoRedo: false }), TextStyle] });
    const schema = editor.state.schema;

    editor.setContent(
      schema.nodes.doc!.create(
        null,
        schema.nodes.paragraph!.create(null, [
          schema.text("a"),
          schema.text("big", [schema.marks.textStyle!.create({ fontSize: "20px" })])
        ])
      )
    );

    const snapshot = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect: { x: 0, y: 0, width: 300, height: 200 },
      textMeasurer: fixedMeasurer,
      font: "16px sans-serif",
      textBaselineOffset: 18
    });

    const fragments = snapshot.root.children?.[0]?.textFragments ?? [];
    expect(fragments.find((fragment) => fragment.text === "a")?.font).toBe("16px sans-serif");
    expect(fragments.find((fragment) => fragment.text === "big")?.font).toBe("20px sans-serif");
  });

  it("converts the canonical point font-size into CSS pixels for layout", () => {
    const editor = createEditor({
      extensions: [StarterKit.configure({ undoRedo: false }), TextStyle]
    });
    const schema = editor.state.schema;

    editor.setContent(
      schema.nodes.doc!.create(
        null,
        schema.nodes.paragraph!.create(null, [
          schema.text("plain"),
          schema.text("initial", [
            schema.marks.textStyle!.create({ fontSize: "42pt" })
          ])
        ])
      )
    );

    const snapshot = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect: { x: 0, y: 0, width: 300, height: 200 },
      textMeasurer: fixedMeasurer,
      font: "16px sans-serif",
      textBaselineOffset: 18
    });

    const fragments = snapshot.root.children?.[0]?.textFragments ?? [];
    expect(fragments.find((fragment) => fragment.text === "plain")?.font).toBe(
      "16px sans-serif"
    );
    expect(fragments.find((fragment) => fragment.text === "initial")?.font).toBe(
      "56px sans-serif"
    );
  });

  it("renders italic and inline-code runs via their canvasStyle deltas", () => {
    const editor = createEditor({ extensions: [StarterKit.configure({ undoRedo: false })] });
    const schema = editor.state.schema;

    editor.setContent(
      schema.nodes.doc!.create(
        null,
        schema.nodes.paragraph!.create(null, [
          schema.text("i", [schema.marks.italic!.create()]),
          schema.text("c", [schema.marks.code!.create()])
        ])
      )
    );

    const snapshot = buildQuireLayoutSnapshot({
      state: editor.state,
      viewportRect: { x: 0, y: 0, width: 300, height: 200 },
      textMeasurer: fixedMeasurer,
      font: "16px sans-serif",
      textBaselineOffset: 18
    });

    const fragments = snapshot.root.children?.[0]?.textFragments ?? [];
    expect(fragments.find((fragment) => fragment.text === "i")?.font).toBe("italic 16px sans-serif");
    expect(fragments.find((fragment) => fragment.text === "c")?.font).toBe("16px monospace");
  });

  it("switches hidden text between zero-advance normal and inspected paint", () => {
    const editor = createEditor({
      extensions: [StarterKit.configure({ undoRedo: false }), TextStyle]
    });
    const schema = editor.state.schema;
    editor.setContent(schema.nodes.doc!.create(
      null,
      schema.nodes.paragraph!.create(null, [
        schema.text("AB"),
        schema.text("SECRET", [schema.marks.textStyle!.create({ hidden: true })]),
        schema.text("CD")
      ])
    ));
    const hiddenMark = editor.state.doc.child(0).child(1).marks[0]!;
    expect(hiddenMark.attrs.hidden).toBe(true);
    expect(editor.state.extensions
      .find((extension) => extension.name === "textStyle")
      ?.canvasStyle?.textStyle?.(hiddenMark))
      .toMatchObject({ hidden: true });
    const blockShapeCache = new CanvasBlockShapeCache();
    const base = {
      state: editor.state,
      viewportRect: { x: 0, y: 0, width: 40, height: 200 },
      textMeasurer: fixedMeasurer,
      font: "16px sans-serif",
      textBaselineOffset: 18,
      blockShapeCache
    };
    const normal = buildQuireLayoutSnapshot({
      ...base,
      hiddenTextViewMode: "normal"
    });
    const normalFragments = normal.root.children?.[0]?.textFragments ?? [];
    const inspection = buildQuireLayoutSnapshot({
      ...base,
      hiddenTextViewMode: "formatting-inspection"
    });
    const inspectionFragments = inspection.root.children?.[0]?.textFragments ?? [];

    expect(normalFragments.map((fragment) => [
      fragment.text,
      fragment.hiddenText,
      fragment.rect.y
    ])).toEqual([
      ["AB", undefined, 0],
      ["", "collapsed", 0],
      ["CD", undefined, 0]
    ]);
    expect(buildQuireDisplayList({ snapshot: normal }).commands.some(
      (command) => command.kind === "text" && command.text.includes("SECRET")
    )).toBe(false);
    expect(inspectionFragments
      .filter((fragment) => fragment.hiddenText === "inspection")
      .map((fragment) => fragment.text)
      .join(""))
      .toBe("SECRET");
    expect(buildQuireDisplayList({ snapshot: inspection }).commands.some(
      (command) => command.kind === "line"
        && command.lineDash?.join("|") === "1.5|2"
        && command.range !== undefined
        && command.range.from >= 3
        && command.range.to <= 9
    )).toBe(true);
    expect(new Set(inspectionFragments.map((fragment) => fragment.rect.y)).size)
      .toBeGreaterThan(1);

    editor.destroy();
  });
});
