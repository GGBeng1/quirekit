import { describe, expect, it } from "vitest";
import { Doc, createRelativePositionFromTypeIndex, encodeRelativePosition } from "yjs";
import { relativeActivityResolver } from "./relative";

describe("relativeActivityResolver", () => {
  it("follows concurrent paragraph splits and merges, and collapses when the content is deleted", () => {
    const doc = new Doc(), text = doc.getText("source"), source = "第一段内容。第二句话。\n\n结尾。\n";
    text.insert(0, source);
    /** @param index - Source index. @param assoc - Side the position sticks to. @returns Base64 relative position. */
    const encode = (index: number, assoc: number) => btoa(String.fromCharCode(...encodeRelativePosition(createRelativePositionFromTypeIndex(text, index, assoc))));
    const from = source.indexOf("第二句话"), resolve = relativeActivityResolver(doc);
    const target = { scheme: "yjs-relative", value: { from: encode(from, 0), to: encode(from + 4, -1) } };
    text.insert(source.indexOf("内容"), "\n\n");
    expect(resolve(target)).toEqual({ from: from + 2, to: from + 6 });
    text.delete(text.toString().indexOf("。\n\n结尾") + 1, 2);
    expect(resolve(target)).toEqual({ from: from + 2, to: from + 6 });
    text.delete(from + 2, 4);
    expect(resolve(target)).toEqual({ from: from + 2, to: from + 2 });
    expect(resolve({ scheme: "yjs-relative", value: { from: "!!", to: "!!" } })).toBeNull();
    expect(resolve({ scheme: "source-range", value: {} })).toBeNull();
  });
});
