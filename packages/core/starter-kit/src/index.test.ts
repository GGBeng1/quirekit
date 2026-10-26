import { describe, expect, it } from "vitest";
import {
  createEditor,
  Extension,
  type QuireAnyExtension,
  type QuireEditor
} from "@quirekit/core";
import { redoDepth, undoDepth, type EditorView, type Transaction } from "@quirekit/pm";
import { StarterKit, type StarterKitOptions } from "./index";

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Test-only text insertion command. */
    readonly starterKitTest: {
      insertText: () => ReturnType;
    };
  }
}

describe("starterKit", () => {
  it("creates the default document extensions", () => {
    expect(resolveStarterKitExtensionNames()).toEqual([
      "paragraph",
      "baseKeymap",
      "undoRedo",
      "doc",
      "text",
      "blockquote",
      "hardBreak",
      "heading",
      "horizontalRule",
      "codeBlock",
      "bulletList",
      "listItem",
      "listKeymap",
      "orderedList",
      "bold",
      "code",
      "italic",
      "strike",
      "underline",
      "gapCursor",
      "trailingNode"
    ]);
  });

  it("installs through the Tiptap-compatible StarterKit extension object", () => {
    const editor = createEditor({ extensions: [StarterKit.configure({ undoRedo: false })] });
    const names = editor.extensions.map((extension) => extension.name);

    expect(names).toEqual(expect.arrayContaining([
      "commands",
      "editable",
      "clipboardTextSerializer",
      "focusEvents",
      "keymap",
      "paste",
      "drop",
      "delete",
      "tabindex",
      "textDirection",
      "starterKit",
      "doc",
      "paragraph",
      "text",
      "blockquote",
      "hardBreak",
      "heading",
      "horizontalRule",
      "codeBlock",
      "bulletList",
      "listItem",
      "listKeymap",
      "orderedList",
      "bold",
      "code",
      "italic",
      "strike",
      "underline",
      "gapCursor",
      "trailingNode",
      "baseKeymap"
    ]));
    expect(names).toContain("starterKit");
    expect(names).not.toContain("undoRedo");
    expect(editor.state.schema.nodes.paragraph).toBeDefined();
    expect(editor.state.schema.nodes.hardBreak).toBeDefined();
    expect(editor.state.schema.nodes.horizontalRule).toBeDefined();
    expect(editor.state.schema.nodes.bulletList).toBeDefined();
    expect(editor.state.schema.nodes.listItem).toBeDefined();
    expect(editor.state.schema.nodes.orderedList).toBeDefined();
    expect(editor.state.schema.marks.bold).toBeDefined();
    expect(editor.state.schema.marks.code).toBeDefined();
    expect(editor.state.schema.marks.strike).toBeDefined();
    expect(editor.state.schema.marks.underline).toBeDefined();
    expect(editor.commands.undo).toBeUndefined();
  });

  it("contributes the default document schema", () => {
    const extensions = resolveStarterKitExtensionMap({ undoRedo: false });
    const document = extensions.get("doc");
    const paragraph = extensions.get("paragraph");
    const text = extensions.get("text");
    const blockquote = extensions.get("blockquote");
    const hardBreak = extensions.get("hardBreak");
    const heading = extensions.get("heading");
    const horizontalRule = extensions.get("horizontalRule");
    const codeBlock = extensions.get("codeBlock");
    const bulletList = extensions.get("bulletList");
    const listItem = extensions.get("listItem");
    const listKeymap = extensions.get("listKeymap");
    const orderedList = extensions.get("orderedList");
    const editor = createEditor({ extensions: [StarterKit.configure({ undoRedo: false })] });
    const paragraphNode = editor.state.schema.nodes.paragraph!.create();
    const hardBreakNode = editor.state.schema.nodes.hardBreak!.create();
    const headingNode = editor.state.schema.nodes.heading!.create({ level: 2 });
    const headingSpec = editor.state.schema.nodes.heading!.spec;

    expect(document?.kind).toBe("node");
    expect(paragraph?.kind).toBe("node");
    expect(text?.kind).toBe("node");
    expect(blockquote?.kind).toBe("node");
    expect(hardBreak?.kind).toBe("node");
    expect(heading?.kind).toBe("node");
    expect(horizontalRule?.kind).toBe("node");
    expect(codeBlock?.kind).toBe("node");
    expect(bulletList?.kind).toBe("node");
    expect(listItem?.kind).toBe("node");
    expect(listKeymap?.kind).toBe("extension");
    expect(orderedList?.kind).toBe("node");
    expect(document?.nodes.doc).toMatchObject({ content: "block+" });
    expect(paragraph?.nodes.paragraph).toMatchObject({
      content: "inline*",
      group: "block"
    });
    expect(text?.nodes.text).toMatchObject({ group: "inline" });
    expect(blockquote?.nodes.blockquote).toMatchObject({
      content: "block+",
      group: "block",
      defining: true
    });
    expect(hardBreak?.nodes.hardBreak).toMatchObject({
      group: "inline",
      inline: true,
      selectable: false,
      linebreakReplacement: true
    });
    expect(heading?.nodes.heading).toMatchObject({
      content: "inline*",
      group: "block",
      defining: true
    });
    expect(heading?.nodes.heading?.attrs?.level).toMatchObject({
      default: 1,
      rendered: false
    });
    expect(paragraph?.nodes.paragraph?.parseDOM).toEqual([{ tag: "p" }]);
    expect(paragraph?.nodes.paragraph?.toDOM?.(paragraphNode)).toEqual(["p", {}, 0]);
    expect(blockquote?.nodes.blockquote?.parseDOM).toEqual([{ tag: "blockquote" }]);
    expect(blockquote?.nodes.blockquote?.toDOM?.(
      editor.state.schema.nodes.blockquote!.create(undefined, paragraphNode)
    )).toEqual(["blockquote", {}, 0]);
    expect(hardBreak?.nodes.hardBreak?.parseDOM).toEqual([{ tag: "br" }]);
    expect(hardBreak?.nodes.hardBreak?.toDOM?.(hardBreakNode)).toEqual(["br", {}]);
    expect(heading?.nodes.heading?.parseDOM).toEqual([
      { tag: "h1", attrs: { level: 1 } },
      { tag: "h2", attrs: { level: 2 } },
      { tag: "h3", attrs: { level: 3 } },
      { tag: "h4", attrs: { level: 4 } },
      { tag: "h5", attrs: { level: 5 } },
      { tag: "h6", attrs: { level: 6 } }
    ]);
    expect(headingSpec.toDOM?.(headingNode)).toEqual(["h2", {}, 0]);
    expect(editor.state.schema.nodes.horizontalRule?.spec).toMatchObject({
      group: "block"
    });
    expect(editor.state.schema.nodes.horizontalRule?.spec.parseDOM).toEqual([
      expect.objectContaining({ tag: "hr" })
    ]);
    expect(editor.state.schema.nodes.horizontalRule?.spec.toDOM?.(
      editor.state.schema.nodes.horizontalRule.create()
    )).toEqual([
      "hr",
      expect.objectContaining({
        "data-qk-horizontal-rule-variant": "single",
        "data-qk-horizontal-rule-thickness-pt": "1.5",
        "data-qk-horizontal-rule-width-percent": "100",
        "data-qk-horizontal-rule-alignment": "center"
      })
    ]);
    expect(editor.state.schema.nodes.codeBlock?.spec).toMatchObject({
      content: "text*",
      marks: "",
      group: "block",
      code: true,
      defining: true
    });
    expect(codeBlock?.nodes.codeBlock?.attrs?.language).toMatchObject({
      default: null,
      rendered: false
    });
    expect(editor.state.schema.nodes.codeBlock?.spec.parseDOM).toEqual([
      expect.objectContaining({
        tag: "pre",
        preserveWhitespace: "full"
      })
    ]);
    expect(editor.state.schema.nodes.codeBlock?.spec.toDOM?.(
      editor.state.schema.nodes.codeBlock.create({ language: "ts" })
    )).toEqual([
      "pre",
      {},
      ["code", { class: "language-ts" }, 0]
    ]);
    expect(editor.state.schema.nodes.bulletList?.spec).toMatchObject({
      group: "block list",
      content: "listItem+"
    });
    expect(editor.state.schema.nodes.bulletList?.spec.parseDOM).toEqual([
      expect.objectContaining({ tag: "ul" })
    ]);
    expect(editor.state.schema.nodes.bulletList?.spec.toDOM?.(
      editor.state.schema.nodes.bulletList.create()
    )).toEqual(["ul", {}, 0]);
    expect(editor.state.schema.nodes.listItem?.spec).toMatchObject({
      content: "paragraph block*",
      defining: true
    });
    expect(editor.state.schema.nodes.listItem?.spec.parseDOM).toEqual([
      expect.objectContaining({ tag: "li" })
    ]);
    expect(editor.state.schema.nodes.listItem?.spec.toDOM?.(
      editor.state.schema.nodes.listItem.create()
    )).toEqual(["li", {}, 0]);
    expect(editor.state.schema.nodes.orderedList?.spec).toMatchObject({
      group: "block list",
      content: "listItem+"
    });
    expect(editor.state.schema.nodes.orderedList?.spec.attrs?.start).toMatchObject({
      default: 1
    });
    expect(editor.state.schema.nodes.orderedList?.spec.parseDOM).toEqual([
      expect.objectContaining({ tag: "ol" })
    ]);
    expect(editor.state.schema.nodes.orderedList?.spec.toDOM?.(
      editor.state.schema.nodes.orderedList.create({ start: 3 })
    )).toEqual(["ol", { start: 3, type: null }, 0]);
  });

  it("contributes default rich text marks", () => {
    const editor = createEditor({ extensions: [StarterKit.configure({ undoRedo: false })] });

    expect(editor.state.schema.marks.bold?.spec.parseDOM).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tag: "strong" }),
        expect.objectContaining({ tag: "b" }),
        expect.objectContaining({ style: "font-weight" })
      ])
    );
    expect(
      editor.state.schema.marks.bold?.spec.toDOM?.(
        editor.state.schema.marks.bold.create(),
        true
      )
    ).toEqual(["strong", {}, 0]);
    expect(editor.state.schema.marks.italic?.spec.parseDOM).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tag: "em" }),
        expect.objectContaining({ tag: "i" }),
        expect.objectContaining({ style: "font-style=italic" })
      ])
    );
    expect(
      editor.state.schema.marks.italic?.spec.toDOM?.(
        editor.state.schema.marks.italic.create(),
        true
      )
    ).toEqual(["em", {}, 0]);
    expect(editor.state.schema.marks.code?.spec).toMatchObject({
      excludes: "_",
      code: true
    });
    expect(editor.state.schema.marks.code?.spec.parseDOM).toEqual([
      expect.objectContaining({ tag: "code" })
    ]);
    expect(
      editor.state.schema.marks.code?.spec.toDOM?.(
        editor.state.schema.marks.code.create(),
        true
      )
    ).toEqual(["code", {}, 0]);
    expect(editor.state.schema.marks.strike?.spec.parseDOM).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tag: "s" }),
        expect.objectContaining({ tag: "del" }),
        expect.objectContaining({ tag: "strike" }),
        expect.objectContaining({ style: "text-decoration" })
      ])
    );
    expect(
      editor.state.schema.marks.strike?.spec.toDOM?.(
        editor.state.schema.marks.strike.create(),
        true
      )
    ).toEqual(["s", {}, 0]);
    expect(editor.state.schema.marks.underline?.spec.parseDOM).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tag: "u" }),
        expect.objectContaining({ style: "text-decoration" })
      ])
    );
    expect(
      editor.state.schema.marks.underline?.spec.toDOM?.(
        editor.state.schema.marks.underline.create(),
        true
      )
    ).toEqual(["u", {}, 0]);
  });

  it("configures starter extension packages with option objects", () => {
    const editor = createEditor({
      extensions: [StarterKit.configure({
        bold: {
          HTMLAttributes: { class: "weighty" }
        },
        undoRedo: false,
        paragraph: {
          HTMLAttributes: { class: "body-copy" }
        }
      })]
    });
    const paragraph = editor.state.schema.nodes.paragraph!.create();
    const bold = editor.state.schema.marks.bold!.create();

    expect(editor.state.schema.nodes.paragraph?.spec.toDOM?.(paragraph)).toEqual([
      "p",
      { class: "body-copy" },
      0
    ]);
    expect(editor.state.schema.marks.bold?.spec.toDOM?.(bold, true)).toEqual([
      "strong",
      { class: "weighty" },
      0
    ]);
  });

  it("creates an empty document with a paragraph", () => {
    const editor = createEditor({ extensions: [StarterKit.configure({ undoRedo: false })] });

    expect(editor.state.doc.childCount).toBe(1);
    expect(editor.state.doc.firstChild?.type.name).toBe("paragraph");
  });

  it("inserts and serializes hard breaks through starter-kit commands", () => {
    const editor = createEditor({
      extensions: [StarterKit.configure({ undoRedo: false })],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "alpha" }]
          }
        ]
      }
    });

    expect(editor.commands.setTextSelection(6)).toBe(true);
    expect(editor.commands.setHardBreak()).toBe(true);
    expect(editor.commands.insertContent("beta")).toBe(true);
    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "alpha" },
            { type: "hardBreak" },
            { type: "text", text: "beta" }
          ]
        }
      ]
    });
    expect(editor.getText()).toBe("alpha\nbeta");
    expect(editor.getMarkdown()).toBe("alpha  \nbeta");
  });

  it("sets, toggles, and serializes headings through starter-kit commands", () => {
    const editor = createEditor({
      extensions: [StarterKit.configure({ undoRedo: false })],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Title" }]
          }
        ]
      }
    });

    expect(editor.commands.setTextSelection(3)).toBe(true);
    expect(editor.commands.setHeading({ level: 2 })).toBe(true);
    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Title" }]
        },
        { type: "paragraph" }
      ]
    });
    expect(editor.getText()).toBe("Title\n\n");
    expect(editor.getMarkdown()).toBe("## Title\n\n");

    expect(editor.commands.toggleHeading({ level: 2 })).toBe(true);
    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Title" }]
        },
        { type: "paragraph" }
      ]
    });
  });

  it("sets, toggles, and serializes blockquotes through starter-kit commands", () => {
    const editor = createEditor({
      extensions: [StarterKit.configure({ undoRedo: false })],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Quote" }]
          }
        ]
      }
    });

    expect(editor.commands.setTextSelection(3)).toBe(true);
    expect(editor.commands.toggleBlockquote()).toBe(true);
    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "blockquote",
          attrs: { wordNodeRevision: null },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Quote" }]
            }
          ]
        },
        { type: "paragraph" }
      ]
    });
    expect(editor.getMarkdown()).toBe("> Quote\n\n");

    expect(editor.commands.toggleBlockquote()).toBe(true);
    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Quote" }]
        },
        { type: "paragraph" }
      ]
    });
  });

  it("inserts and serializes horizontal rules through starter-kit commands", () => {
    const editor = createEditor({
      extensions: [StarterKit.configure({ undoRedo: false })],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "alpha" }]
          }
        ]
      }
    });

    expect(editor.commands.setTextSelection(6)).toBe(true);
    expect(editor.commands.setHorizontalRule()).toBe(true);
    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "alpha" }]
        },
        {
          type: "horizontalRule",
          attrs: {
            variant: "single",
            color: "#111827",
            thicknessPt: 1.5,
            widthPercent: 100,
            alignment: "center",
            wordNodeRevision: null
          }
        },
        { type: "paragraph" }
      ]
    });
    expect(editor.getMarkdown()).toBe("alpha\n\n---\n\n");
  });

  it("sets, toggles, parses, and serializes code blocks through starter-kit commands", () => {
    const editor = createEditor({
      extensions: [StarterKit.configure({ undoRedo: false })],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "const answer = 42" }]
          }
        ]
      }
    });

    expect(editor.commands.setTextSelection(3)).toBe(true);
    expect(editor.commands.toggleCodeBlock({ language: "ts" })).toBe(true);
    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "codeBlock",
          attrs: { language: "ts", wordNodeRevision: null },
          content: [{ type: "text", text: "const answer = 42" }]
        },
        { type: "paragraph" }
      ]
    });
    expect(editor.getMarkdown()).toBe("```ts\nconst answer = 42\n```\n\n");

    expect(editor.commands.toggleCodeBlock()).toBe(true);
    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "const answer = 42" }]
        },
        { type: "paragraph" }
      ]
    });

    editor.commands.setContent("```js\nconsole.log(1)\n```", {
      contentType: "markdown"
    });
    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "codeBlock",
          attrs: { language: "js", wordNodeRevision: null },
          content: [{ type: "text", text: "console.log(1)" }]
        },
        { type: "paragraph" }
      ]
    });
  });

  it("toggles, parses, and serializes bullet lists through starter-kit commands", () => {
    const editor = createEditor({
      extensions: [StarterKit.configure({ undoRedo: false })],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "alpha" }]
          }
        ]
      }
    });

    expect(editor.commands.setTextSelection(3)).toBe(true);
    expect(editor.commands.toggleBulletList()).toBe(true);
    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "alpha" }]
                }
              ]
            }
          ]
        },
        { type: "paragraph" }
      ]
    });
    expect(editor.getMarkdown()).toBe("- alpha\n\n");

    expect(editor.commands.toggleBulletList()).toBe(true);
    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "alpha" }]
        },
        { type: "paragraph" }
      ]
    });

    editor.commands.setContent("- one\n- two", { contentType: "markdown" });
    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "one" }]
                }
              ]
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "two" }]
                }
              ]
            }
          ]
        },
        { type: "paragraph" }
      ]
    });
    expect(editor.getMarkdown()).toBe("- one\n- two\n\n");
  });

  it("toggles, parses, and serializes ordered lists through starter-kit commands", () => {
    const editor = createEditor({
      extensions: [StarterKit.configure({ undoRedo: false })],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "alpha" }]
          }
        ]
      }
    });

    expect(editor.commands.setTextSelection(3)).toBe(true);
    expect(editor.commands.toggleOrderedList()).toBe(true);
    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "orderedList",
          attrs: { start: 1, type: null },
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "alpha" }]
                }
              ]
            }
          ]
        },
        { type: "paragraph" }
      ]
    });
    expect(editor.getMarkdown()).toBe("1. alpha\n\n");

    expect(editor.commands.toggleOrderedList()).toBe(true);
    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "alpha" }]
        },
        { type: "paragraph" }
      ]
    });

    editor.commands.setContent("3. one\n4. two", { contentType: "markdown" });
    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "orderedList",
          attrs: { start: 3, type: null },
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "one" }]
                }
              ]
            },
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "two" }]
                }
              ]
            }
          ]
        },
        { type: "paragraph" }
      ]
    });
    expect(editor.getMarkdown()).toBe("3. one\n4. two\n\n");
  });

  it("sets, toggles, and serializes bold through starter-kit commands", () => {
    const editor = createEditor({
      extensions: [StarterKit.configure({ undoRedo: false })],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "alpha beta" }]
          }
        ]
      }
    });

    expect(editor.commands.setTextSelection({ from: 7, to: 11 })).toBe(true);
    expect(editor.commands.toggleBold()).toBe(true);
    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "alpha " },
            {
              type: "text",
              marks: [{ type: "bold" }],
              text: "beta"
            }
          ]
        }
      ]
    });
    expect(editor.getMarkdown()).toBe("alpha **beta**");

    expect(editor.commands.toggleBold()).toBe(true);
    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "alpha beta" }]
        }
      ]
    });
  });

  it("sets, toggles, and serializes italic through starter-kit commands", () => {
    const editor = createEditor({
      extensions: [StarterKit.configure({ undoRedo: false })],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "alpha beta" }]
          }
        ]
      }
    });

    expect(editor.commands.setTextSelection({ from: 7, to: 11 })).toBe(true);
    expect(editor.commands.toggleItalic()).toBe(true);
    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "alpha " },
            {
              type: "text",
              marks: [{ type: "italic" }],
              text: "beta"
            }
          ]
        }
      ]
    });
    expect(editor.getMarkdown()).toBe("alpha *beta*");

    expect(editor.commands.toggleItalic()).toBe(true);
    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "alpha beta" }]
        }
      ]
    });
  });

  it("sets, toggles, and serializes inline code through starter-kit commands", () => {
    const editor = createEditor({
      extensions: [StarterKit.configure({ undoRedo: false })],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "alpha beta" }]
          }
        ]
      }
    });

    expect(editor.commands.setTextSelection({ from: 7, to: 11 })).toBe(true);
    expect(editor.commands.toggleCode()).toBe(true);
    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "alpha " },
            {
              type: "text",
              marks: [{ type: "code" }],
              text: "beta"
            }
          ]
        }
      ]
    });
    expect(editor.getMarkdown()).toBe("alpha `beta`");

    expect(editor.commands.toggleCode()).toBe(true);
    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "alpha beta" }]
        }
      ]
    });
  });

  it("sets, toggles, and serializes strike through starter-kit commands", () => {
    const editor = createEditor({
      extensions: [StarterKit.configure({ undoRedo: false })],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "alpha beta" }]
          }
        ]
      }
    });

    expect(editor.commands.setTextSelection({ from: 7, to: 11 })).toBe(true);
    expect(editor.commands.toggleStrike()).toBe(true);
    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "alpha " },
            {
              type: "text",
              marks: [{ type: "strike" }],
              text: "beta"
            }
          ]
        }
      ]
    });
    expect(editor.getMarkdown()).toBe("alpha ~~beta~~");

    expect(editor.commands.toggleStrike()).toBe(true);
    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "alpha beta" }]
        }
      ]
    });
  });

  it("sets, toggles, parses, and serializes underline through starter-kit commands", () => {
    const editor = createEditor({
      extensions: [StarterKit.configure({ undoRedo: false })],
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "alpha beta" }]
          }
        ]
      }
    });

    expect(editor.commands.setTextSelection({ from: 7, to: 11 })).toBe(true);
    expect(editor.commands.toggleUnderline()).toBe(true);
    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "alpha " },
            {
              type: "text",
              marks: [{ type: "underline", attrs: { underlineType: "single", color: undefined } }],
              text: "beta"
            }
          ]
        }
      ]
    });
    expect(editor.getMarkdown()).toBe("alpha ++beta++");

    expect(editor.commands.toggleUnderline()).toBe(true);
    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "alpha beta" }]
        }
      ]
    });

    editor.commands.setContent("alpha ++beta++", { contentType: "markdown" });
    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "alpha " },
            {
              type: "text",
              marks: [{ type: "underline", attrs: { underlineType: null, color: undefined } }],
              text: "beta"
            }
          ]
        }
      ]
    });
  });

  it("wires undo-redo plugin and commands", () => {
    const editor = createEditor({
      extensions: [
        StarterKit,
        Extension.create({
          name: "test-insert-text",
          addCommands() {
            return {
              insertText: () => ({ tr, dispatch }) => {
                dispatch?.(tr.insertText("hello", 1));
                return true;
              }
            };
          }
        })
      ]
    });

    expect(undoDepth(editor.state.pm)).toBe(0);
    expect(editor.commands.insertText()).toBe(true);
    expect(editor.state.doc.textContent).toBe("hello");
    expect(undoDepth(editor.state.pm)).toBe(1);

    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.textContent).toBe("");
    expect(redoDepth(editor.state.pm)).toBe(1);

    expect(editor.commands.redo()).toBe(true);
    expect(editor.state.doc.textContent).toBe("hello");
  });

  it("wires undo-redo keyboard shortcuts", () => {
    const editor = createEditor({
      extensions: [
        StarterKit,
        Extension.create({
          name: "test-insert-text",
          addCommands() {
            return {
              insertText: () => ({ tr, dispatch }) => {
                dispatch?.(tr.insertText("hello", 1));
                return true;
              }
            };
          }
        })
      ]
    });

    expect(editor.commands.insertText()).toBe(true);
    expect(editor.state.doc.textContent).toBe("hello");
    expect(undoDepth(editor.state.pm)).toBe(1);

    expect(dispatchKeyboardShortcut(editor, createModKeyboardShortcutEvent("z", 90))).toBe(true);
    expect(editor.state.doc.textContent).toBe("");
    expect(redoDepth(editor.state.pm)).toBe(1);

    expect(dispatchKeyboardShortcut(
      editor,
      createModKeyboardShortcutEvent("z", 90, { shiftKey: true })
    )).toBe(true);
    expect(editor.state.doc.textContent).toBe("hello");
  });

  it("wires the base keymap plugin", () => {
    const editor = createEditor({ extensions: [StarterKit.configure({ undoRedo: false })] });

    expect(
      editor.state.pm.plugins.some((plugin) => plugin.props.handleKeyDown)
    ).toBe(true);
  });

  it("omits undo-redo behavior when undoRedo is disabled", () => {
    const editor = createEditor({ extensions: [StarterKit.configure({ undoRedo: false })] });

    expect(resolveStarterKitExtensionNames({ undoRedo: false })).toEqual([
      "paragraph",
      "baseKeymap",
      "doc",
      "text",
      "blockquote",
      "hardBreak",
      "heading",
      "horizontalRule",
      "codeBlock",
      "bulletList",
      "listItem",
      "listKeymap",
      "orderedList",
      "bold",
      "code",
      "italic",
      "strike",
      "underline",
      "gapCursor",
      "trailingNode"
    ]);
    expect(editor.commands.undo).toBeUndefined();
    expect(editor.commands.redo).toBeUndefined();
  });

  it("can omit individual starter extensions", () => {
    expect(
      resolveStarterKitExtensionNames({
        bold: false,
        blockquote: false,
        hardBreak: false,
        heading: false,
        horizontalRule: false,
        codeBlock: false,
        bulletList: false,
        listItem: false,
        listKeymap: false,
        orderedList: false,
        code: false,
        undoRedo: false,
        italic: false,
        strike: false,
        underline: false,
        gapcursor: false,
        trailingNode: false,
        baseKeymap: false
      })
    ).toEqual(["paragraph", "doc", "text"]);
  });
});

const defaultCoreExtensionNames = new Set([
  "commands",
  "editable",
  "clipboardTextSerializer",
  "focusEvents",
  "keymap",
  "paste",
  "drop",
  "delete",
  "tabindex",
  "textDirection",
  "starterKit"
]);

/**
 * Resolves starter-kit child extensions through the public `StarterKit` object.
 *
 * @param options - Starter-kit options used to configure the extension.
 * @returns Resolved child extensions installed by `StarterKit`.
 */
function resolveStarterKitExtensions(
  options: StarterKitOptions = {}
): readonly QuireAnyExtension[] {
  const editor = createEditor({ extensions: [StarterKit.configure(options)] });

  return editor.extensions.filter(
    (extension) => !defaultCoreExtensionNames.has(extension.name)
  );
}

/**
 * Resolves starter-kit child extension names through the public extension object.
 *
 * @param options - Starter-kit options used to configure the extension.
 * @returns Ordered child extension names.
 */
function resolveStarterKitExtensionNames(options: StarterKitOptions = {}): readonly string[] {
  return resolveStarterKitExtensions(options).map((extension) => extension.name);
}

/**
 * Resolves starter-kit child extensions keyed by extension name.
 *
 * @param options - Starter-kit options used to configure the extension.
 * @returns Map of child extension names to resolved extensions.
 */
function resolveStarterKitExtensionMap(
  options: StarterKitOptions = {}
): ReadonlyMap<string, QuireAnyExtension> {
  return new Map(
    resolveStarterKitExtensions(options).map((extension) => [extension.name, extension])
  );
}

/**
 * Dispatches a keyboard event through installed ProseMirror keydown props.
 *
 * @param editor - Editor whose plugin props should receive the event.
 * @param event - Keyboard event fields used by the PM keymap package.
 * @returns Whether any plugin handled the keyboard event.
 */
function dispatchKeyboardShortcut(
  editor: QuireEditor,
  event: Pick<KeyboardEvent, "key" | "keyCode"> &
    Partial<Pick<KeyboardEvent, "altKey" | "ctrlKey" | "metaKey" | "shiftKey">>
): boolean {
  const view = createTestEditorView(editor);
  const keyboardEvent = createTestKeyboardEvent(event);

  return editor.state.pm.plugins.some((plugin) =>
    plugin.props.handleKeyDown?.call(plugin, view, keyboardEvent)
  );
}

/**
 * Creates the minimal EditorView subset needed by PM keymap tests.
 *
 * @param editor - Editor whose state and dispatch should back the view.
 * @returns EditorView-like object for plugin prop dispatch.
 */
function createTestEditorView(editor: QuireEditor): EditorView {
  return {
    get state() {
      return editor.state.pm;
    },
    dispatch(transaction: Transaction): void {
      editor.dispatchTransaction(transaction);
    },
    editable: true
  } as unknown as EditorView;
}

/**
 * Creates a DOM-light KeyboardEvent object for PM keymap matching.
 *
 * @param event - Keyboard event fields used by PM key name resolution.
 * @returns KeyboardEvent-like object for plugin prop dispatch.
 */
function createTestKeyboardEvent(
  event: Pick<KeyboardEvent, "key" | "keyCode"> &
    Partial<Pick<KeyboardEvent, "altKey" | "ctrlKey" | "metaKey" | "shiftKey">>
): KeyboardEvent {
  return {
    key: event.key,
    keyCode: event.keyCode,
    altKey: event.altKey ?? false,
    ctrlKey: event.ctrlKey ?? false,
    metaKey: event.metaKey ?? false,
    shiftKey: event.shiftKey ?? false,
    preventDefault: () => {},
    stopPropagation: () => {}
  } as unknown as KeyboardEvent;
}

/**
 * Creates a platform-correct `Mod-*` keyboard shortcut event.
 *
 * @param key - KeyboardEvent key value.
 * @param keyCode - Legacy keyCode used by PM key name fallbacks.
 * @param event - Optional modifier overrides for the event.
 * @returns Keyboard event fields for a PM `Mod-*` binding.
 */
function createModKeyboardShortcutEvent(
  key: string,
  keyCode: number,
  event: Partial<Pick<KeyboardEvent, "altKey" | "ctrlKey" | "metaKey" | "shiftKey">> = {}
): Pick<KeyboardEvent, "key" | "keyCode"> &
  Partial<Pick<KeyboardEvent, "altKey" | "ctrlKey" | "metaKey" | "shiftKey">> {
  const useMetaKey = isMacKeyboardPlatform();

  return {
    key,
    keyCode,
    altKey: event.altKey ?? false,
    ctrlKey: event.ctrlKey ?? !useMetaKey,
    metaKey: event.metaKey ?? useMetaKey,
    shiftKey: event.shiftKey ?? false
  };
}

/**
 * Checks whether PM keymap will normalize `Mod-*` shortcuts to Meta.
 *
 * @returns Whether the current runtime reports a Mac-like keyboard platform.
 */
function isMacKeyboardPlatform(): boolean {
  return /Mac|iP(hone|[oa]d)/.test(globalThis.navigator?.platform ?? "");
}
