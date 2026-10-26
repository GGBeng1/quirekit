import { describe, expect, it } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { markdown } from "@quirekit/cm-lang-markdown";
import { Mark } from "../../authoring/definition";
import { compileExtensions } from "../../extensions/compile";
import { defineSource } from "./compile";

describe("independent source semantics", () => {
  it("installs a pure Mark codec without allocating a renderer", () => {
    const pure = Mark.create({ name: "emphasis", addSource: () => defineSource({
      nodes: ["Emphasis"], read: () => ({}), patch: () => null,
    }) });
    const compiled = compileExtensions([pure]);
    expect(compiled.nodeViews.size).toBe(0);
    expect(compiled.sources.get("emphasis")?.kind).toBe("mark");
    const state = EditorState.create({ doc: "*word*", extensions: markdown({ extensions: compiled.syntax }) });
    expect(state.doc.toString()).toBe("*word*");
  });
});
