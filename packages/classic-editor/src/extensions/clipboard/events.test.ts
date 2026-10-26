import { describe, expect, it } from "vitest";
import { readClassicEditorClipboardEntries } from "./events";

describe("clipboard entries", () => {
  it("reads non-empty string formats and skips files", () => {
    const store = new Map([["text/html", "<p>a</p>"], ["text/plain", "a"], ["Files", ""], ["text/uri-list", ""]]);
    const data = { types: [...store.keys()], getData: (type: string) => store.get(type) ?? "" } as unknown as DataTransfer;
    expect(readClassicEditorClipboardEntries(data)).toEqual([["text/html", "<p>a</p>"], ["text/plain", "a"]]);
  });
});
