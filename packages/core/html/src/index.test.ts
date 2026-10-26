import { Document } from "@quirekit/extension-document";
import { Paragraph } from "@quirekit/extension-paragraph";
import { Text } from "@quirekit/extension-text";
import { describe, expect, it } from "vitest";
import { generateHTML, generateJSON } from "./server";

describe("@quirekit/html/server", () => {
  it("generates HTML from JSON without an editor instance", () => {
    const html = generateHTML(
      {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Example Text" }]
          }
        ]
      },
      [Document, Paragraph, Text]
    );

    expect(html).toBe('<p xmlns="http://www.w3.org/1999/xhtml">Example Text</p>');
  });

  it("generates JSON from HTML without an editor instance", () => {
    const json = generateJSON("<p>Example Text</p>", [Document, Paragraph, Text]);

    expect(json).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Example Text" }]
        }
      ]
    });
  });

  it("ignores resource tags when parsing HTML", () => {
    const json = generateJSON(
      `
        <link rel="stylesheet" href="/assets/app.css">
        <script src="/assets/app.js"></script>
        <style>body { color: red; }</style>
        <p>Content after resource tags</p>
      `,
      [Document, Paragraph, Text]
    );

    expect(json.content?.some((node) => node.type === "paragraph")).toBe(true);
  });
});
