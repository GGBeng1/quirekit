import { describe, expect, it } from "vitest";
import { ClassicEditorUiControllerRuntime } from "../../../runtime/ui";
import type {
  ClassicEditorActionContext,
  ClassicEditorActionRibbonControlContribution,
  ClassicEditorSidebarPanelContribution
} from "../../../types";
import { builtinClassicEditorChromeContributions } from "./chrome";
import { builtinClassicEditorRibbonContributions } from "./ribbon";

describe("Classic built-in product contributions", () => {
  it("shows hidden text through UI state with no document command dependency", async () => {
    const ui = new ClassicEditorUiControllerRuntime(false, false);
    const context = { ui } as unknown as ClassicEditorActionContext;
    const control = builtinClassicEditorRibbonContributions.find(
      (contribution): contribution is ClassicEditorActionRibbonControlContribution =>
        contribution.kind === "ribbon-action-control" && contribution.id === "ribbon.hidden-text"
    );
    expect(control).toBeDefined();
    expect(control!.action.isActive?.(context)).toBe(false);
    expect(await control!.action.run(context)).toBe(true);
    expect(ui.state.hiddenTextVisible).toBe(true);
    expect(ui.state.invisibleCharactersVisible).toBe(false);
    expect(await control!.action.run(context)).toBe(true);
    expect(ui.state.hiddenTextVisible).toBe(false);
  });
  it("toggles nonprinting characters without invoking document commands", async () => {
    const ui = new ClassicEditorUiControllerRuntime(false, false);
    const context = { ui } as unknown as ClassicEditorActionContext;
    const control = builtinClassicEditorRibbonContributions.find(
      (contribution): contribution is ClassicEditorActionRibbonControlContribution =>
        contribution.kind === "ribbon-action-control" && contribution.id === "ribbon.invisible-characters"
    );
    expect(control?.action.isActive?.(context)).toBe(false);
    expect(await control?.action.run(context)).toBe(true);
    expect(control?.action.isActive?.(context)).toBe(true);
    ui.reconcileVisibility(true, true);
    expect(ui.state.invisibleCharactersVisible).toBe(true);
    expect(await control?.action.run(context)).toBe(true);
    expect(control?.action.isActive?.(context)).toBe(false);
  });
  it("owns the shared leading Home group independently of optional capabilities", () => {
    expect(builtinClassicEditorRibbonContributions.find(
      contribution => contribution.id === "home-history"
    )).toMatchObject({
      kind: "ribbon-group",
      id: "home-history",
      tabId: "home",
      order: 110
    });
  });

  it("toggles the ruler through UI state independently of document commands", async () => {
    const ui = new ClassicEditorUiControllerRuntime(false, false);
    const context = { ui } as unknown as ClassicEditorActionContext;
    const control = builtinClassicEditorRibbonContributions.find(
      (contribution): contribution is ClassicEditorActionRibbonControlContribution =>
        contribution.kind === "ribbon-action-control" && contribution.id === "ribbon.ruler"
    );
    expect(control?.action.isActive?.(context)).toBe(true);
    expect(await control?.action.run(context)).toBe(true);
    expect(control?.action.isActive?.(context)).toBe(false);
    expect(await control?.action.run(context)).toBe(true);
    expect(control?.action.isActive?.(context)).toBe(true);
  });

  it("opens the exact built-in document-properties contribution", async () => {
    const ui = new ClassicEditorUiControllerRuntime(false, false);
    const context = { ui } as unknown as ClassicEditorActionContext;
    const control = builtinClassicEditorRibbonContributions.find(
      (contribution): contribution is ClassicEditorActionRibbonControlContribution =>
        contribution.kind === "ribbon-action-control"
        && contribution.id === "ribbon.properties"
    );
    const properties = builtinClassicEditorChromeContributions.find(
      (contribution): contribution is ClassicEditorSidebarPanelContribution =>
        contribution.kind === "sidebar-panel"
        && contribution.id === "properties"
    );
    const handled = await control?.action.run(context);

    expect(handled).toBe(true);
    expect(ui.state.rightSidebar).toEqual({
      visible: true,
      activePanelId: properties?.id,
      targetId: null,
      navigationRevision: 0
    });
    expect(properties?.when?.(context)).toBe(true);
  });
});
