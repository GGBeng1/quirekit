import { describe, expect, it } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { markdown } from "@quirekit/cm-lang-markdown";
import { syntaxTree } from "@quirekit/cm-language";
import { Node } from "../../authoring/definition";
import { compileExtensions } from "../../extensions/compile";
import { defineSource } from "./compile";
import { sourceNode } from "./adapter";

const mention = Node.create({ name: "mention",
  addAttributes() { return { label: { default: "default", validate: value => typeof value === "string" && !/[\[\]\n]/u.test(value) } }; },
  addSource() { return defineSource<{ label: string }>({ nodes: ["Mention"], syntax: { name: "Mention", open: "[[", close: "]]" },
    placement: "replace", read: (document, node) => ({ label: document.slice(node.from + 2, node.to - 2) }),
    patch: (_document, node, patch) => patch.label === undefined ? null : { from: node.from + 2, to: node.to - 2, insert: patch.label },
    renderer: () => ({ update() {}, destroy() {} }),
  }); },
});

describe("parser-neutral source authoring", () => {
  it("exposes all direct children in source order while retaining kind-filtered access", () => {
    const state = EditorState.create({ doc: "![*label* &amp;](./image.svg)", extensions: markdown() });
    const node = sourceNode(syntaxTree(state).topNode.firstChild!.firstChild!);
    expect(node.children().map(child => child.kind)).toEqual(["LinkMark", "Emphasis", "Entity", "LinkMark", "LinkMark", "URL", "LinkMark"]);
    expect(node.children("LinkMark").map(child => child.from)).toEqual(node.children().filter(child => child.kind === "LinkMark").map(child => child.from));
  });
  it("compiles a new inline syntax, validates fields and patches exact source", () => {
    const compiled = compileExtensions([mention]);
    const state = EditorState.create({ doc: "prefix [[name]] suffix", extensions: markdown({ extensions: compiled.syntax }) });
    const node = syntaxTree(state).resolveInner(10);
    expect(node.name).toBe("Mention");
    const spec = compiled.nodeViews.get("Mention")!;
    expect(spec.read(state, node)).toEqual({ label: "name" });
    expect(spec.patch(state, node, { label: "bad\nvalue" })).toBeNull();
    expect(spec.patch(state, node, { unknown: "field" })).toBeNull();
    expect(state.update({ changes: spec.patch(state, node, { label: "changed" })! }).newDoc.toString()).toBe("prefix [[changed]] suffix");
  });
  it("retains unclosed, escaped and nested forms as source instead of guessing", () => {
    const compiled = compileExtensions([mention]);
    for (const doc of ["[[unfinished", "[[a\\b]]", "\\[[escaped]]", "`[[code]]`", "[[line\nbreak]]"]) {
      const state = EditorState.create({ doc, extensions: markdown({ extensions: compiled.syntax }) });
      expect(syntaxTree(state).toString()).not.toContain("Mention");
      expect(state.doc.toString()).toBe(doc);
    }
  });
});
