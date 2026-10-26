import { expect, it } from "vitest";
import { ClassicEditorUiControllerRuntime } from "../../runtime/ui/controller";
import { reconcileClassicMobilePreferences } from "./preferences";

it("restores desktop intent after compact UI changes and replacement subscribers", () => {
  const ui = new ClassicEditorUiControllerRuntime(true, true);
  ui.setZoom(83);
  ui.setZoomMode("fit-page");
  let compact = true;
  const unsubscribe = ui.subscribe(() => reconcileClassicMobilePreferences(ui, compact));
  reconcileClassicMobilePreferences(ui, compact);
  expect(ui.state.zoomMode).toBe("fit-content");
  expect(ui.state.leftSidebar.visible).toBe(false);
  ui.setZoom(120);
  ui.setSidebarVisible("left", true);
  unsubscribe();
  // A new Shell consults the same UI owner; it must not capture mobile values.
  const dispose = ui.subscribe(() => reconcileClassicMobilePreferences(ui, compact));
  reconcileClassicMobilePreferences(ui, compact);
  expect(ui.state.zoom).toBe(120);
  expect(ui.state.leftSidebar.visible).toBe(true);
  compact = false;
  reconcileClassicMobilePreferences(ui, compact);
  expect(ui.state.zoom).toBe(83);
  expect(ui.state.zoomMode).toBe("fit-page");
  expect(ui.state.leftSidebar.visible).toBe(true);
  expect(ui.state.rightSidebar.visible).toBe(true);
  dispose();
});

it("keeps each instance's desktop preference and subsequent entry independent", () => {
  const first = new ClassicEditorUiControllerRuntime(false, false);
  const second = new ClassicEditorUiControllerRuntime(true, false);
  second.setZoom(150);
  reconcileClassicMobilePreferences(first, true);
  reconcileClassicMobilePreferences(second, true);
  reconcileClassicMobilePreferences(first, false);
  expect(first.state.zoom).toBe(100);
  expect(second.state.zoomMode).toBe("fit-content");
  first.setZoom(70);
  reconcileClassicMobilePreferences(first, true);
  reconcileClassicMobilePreferences(first, false);
  reconcileClassicMobilePreferences(second, false);
  expect(first.state.zoom).toBe(70);
  expect(second.state.zoom).toBe(150);
  expect(second.state.leftSidebar.visible).toBe(true);
});
