import { describe, expect, it } from "vitest";
import { syntaxTree } from "@quirekit/cm-language";
import { MdProseStream } from "./session";

/** @param stream - Current canonical stream. @returns Its fully accepted tree, including exact source offsets. */
function signature(stream: MdProseStream): string {
  for (let attempt = 0; !stream.advance(1000); attempt++) if (attempt > 100) throw Error("unfinished-parse");
  const nodes: string[] = [];
  syntaxTree(stream.state).iterate({ enter: node => { nodes.push(`${node.name}:${node.from}:${node.to}`); } });
  return nodes.join("|");
}

describe("MdProse source streaming", () => {
  it.each([1, 2, 7, 20])("matches independent complete parsing after every %i-character chunk", size => {
    const source = "# 中文🙂\r\n\r\n[foo][bar][baz] [文档][api] [^x] [^x]\r\n\r\npara\r\n***x\r\n\r\n"
      + "    first\r\n\r\n    second\r\n\r\n```ts\r\na\r\nb\r\n```\r\n\r\n"
      + "[^x]: 脚注 [文档][api]\r\n\r\n[baz]: /target\r\n[api]: /first\r\n[api]: /second";
    const stream = new MdProseStream();
    for (let end = size; end < source.length + size; end += size) {
      const content = source.slice(0, end), fresh = new MdProseStream();
      stream.update(content); fresh.update(content);
      expect(stream.state.doc.toString()).toBe(content.replace(/\r\n?/gu, "\n"));
      expect(signature(stream)).toBe(signature(fresh));
    }
  });

  it("preserves unchanged state and replaces shortened or unrelated documents", () => {
    const stream = new MdProseStream(); stream.update("old [link][x]\n\n[x]: /old"); signature(stream);
    const before = stream.state; stream.update("old [link][x]\n\n[x]: /old");
    expect(stream.state).toBe(before);
    for (const content of ["old", "", "new [link][x]", "new [link][x]\n\n[x]: /new"]) {
      stream.update(content); const fresh = new MdProseStream(); fresh.update(content);
      expect(signature(stream)).toBe(signature(fresh));
    }
  });

  it("finishes offscreen definitions without a view and abandons old partial work on replacement", () => {
    const source = "[late][api]\n\n" + "long document paragraph\n\n".repeat(4000) + "[api]: /resolved";
    const stream = new MdProseStream(); stream.update(source);
    stream.advance(0);
    const fresh = new MdProseStream(); fresh.update(source);
    expect(signature(stream)).toBe(signature(fresh));
    expect(stream.pending).toBe(false);
    stream.update(source + "\n\n# tail"); stream.advance(0);
    stream.update("replacement [late][api]");
    const replaced = new MdProseStream(); replaced.update("replacement [late][api]");
    expect(signature(stream)).toBe(signature(replaced));
  });
});
