import type { QuireKitToolbarEntry } from "@quirekit/ui";
import type { BlockWebLinkView } from "../../web-card/types";

/** The same labels, artwork and order at every link presentation. */
export const webLinkViews = [
  { value: "link", label: "链接视图", icon: "link" },
  { value: "title", label: "标题视图", icon: "type" },
  { value: "card", label: "卡片视图", icon: "panelTop" },
  { value: "preview", label: "预览视图", icon: "monitor" }
] as const;

/**
 * Builds the public Toolbar menu; permissions and schema fit are supplied by its owner.
 * @param current - Current presentation.
 * @param allowed - Side-effect-free target capability check.
 * @param portalTarget - Optional inline task boundary for portaled keyboard focus.
 * @returns One shared view selector.
 */
export function webLinkViewMenu(current: BlockWebLinkView, allowed: (view: BlockWebLinkView) => boolean, portalTarget?: HTMLElement): QuireKitToolbarEntry {
  const selected = webLinkViews.find(item => item.value === current)!;
  return {
    value: "view", label: "链接展示方式", tooltip: "切换链接展示方式", text: selected.label, icon: selected.icon,
    kind: "menu", trigger: "disclosure", overlayProps: { minWidth: 176, restoreFocus: false, ...(portalTarget ? { portalTarget } : {}) },
    items: webLinkViews.map(item => {
      const enabled = allowed(item.value);
      return { ...item, value: `view:${item.value}`, checked: current === item.value, closeOnSelect: true, disabled: !enabled, ...(!enabled ? { reason: "当前位置不支持此展示方式" } : {}) };
    })
  };
}

/** @param value - Public toolbar intent. @returns The requested view, or null for another action. */
export function requestedWebLinkView(value: string): BlockWebLinkView | null {
  return webLinkViews.find(item => `view:${item.value}` === value)?.value ?? null;
}
