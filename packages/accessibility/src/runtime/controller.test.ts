import { createEditor, Extension, type QuireAnyExtension } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { svgViewExtension } from "@quirekit/view";
import { Plugin } from "@quirekit/pm";
import { afterEach, describe, expect, it } from "vitest";
import { Accessibility } from "../extension";
import { getAccessibility } from "./controller";

const cleanups: Array<() => void> = [];
afterEach(() => { cleanups.splice(0).reverse().forEach((cleanup) => cleanup()); });

/** @param installed - Whether to install the optional package. @param enabled - Initial policy. @returns Actual mounted SVG consumer. */
function setup(installed = true, enabled = true, extensions: QuireAnyExtension[] = []) {
  const host = document.createElement("div");
  document.body.append(host);
  const editor = createEditor({ element: host, mode: "svg",
    extensions: [StarterKit, ...extensions, svgViewExtension(), ...(installed ? [Accessibility.configure({ enabled, readingBlocks: 1 })] : [])],
    content: { type: "doc", content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Title" }] },
      { type: "paragraph", content: [{ type: "text", text: "Second" }] }
    ] }
  });
  cleanups.push(() => { editor.destroy(); host.remove(); });
  return { editor, host, controller: getAccessibility(editor), input: editor.view.elements.inputProxy! };
}

describe("installed accessibility lifecycle", () => {
  it("allocates no accessibility DOM when absent or disabled, and never reconfigures PM on toggle", () => {
    const absent = setup(false);
    expect(absent.controller).toBeNull();
    expect(absent.host.querySelector("[data-qk-accessibility]")).toBeNull();
    const { controller, editor, host, input } = setup(true, false);
    const plugins = editor.state.pm.plugins;
    editor.commands.setTextSelection(2);
    expect(controller!.getDiagnostics()[0]).toMatchObject({ contextCompiles: 0, readingCompiles: 0 });
    expect(host.querySelector("[data-qk-accessibility]")).toBeNull();
    controller!.setEnabled(true);
    expect(input.value).toBe("Title");
    expect(host.querySelector("[data-qk-accessibility]")).not.toBeNull();
    controller!.setEnabled(false);
    expect(input.value).toBe("");
    expect(editor.state.pm.plugins).toBe(plugins);
    expect(host.querySelector("[data-qk-accessibility]")).toBeNull();
  });

  it("collects only on enable, once per editor across mounts and repeated toggles", () => {
    let calls = 0;
    const facts = Extension.create({ name: "countAccessibility", addAccessibility() { calls++; return []; } });
    setup(false, true, [facts]);
    const first = setup(true, false, [facts]);
    const second = setup(true, false, [facts]);
    expect(calls).toBe(0);
    first.controller!.setEnabled(true);
    first.controller!.setEnabled(false);
    first.controller!.setEnabled(true);
    expect(calls).toBe(1);
    second.controller!.setEnabled(true);
    expect(calls).toBe(2);
    expect(first.controller).not.toBe(second.controller);
  });

  it("retains native context and reading DOM across PM plugin reconfiguration", () => {
    const { editor, controller, host, input } = setup();
    controller!.focusReading();
    const heading = host.querySelector("h2");
    const counts = controller!.getDiagnostics()[0]!;
    editor.registerPlugin(new Plugin({}));
    expect(host.querySelector("h2")).toBe(heading);
    expect(input.value).toBe("Title");
    expect(controller!.getDiagnostics()[0]).toMatchObject({ contextCompiles: counts.contextCompiles, readingCompiles: counts.readingCompiles });
    editor.commands.setTextSelection(3);
    expect(host.querySelector("h2")).toBe(heading);
    expect(controller!.getDiagnostics()[0]!.readingCompiles).toBe(counts.readingCompiles);
  });

  it("provides complete explicit segments and returns to the requested source paragraph", () => {
    const { editor, controller, host, input } = setup();
    expect(controller!.focusReading()).toBe(true);
    expect(host.querySelector("h2")?.textContent).toBe("Title");
    const next = [...host.querySelectorAll("button")].find((button) => button.textContent === "下一段阅读内容")!;
    next.click();
    expect(host.textContent).toContain("Second");
    expect(next.disabled).toBe(true);
    const edit = [...host.querySelectorAll("button")].find((button) => button.textContent === "编辑此段")!;
    edit.click();
    expect(editor.state.pm.selection.head).toBe(8);
    expect(document.activeElement).toBe(input);
    expect(input.value).toBe("Second");
    expect(host.querySelector("section")?.hidden).toBe(true);
  });

  it("owns independent sessions for additional mounts and clears them on unmount", () => {
    const { editor, controller } = setup();
    const secondHost = document.createElement("div");
    document.body.append(secondHost);
    cleanups.push(() => secondHost.remove());
    const view = editor.mount({ element: secondHost, mode: "svg", id: "secondary" });
    expect(controller!.getDiagnostics()).toHaveLength(2);
    expect(controller!.focusReading(view.id)).toBe(true);
    editor.unmount();
    expect(controller!.getDiagnostics()).toHaveLength(0);
    expect(document.querySelector("[data-qk-accessibility]")).toBeNull();
  });

  it("keeps reading available while the view is read-only", () => {
    const { editor, controller, host } = setup();
    editor.setEditable(false);
    expect(controller!.focusReading()).toBe(true);
    expect(controller!.focusEditing()).toBe(false);
    const edit = [...host.querySelectorAll("button")].find((button) => button.textContent === "编辑此段")!;
    expect(edit.disabled).toBe(true);
    expect(editor.state.doc.textContent).toBe("TitleSecond");
  });
});
