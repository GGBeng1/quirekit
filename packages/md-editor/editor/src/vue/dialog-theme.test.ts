// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { createTheme } from "@quirekit/ui";
import type { MsfeEditor } from "@quirekit/msfe-core";
import { bindMdDialogTheme, mdDialogTheme } from "./dialog-theme";

/** @param element - Editor element. @returns The part of an editor the dialog theme reads. */
const editorOf = (element: HTMLElement) => ({ element }) as unknown as MsfeEditor;

describe("md-editor dialog theme", () => {
  it("uses the host theme bound to the editor", () => {
    const element = document.createElement("div");
    const host = createTheme({ scheme: "dark" });
    bindMdDialogTheme(element, () => host);
    expect(mdDialogTheme(editorOf(element))).toBe(host);
  });

  it("falls back to a default theme in the editor's scheme without a host theme", () => {
    const scope = document.createElement("div");
    scope.dataset.qkScheme = "dark";
    const element = scope.appendChild(document.createElement("div"));
    bindMdDialogTheme(element, () => undefined);
    expect(mdDialogTheme(editorOf(element)).scheme).toBe("dark");
    expect(mdDialogTheme(editorOf(document.createElement("div"))).scheme).toBe("light");
  });
});
