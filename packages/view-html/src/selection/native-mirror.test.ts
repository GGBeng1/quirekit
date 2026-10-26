import { describe, expect, it } from "vitest";
import { FakeSvgMountDocument } from "@quirekit/view/test-support/svg-mount";
import { createHtmlNativeSelectionMirror } from "./native-mirror";

describe("retained HTML native selection mirror", () => {
  it("mirrors backward model endpoints and suspends without clearing control selection", () => {
    const ownerDocument = new FakeSvgMountDocument();
    const root = ownerDocument.createElement("div");
    const text = ownerDocument.createTextNode("abcdef");
    const calls: Array<readonly [Node, number, Node, number]> = [];
    let clears = 0;
    const nativeSelection = {
      anchorNode: null,
      removeAllRanges: () => {
        clears += 1;
      },
      setBaseAndExtent: (
        anchorNode: Node,
        anchorOffset: number,
        headNode: Node,
        headOffset: number
      ) => {
        calls.push([anchorNode, anchorOffset, headNode, headOffset]);
      }
    };

    root.appendChild(text);
    (ownerDocument as unknown as { getSelection: () => Selection }).getSelection =
      () => nativeSelection as unknown as Selection;
    const mirror = createHtmlNativeSelectionMirror({
      ownerDocument: ownerDocument as unknown as Document,
      documentRoot: root as unknown as HTMLElement
    });

    mirror.sync({
      anchor: { node: text as unknown as Node, offset: 5 },
      head: { node: text as unknown as Node, offset: 1 }
    });
    mirror.suspend();

    expect(calls).toEqual([[text, 5, text, 1]]);
    expect(clears).toBe(0);
  });

  it("rejects endpoints without retained document ownership", () => {
    const ownerDocument = new FakeSvgMountDocument();
    const root = ownerDocument.createElement("div");
    const outside = ownerDocument.createTextNode("outside");
    const mirror = createHtmlNativeSelectionMirror({
      ownerDocument: ownerDocument as unknown as Document,
      documentRoot: root as unknown as HTMLElement
    });

    expect(() => mirror.sync({
      anchor: { node: outside as unknown as Node, offset: 0 },
      head: { node: outside as unknown as Node, offset: 1 }
    })).toThrow("retained document ownership");
  });
});
