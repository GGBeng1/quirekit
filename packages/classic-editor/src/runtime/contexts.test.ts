import { createTheme, defaultTheme } from "@quirekit/ui";
import { expect, it } from "vitest";
import { createClassicEditorRenderContext, type ClassicEditorMountedContextOptions } from "./contexts";

/** @returns Minimal mounted authorities used by the production context factory. */
function mountedOptions(): ClassicEditorMountedContextOptions {
  return {
    instance: {} as ClassicEditorMountedContextOptions["instance"],
    editor: {} as NonNullable<ClassicEditorMountedContextOptions["editor"]>,
    root: { ownerDocument: {} } as HTMLElement,
    features: {}, locale: "en", backend: "canvas",
    ui: {} as ClassicEditorMountedContextOptions["ui"]
  };
}

it("publishes immutable theme snapshots while retaining the previous context", () => {
  const firstTheme = createTheme({ sources: { primary: "#246b55" } });
  const secondTheme = createTheme({ scheme: "dark", sources: { primary: "#8246ab" } });
  const options = mountedOptions();
  const first = createClassicEditorRenderContext({ ...options, theme: firstTheme });
  const second = createClassicEditorRenderContext({ ...options, theme: secondTheme });
  expect(first?.theme).toBe(firstTheme);
  expect(second?.theme).toBe(secondTheme);
  expect(first?.theme).toBe(firstTheme);
});

it("retains the shell companion toolbar across context refreshes and leaves custom hosts optional", () => {
  const workspaceToolbarHost = {} as HTMLElement;
  const options = { ...mountedOptions(), workspaceToolbarHost };
  expect(createClassicEditorRenderContext(options)?.workspaceToolbarHost).toBe(workspaceToolbarHost);
  expect(createClassicEditorRenderContext({ ...options, locale: "zh-CN" })?.workspaceToolbarHost).toBe(workspaceToolbarHost);
  expect(createClassicEditorRenderContext(mountedOptions())?.workspaceToolbarHost).toBeUndefined();
});

it("provides a default for older context factory callers and preserves unmounted absence", () => {
  const options = mountedOptions();
  expect(createClassicEditorRenderContext(options)?.theme).toBe(defaultTheme);
  expect(createClassicEditorRenderContext({ ...options, root: undefined })).toBeUndefined();
});
