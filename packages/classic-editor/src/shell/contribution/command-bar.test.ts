import { describe, expect, it } from "vitest";
import type {
  ClassicEditorActionRibbonControlContribution,
  ClassicEditorRibbonControlContribution,
  ClassicEditorRibbonGroupContribution,
  ClassicEditorRibbonWidgetContribution
} from "../../types";
import { resolveClassicEditorCommandBarGroups } from "./command-bar";
import {
  resolveClassicEditorActiveCommandTab,
  resolveClassicEditorCommandStripBudget,
  resolveClassicEditorCommandStripGroups,
  resolveClassicEditorCommandTabs,
  resolveClassicEditorTaskTabBudget,
  mergeClassicEditorIntrinsicWidths,
  retainClassicEditorSourceWidths
} from "./command-strip";

const groups: readonly ClassicEditorRibbonGroupContribution[] = [
  {
    kind: "ribbon-group",
    id: "history",
    tabId: "home",
    label: "History",
    presentation: "menu",
    icon: "history"
  },
  { kind: "ribbon-group", id: "empty", tabId: "home", label: "Empty" }
];
const controls: readonly ClassicEditorRibbonControlContribution[] = [
  {
    kind: "ribbon-control",
    id: "undo-control",
    groupId: "history",
    label: "Undo",
    behavior: { execute: () => true }
  },
  {
    kind: "ribbon-control",
    id: "redo-control",
    groupId: "history",
    label: "Redo",
    behavior: { execute: () => true }
  }
];
const widget: ClassicEditorRibbonWidgetContribution = {
  kind: "ribbon-widget",
  id: "font-widget",
  groupId: "history",
  mount: () => ({
    element: null,
    update: () => undefined,
    destroy: () => undefined
  })
};
const directAction: ClassicEditorActionRibbonControlContribution = {
  kind: "ribbon-action-control",
  id: "bold-control",
  groupId: "history",
  label: "Bold",
  action: {
    id: "format.bold",
    label: "Bold",
    order: 3,
    run: () => true
  }
};
const items = [...controls, directAction, widget];

describe("Classic Editor command-bar composition", () => {
  it("removes empty default groups", () => {
    expect(resolveClassicEditorCommandBarGroups(groups, items, undefined))
      .toEqual([{
        id: "history",
        tabId: "home",
        label: "History",
        presentation: "menu",
        icon: "history",
        items
      }]);
  });

  it("reorders configured controls and widgets without mutating contributions", () => {
    const resolved = resolveClassicEditorCommandBarGroups(groups, items, {
      groups: [{
        id: "custom",
        controls: [
          "redo-control",
          "missing-control",
          "font-widget",
          "undo-control"
        ]
      }]
    });

    expect(resolved.map((group) => group.items.map((item) => item.id)))
      .toEqual([["redo-control", "font-widget", "undo-control"]]);
    expect(items.map((item) => item.id))
      .toEqual(["undo-control", "redo-control", "bold-control", "font-widget"]);
  });

  it("projects direct action controls into default and configured ribbon groups", () => {
    expect(resolveClassicEditorCommandBarGroups(groups, items, undefined)[0]?.items)
      .toContain(directAction);
    expect(resolveClassicEditorCommandBarGroups(groups, items, {
      groups: [{ id: "history", controls: ["bold-control"] }]
    })[0]?.items).toEqual([directAction]);
  });

  it("lets consumer composition override a declared compound group", () => {
    expect(resolveClassicEditorCommandBarGroups(groups, items, {
      groups: [{
        id: "history",
        tabId: "insert",
        label: "Insert history",
        presentation: "inline",
        icon: "custom-history",
        controls: ["undo-control"]
      }]
    })).toEqual([{
      id: "history",
      tabId: "insert",
      label: "Insert history",
      presentation: "inline",
      icon: "custom-history",
      items: [controls[0]]
    }]);
  });

  it("removes configured groups with no installed controls", () => {
    expect(resolveClassicEditorCommandBarGroups(groups, items, {
      groups: [{ id: "missing", tabId: "insert", controls: ["unknown"] }]
    })).toEqual([]);
  });

  it("projects only direct actions into the rebuilt strip", () => {
    const result = resolveClassicEditorCommandStripGroups(groups, [directAction], undefined);
    expect(result).toEqual([{
      id: "history",
      tabId: "home",
      label: "History",
      priority: "primary",
      items: [directAction]
    }]);
    expect(result[0]?.items).not.toContain(controls[0]);
    expect(result[0]?.items).not.toContain(widget);
  });

  it("reveals matching contextual tasks without switching away from an ordinary task", () => {
    const tabs = [
      { kind: "ribbon-tab" as const, id: "home", label: "Home" },
      {
        kind: "ribbon-tab" as const,
        id: "table-layout",
        label: "Table layout",
        contextualFor: ["table" as const]
      },
      {
        kind: "ribbon-tab" as const,
        id: "image-format",
        label: "Image format",
        contextualFor: ["image" as const]
      }
    ];
    const contextualGroups = [
      ...resolveClassicEditorCommandStripGroups(groups, [directAction], undefined),
      { id: "table", tabId: "table-layout", label: "Table", priority: "primary" as const, items: [directAction] },
      { id: "image", tabId: "image-format", label: "Image", priority: "primary" as const, items: [directAction] }
    ];
    const visible = resolveClassicEditorCommandTabs(tabs, contextualGroups, "table");
    expect(visible.map((tab) => tab.id)).toEqual(["home", "table-layout"]);
    expect(resolveClassicEditorActiveCommandTab(visible, "home", "home")).toBe("home");
    expect(resolveClassicEditorActiveCommandTab([tabs[0]!], "table-layout", "home"))
      .toBe("home");
  });

  it("moves secondary and later groups into discoverable overflow first", () => {
    const budgetGroups = [
      { id: "history", tabId: "home", label: "History", priority: "essential" as const, items: [directAction] },
      { id: "format", tabId: "home", label: "Format", priority: "primary" as const, items: [directAction] },
      { id: "editing", tabId: "home", label: "Editing", priority: "secondary" as const, items: [directAction] }
    ];
    const result = resolveClassicEditorCommandStripBudget(
      budgetGroups,
      budgetGroups.map((group) => ({ id: group.id, width: 100 })),
      236,
      32,
      8
    );
    expect(result).toEqual({
      visibleIds: ["history"],
      overflowIds: ["format", "editing"]
    });
  });

  it("keeps the active task direct while overflowing later task tabs", () => {
    const tabs = ["home", "insert", "view", "table-layout"].map((id) => ({
      kind: "ribbon-tab" as const,
      id,
      label: id
    }));
    expect(resolveClassicEditorTaskTabBudget(
      tabs,
      tabs.map((tab) => ({ id: tab.id, width: 70 })),
      190,
      28,
      4,
      "table-layout"
    )).toEqual({
      visibleIds: ["home", "table-layout"],
      overflowIds: ["insert", "view"]
    });
  });

  it("retains overflowed intrinsic widths across root resize", () => {
    const measured = mergeClassicEditorIntrinsicWidths({}, [
      { id: "history", width: 100 },
      { id: "format", width: 100 },
      { id: "editing", width: 100 }
    ]);
    const afterOverflowUnmount = mergeClassicEditorIntrinsicWidths(measured, [
      { id: "history", width: 100 }
    ]);
    const budgetGroups = ["history", "format", "editing"].map((id) => ({
      id,
      tabId: "home",
      label: id,
      priority: "primary" as const,
      items: [directAction]
    }));

    expect(afterOverflowUnmount).toBe(measured);
    expect(resolveClassicEditorCommandStripBudget(
      budgetGroups,
      Object.entries(afterOverflowUnmount).map(([id, width]) => ({ id, width })),
      236,
      32,
      8
    )).toEqual({
      visibleIds: ["history"],
      overflowIds: ["format", "editing"]
    });
  });

  it("invalidates removed source ids and supports full locale reset", () => {
    const measured = { home: 54, view: 48, "table-layout": 92 };
    expect(retainClassicEditorSourceWidths(measured, Object.keys(measured)))
      .toBe(measured);
    expect(retainClassicEditorSourceWidths(measured, ["home", "table-layout"]))
      .toEqual({ home: 54, "table-layout": 92 });
    expect(mergeClassicEditorIntrinsicWidths({}, [{ id: "home", width: 62 }]))
      .toEqual({ home: 62 });
  });
});
