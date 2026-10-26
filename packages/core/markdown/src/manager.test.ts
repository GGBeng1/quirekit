import { describe, expect, it } from "vitest";
import { MarkdownManager, parseMarkdown, serializeMarkdown } from "./index";

describe("MarkdownManager", () => {
  it("parses paragraph text with bold and italic marks", () => {
    expect(parseMarkdown("Marked **bold** and *italic*").content).toEqual([
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Marked " },
          { type: "text", marks: [{ type: "bold" }], text: "bold" },
          { type: "text", text: " and " },
          { type: "text", marks: [{ type: "italic" }], text: "italic" }
        ]
      }
    ]);
  });

  it("serializes paragraphs with bold and italic marks", () => {
    expect(
      serializeMarkdown({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Marked " },
              { type: "text", marks: [{ type: "bold" }], text: "bold" },
              { type: "text", text: " and " },
              { type: "text", marks: [{ type: "italic" }], text: "italic" }
            ]
          }
        ]
      })
    ).toBe("Marked **bold** and *italic*");
  });

  it("transforms normal node output without replacing child or mark rendering", () => {
    const manager = new MarkdownManager({
      extensions: [
        {
          name: "semantic-paragraph",
          markdownNodeName: "paragraph",
          transformMarkdown(node, output) {
            return node.attrs?.role === "heading"
              ? `## ${output}`
              : output;
          }
        }
      ]
    });

    expect(manager.serialize({
      type: "doc",
      content: [{
        type: "paragraph",
        attrs: { role: "heading" },
        content: [{
          type: "text",
          text: "Semantic ",
          marks: [{ type: "bold" }]
        }]
      }]
    })).toBe("## **Semantic **");
  });

  it("escapes block markers so paragraph text does not re-parse as a block", () => {
    const paragraph = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "# Title" }] }]
    };
    const serialized = serializeMarkdown(paragraph);
    expect(serialized).toBe("\\# Title");
    expect(parseMarkdown(serialized).content).toEqual([
      { type: "paragraph", content: [{ type: "text", text: "# Title" }] }
    ]);
  });

  it("exposes indentation helpers for future block serializers", () => {
    const manager = new MarkdownManager({
      indentation: { style: "tab", size: 2 }
    });

    expect(manager.indentCharacter).toBe("\t");
    expect(manager.indentString).toBe("\t\t");
  });

  it("parses and serializes with registered extension markdown handlers", () => {
    const manager = new MarkdownManager({
      extensions: [
        {
          name: "paragraph",
          markdownTokenName: "paragraph",
          parseMarkdown(token, helpers) {
            return helpers.createNode(
              "paragraph",
              undefined,
              helpers.parseInline(token.tokens ?? [])
            );
          },
          renderMarkdown(node, helpers) {
            return helpers.renderChildren(node.content ?? []);
          }
        },
        {
          name: "highlight",
          markdownTokenName: "mark",
          parseMarkdown(token, helpers) {
            return helpers.applyMark(
              "highlight",
              helpers.parseInline(token.tokens ?? []),
              { tone: "yellow" }
            );
          },
          renderMarkdown(node, helpers) {
            return `==${helpers.renderChildren(node.content ?? [])}==`;
          },
          markdownTokenizer: {
            name: "mark",
            level: "inline",
            start: "==",
            tokenize(source, _tokens, lexer) {
              const match = source.match(/^==([^=]+)==/);

              if (!match) {
                return undefined;
              }

              return {
                type: "mark",
                raw: match[0],
                tokens: lexer.inlineTokens(match[1] ?? "")
              };
            }
          }
        }
      ]
    });

    expect(manager.parse("Marked ==text==").content).toEqual([
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Marked " },
          {
            type: "text",
            text: "text",
            marks: [{ type: "highlight", attrs: { tone: "yellow" } }]
          }
        ]
      }
    ]);
    expect(manager.serialize({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Marked " },
            {
              type: "text",
              text: "text",
              marks: [{ type: "highlight", attrs: { tone: "yellow" } }]
            }
          ]
        }
      ]
    })).toBe("Marked ==text==");
  });
});
