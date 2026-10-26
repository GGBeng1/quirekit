import { describe, expect, it } from "vitest";
import { readSimplePlainInput } from "./value";

/** @param name - Native element or #text. @param children - Recorded native children. @returns Minimal read-only DOM fixture. */
function node(name: string, children: readonly Node[] | string = []): Node {
  return { nodeName: name, nodeType: name === "#text" ? 3 : 1,
    nodeValue: typeof children === "string" ? children : null,
    childNodes: typeof children === "string" ? [] : children } as unknown as Node;
}
/** @param value - Literal text. @returns A native text node fixture. */
function text(value: string): Node { return node("#text", value); }

describe("native plain input", () => {
  it("reads Chromium and Firefox breaks without the caret-only terminal BR", () => {
    const lines = [text("第一行"), node("BR"), text("第二行")];
    expect(readSimplePlainInput(node("DIV", lines))).toBe("第一行\n第二行");
    expect(readSimplePlainInput(node("DIV", [...lines, node("BR")]))).toBe("第一行\n第二行");
  });
  it("retains Safari block lines and repeated intentional empty lines", () => {
    expect(readSimplePlainInput(node("DIV", [text("第一行"), node("DIV", [text("第二行")])]))).toBe("第一行\n第二行");
    expect(readSimplePlainInput(node("DIV", [text("第一行"), node("DIV", [node("BR")]), node("DIV", [node("BR")])]))).toBe("第一行\n\n");
    expect(readSimplePlainInput(node("DIV", [node("P", [text("第一行")]), node("P", [text("第二行")])]))).toBe("第一行\n第二行");
  });
  it("distinguishes source or pasted final LF from native placeholders without trimming", () => {
    expect(readSimplePlainInput(node("DIV", [text("  首尾空格  \n")]))).toBe("  首尾空格  \n");
    expect(readSimplePlainInput(node("DIV", [text("末行"), node("BR"), node("BR")]))).toBe("末行\n");
    expect(readSimplePlainInput(node("DIV", [text("末行"), node("BR"), text("")]))).toBe("末行\n");
    expect(readSimplePlainInput(node("DIV", [node("BR")]))).toBe("");
    expect(readSimplePlainInput(node("DIV", [text("<b>纯文本</b>")]))).toBe("<b>纯文本</b>");
  });
});
