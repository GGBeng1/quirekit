// @vitest-environment happy-dom

import { createEditor } from "@quirekit/core";
import { describe, expect, it } from "vitest";
import { createTextStyleTestExtensions } from "../testing/extensions";
import { Highlight } from "./highlight";

/**
 * Parses one HTML paragraph and returns the marks on its first text run.
 *
 * @param html - Paragraph HTML containing a highlighted run.
 * @returns Serialized marks of the first text node.
 */
function parseFirstRunMarks(html: string) {
  const editor = createEditor({ extensions: [...createTextStyleTestExtensions(), Highlight] });
  editor.setContent(html, { contentType: "html" });
  const marks = editor.getJSON().content?.[0]?.content?.[0]?.marks;
  editor.destroy();
  return marks;
}

describe("Highlight HTML parsing", () => {
  it("keeps QuireKit tokens and maps pasted CSS colors into the OOXML value space", () => {
    expect(parseFirstRunMarks('<p><mark data-qk-highlight-color="darkYellow">a</mark></p>'))
      .toEqual([{ type: "highlight", attrs: { color: "darkYellow" } }]);
    expect(parseFirstRunMarks('<p><mark style="background-color: #fff2a8">a</mark></p>'))
      .toEqual([{ type: "highlight", attrs: { color: "yellow" } }]);
    expect(parseFirstRunMarks('<p><mark style="background-color: navy">a</mark></p>'))
      .toEqual([{ type: "highlight", attrs: { color: "darkBlue" } }]);
    expect(parseFirstRunMarks("<p><mark>a</mark></p>"))
      .toEqual([{ type: "highlight", attrs: { color: "yellow" } }]);
  });

  it("drops a mark whose paint is transparent", () => {
    expect(parseFirstRunMarks('<p><mark style="background-color: transparent">a</mark></p>')).toBeUndefined();
  });
});
