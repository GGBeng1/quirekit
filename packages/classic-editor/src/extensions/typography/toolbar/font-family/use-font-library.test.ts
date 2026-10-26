// @vitest-environment happy-dom
import { createApp, defineComponent, h, nextTick, shallowReactive, watch } from "vue";
import { QuireEditor, quireDefaultDocumentFontTheme, type CommandProps } from "@quirekit/core";
import { FontFamily, TextStyle } from "@quirekit/extension-text-style";
import { StarterKit } from "@quirekit/starter-kit";
import { closeHistory } from "@quirekit/pm";
import { afterEach, expect, it, vi } from "vitest";
import type { ClassicEditorFontLibrary, ClassicEditorInstance, ClassicEditorMountedFontFamily, ClassicEditorToolbarContributionState } from "@classic/types";
import { ClassicEditorUiControllerRuntime } from "@classic/runtime/ui/controller";
import { useClassicFontLibrary } from "./use-font-library";

const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).reverse().forEach(dispose => dispose()));

it.each([false, true])("applies only the complex-script slot and restores its prior value (caret=%s)", async (caret) => {
  const fixture = mountLibrary();
  fixture.editor.commands.setLatinFontFamily("Latin Family");
  fixture.editor.commands.setEastAsiaFontFamily("CJK Family");
  if (caret) fixture.editor.commands.setTextSelection(3);
  fixture.editor.commands.command(({ tr }: CommandProps) => { closeHistory(tr); return true; });
  const before = fixture.editor.getJSON();
  const transactions: boolean[] = [];
  fixture.editor.on("transaction", ({ transaction }) => transactions.push(transaction.docChanged));
  fixture.controller.selectFontTarget("complexScript");
  expect(transactions).toEqual([]);
  expect(fixture.controller.targetLabel.value).toBe("Complex-script font");
  expect(fixture.controller.targetOptions.value).toContainEqual(expect.objectContaining({
    kind: "radio-group", selectedValue: "complexScript", children: expect.arrayContaining([
      expect.objectContaining({ value: "complexScript" })
    ])
  }));
  await fixture.controller.selectFontOption("logical:Amiri");
  expect(transactions).toEqual([!caret]);
  expect(fixture.editor.getAttributes("textStyle")).toMatchObject({
    fontFamilyLatin: "Latin Family", fontFamilyEastAsia: "CJK Family", fontFamilyComplexScript: "Amiri"
  });
  if (caret) fixture.editor.commands.insertContent("ع");
  expect(fixture.editor.commands.undo()).toBe(true);
  expect(fixture.editor.getJSON()).toEqual(before);
  expect(fixture.editor.commands.redo()).toBe(true);
  expect(JSON.stringify(fixture.editor.getJSON())).toContain("Amiri");
});

it("keeps the all-script preset atomic after choosing a complex-script font", async () => {
  const fixture = mountLibrary();
  fixture.controller.selectFontTarget("complexScript");
  await fixture.controller.selectFontOption("logical:Amiri");
  fixture.controller.selectFontTarget("all");
  await fixture.controller.selectFontOption("logical:Common Font");
  expect(fixture.editor.getAttributes("textStyle")).toMatchObject({
    fontFamily: "Common Font", fontFamilyComplexScript: null, fontFamilyLatin: null, fontFamilyEastAsia: null
  });
});

it("does not apply a downloaded font after the current editor becomes readonly", async () => {
  const fixture = mountLibrary();
  const before = fixture.editor.state.doc.toJSON();
  const applying = fixture.controller.selectFontOption("family:remote\u0000delayed");
  expect(fixture.install).toHaveBeenCalledExactlyOnceWith("Delayed Font");
  expect(fixture.controller.busyFamily.value).toBe("Delayed Font");
  fixture.editor.setEditable(false);
  fixture.finishInstall();
  await applying;
  expect(fixture.editor.state.doc.toJSON()).toEqual(before);
  expect(fixture.controller.busyFamily.value).toBe("");
  await fixture.controller.selectFontOption("logical:Logical Font");
  expect(fixture.editor.state.doc.toJSON()).toEqual(before);
  fixture.editor.setEditable(true);
  await fixture.controller.selectFontOption("logical:Logical Font");
  expect(fixture.editor.getAttributes("textStyle").fontFamily).toBe("Logical Font");
  expect(fixture.controller.fontPickerOptions.value[0]).toMatchObject({
    family: "Logical Font",
    group: "Recent fonts"
  });
});

it("rejects delayed and direct font callbacks after the exact object target expires", async () => {
  const fixture = mountLibrary();
  let current = true;
  Object.assign(fixture.state, { isTargetCurrent: () => current });
  const before = fixture.editor.state.doc.toJSON();
  const applying = fixture.controller.selectFontOption("family:remote\u0000delayed");
  current = false;
  fixture.finishInstall();
  await applying;
  await fixture.controller.selectFontOption("logical:Logical Font");
  expect(fixture.editor.state.doc.toJSON()).toEqual(before);
});

it("releases the library subscription and ignores pending or retained callbacks after unmount", async () => {
  const fixture = mountLibrary();
  const before = fixture.editor.state.doc.toJSON();
  const applying = fixture.controller.selectFontOption("family:remote\u0000delayed");
  fixture.dispose();
  expect(fixture.unsubscribe).toHaveBeenCalledTimes(1);
  fixture.finishInstall();
  await applying;
  await fixture.controller.selectFontOption("logical:Logical Font");
  expect(fixture.editor.state.doc.toJSON()).toEqual(before);
});

it.each(["latin", "complexScript"])("does not apply a downloaded font after the %s target or library changes", async (target) => {
  const fixture = mountLibrary();
  const before = fixture.editor.state.doc.toJSON();
  fixture.controller.selectFontTarget(target);
  const applying = fixture.controller.selectFontOption("family:remote\u0000delayed");
  fixture.controller.selectFontTarget("all");
  fixture.finishInstall();
  await applying;
  expect(fixture.editor.state.doc.toJSON()).toEqual(before);

  const second = mountLibrary();
  const secondBefore = second.editor.state.doc.toJSON();
  const secondApplying = second.controller.selectFontOption("family:remote\u0000delayed");
  second.state.context = {
    ...second.state.context,
    instance: Object.assign({}, second.state.context.instance, {
      fontLibrary: { ...second.fontLibrary, importedFamilies: [] }
    })
  };
  second.finishInstall();
  await secondApplying;
  expect(second.editor.state.doc.toJSON()).toEqual(secondBefore);
});

it("does not notify the picker or target menu for equal font facts while typing", () => {
  const fixture = mountLibrary();
  const changed = vi.fn();
  cleanup.push(watch(fixture.controller.fontPickerOptions, changed, { immediate: true, flush: "sync" }));
  const options = fixture.controller.fontPickerOptions.value;
  const targets = fixture.controller.targetOptions.value;
  fixture.editor.commands.setTextSelection(1);
  for (const letter of "abcdefghijklmnopqrst") {
    fixture.editor.commands.insertContent(letter);
    // Runtime diagnostics may return a new record for the same authoritative facts.
    fixture.state.context = { ...fixture.state.context, instance: Object.assign({}, fixture.state.context.instance, {
      documentFontStatus: { requestedFamily: null, renderedFamily: null, status: "pending", source: null }
    }) };
    expect(fixture.controller.fontPickerOptions.value).toBe(options);
    expect(fixture.controller.targetOptions.value).toBe(targets);
  }
  expect(changed).toHaveBeenCalledTimes(1);
});

it("refreshes current/default fonts, script targets, availability and localized diagnostics", async () => {
  const fixture = mountLibrary();
  fixture.editor.commands.setFontFamily("Logical Font");
  fixture.state.context = { ...fixture.state.context };
  expect(fixture.controller.fontPickerOptions.value[0]).toMatchObject({ family: "Logical Font", current: true });
  fixture.editor.commands.command(({ tr }: CommandProps) => { tr.setDocAttribute("fontTheme", {
    ...quireDefaultDocumentFontTheme, body: { ...quireDefaultDocumentFontTheme.body, latin: "Body Latin", eastAsia: "Body CJK" }
  }); return true; });
  fixture.state.context = { ...fixture.state.context };
  expect(fixture.controller.fontPickerOptions.value.map(option => option.family)).toEqual(
    expect.arrayContaining(["Logical Font", "Body Latin", "Body CJK"])
  );
  fixture.controller.selectFontTarget("latin");
  expect(fixture.controller.fontPickerOptions.value.some(option => option.family === "Body CJK")).toBe(false);
  fixture.state.context = { ...fixture.state.context, instance: Object.assign({}, fixture.state.context.instance, {
    documentFontStatus: { requestedFamily: "Body Latin", renderedFamily: "Fallback", status: "substituted", source: null }
  }) };
  const warning = fixture.controller.fontPickerOptions.value.find(option => option.family === "Body Latin")!.availabilityMessage;
  expect(warning).toContain("Fallback");
  expect(fixture.controller.fontPickerOptions.value.find(option => option.family === "Logical Font")!.availabilityMessage).toBe("");
  const options = fixture.controller.fontPickerOptions.value;
  const targets = fixture.controller.targetOptions.value;
  fixture.state.context = { ...fixture.state.context, locale: "zh-CN" };
  expect(fixture.controller.fontPickerOptions.value).not.toBe(options);
  expect(fixture.controller.targetOptions.value).not.toBe(targets);
  expect(fixture.controller.fontPickerOptions.value.find(option => option.family === "Body Latin")!.availabilityMessage).not.toBe(warning);
  fixture.state.context = { ...fixture.state.context, instance: Object.assign({}, fixture.state.context.instance, {
    documentFontStatus: { requestedFamily: "Body Latin", renderedFamily: "Body Latin", status: "available", source: null }
  }) };
  expect(fixture.controller.fontPickerOptions.value.every(option => option.availabilityMessage === "")).toBe(true);
  const applying = fixture.controller.selectFontOption("family:remote\u0000delayed");
  expect(fixture.controller.fontPickerOptions.value.every(option => option.disabled)).toBe(true);
  fixture.finishInstall();
  await applying;
  expect(fixture.controller.fontPickerOptions.value.every(option => !option.disabled)).toBe(true);
});

it("opens the global font section without changing direct selection fonts", () => {
  const fixture = mountLibrary();
  fixture.editor.commands.setFontFamily("Explicit Selection");
  const before = fixture.editor.state.doc.attrs.fontTheme;
  fixture.controller.selectFontTarget("document");

  expect(fixture.controller.targetLabel.value).toBe("All-script font");
  expect(fixture.controller.targetOptions.value.slice(0, 2)).toMatchObject([
    { value: "document", label: "Document font settings" },
    { value: "document-separator", kind: "separator" }
  ]);
  expect(fixture.state.context.ui.state.rightSidebar).toMatchObject({
    visible: true,
    activePanelId: "global-settings",
    targetId: "fonts",
    navigationRevision: 1
  });
  expect(fixture.editor.state.doc.attrs.fontTheme).toBe(before);
  expect(fixture.editor.getAttributes("textStyle").fontFamily)
    .toBe("Explicit Selection");
  fixture.controller.selectFontTarget("document");
  expect(fixture.state.context.ui.state.rightSidebar.navigationRevision).toBe(2);
});

it("observes mutable library notifications and replaces subscriptions with the current library", async () => {
  const fixture = mountLibrary();
  const original = fixture.controller.fontPickerOptions.value;
  fixture.fontLibrary.importedFamilies.push({ family: "New Font", familyId: "new", sourceId: "remote", importedAt: 1 });
  fixture.publishLibrary();
  expect(fixture.controller.fontPickerOptions.value).not.toBe(original);
  expect(fixture.controller.fontPickerOptions.value.some(option => option.family === "New Font")).toBe(true);
  const replacement = { ...fixture.fontLibrary, importedFamilies: [], subscribe: vi.fn(() => () => {}) };
  fixture.state.context = { ...fixture.state.context, instance: Object.assign({}, fixture.state.context.instance, { fontLibrary: replacement }) };
  await nextTick();
  expect(fixture.unsubscribe).toHaveBeenCalledTimes(1);
  expect(replacement.subscribe).toHaveBeenCalledTimes(1);
  expect(fixture.controller.fontPickerOptions.value.some(option => option.family === "New Font")).toBe(false);
});

it("shows mounted font-pack families without importing them and hides an empty recent group", async () => {
  const fixture = mountLibrary();
  fixture.fontLibrary.mountedFamilies.push(
    { family: "Noto Sans SC", displayName: "Noto 黑体（简体中文）" },
    { family: "LXGW WenKai", displayName: "霞鹜文楷" }
  );
  fixture.publishLibrary();

  const mounted = fixture.controller.fontPickerOptions.value.filter((option) => (
    option.family === "Noto Sans SC" || option.family === "LXGW WenKai"
  ));
  expect(mounted).toMatchObject([
    { label: "Noto 黑体（简体中文）", group: "Recommended fonts" },
    { label: "霞鹜文楷", group: "Recommended fonts" }
  ]);
  expect(fixture.controller.fontPickerOptions.value.some((option) => option.group === "Recent fonts"))
    .toBe(false);

  await fixture.controller.selectFontOption(mounted[1]!.value);
  expect(fixture.install).not.toHaveBeenCalledWith("LXGW WenKai");
  expect(fixture.controller.fontPickerOptions.value[0]).toMatchObject({
    family: "LXGW WenKai",
    group: "Recent fonts"
  });
});

/** @returns A mounted controller, a real formatting editor and an explicitly controlled installation promise. */
function mountLibrary() {
  const editor = new QuireEditor({ extensions: [StarterKit, TextStyle, FontFamily], content: "<p>Font test</p>" });
  editor.commands.setTextSelection({ from: 1, to: 5 });
  cleanup.push(() => editor.destroy());
  let finishInstall!: () => void;
  const installed = new Promise<void>(resolve => { finishInstall = resolve; });
  const install = vi.fn(() => installed);
  const unsubscribe = vi.fn();
  let publishLibrary = () => {};
  const recentFamilies: string[] = [];
  const mountedFamilies: ClassicEditorMountedFontFamily[] = [];
  const fontLibrary = Object.assign({} as ClassicEditorFontLibrary, {
    importedFamilies: [{ family: "Delayed Font", familyId: "delayed", sourceId: "remote", importedAt: 0 }],
    mountedFamilies,
    recentFamilies,
    subscribe: (listener: () => void) => { publishLibrary = listener; return unsubscribe; }, getStatus: () => ({ phase: "idle" }), install
  });
  fontLibrary.rememberRecentFamily = vi.fn((family: string) => {
    recentFamilies.splice(0, recentFamilies.length, family);
    publishLibrary();
  });
  const host = document.createElement("div");
  const state = shallowReactive<{ context: ClassicEditorToolbarContributionState["context"] }>({ context: {
    editor, root: host, ownerDocument: document, locale: "en", backend: "canvas", features: {},
    ui: new ClassicEditorUiControllerRuntime(false, false),
    instance: Object.assign({} as ClassicEditorInstance, { fontLibrary,
      documentFontStatus: { requestedFamily: null, renderedFamily: null, status: "pending", source: null }
    })
  } });
  let controller!: ReturnType<typeof useClassicFontLibrary>;
  const app = createApp(defineComponent({ setup() {
    controller = useClassicFontLibrary(state);
    return () => h("div");
  } }));
  document.body.append(host);
  app.mount(host);
  let disposed = false;
  /** Releases the Vue lifecycle while retaining the editor for late-callback assertions. */
  function dispose(): void { if (!disposed) { disposed = true; app.unmount(); host.remove(); } }
  cleanup.push(dispose);
  return { editor, state, controller, fontLibrary, install, unsubscribe, finishInstall, dispose, publishLibrary: () => publishLibrary() };
}
