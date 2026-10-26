import { resolveClassicEditorIcon } from "../../icons";
import {
  getBuiltinClassicEditorText,
  resolveClassicEditorText
} from "../../localization";
import type {
  ClassicEditorRenderContext,
  ClassicEditorSidebarPanelContribution
} from "../../types";

/** Product-owned header chrome shared by standard sidebar panels. */
export interface ClassicEditorSidebarPanelHeader {
  /** Header container inserted before extension-owned content. */
  readonly element: HTMLElement;
  /** Accessible visible panel title. */
  readonly heading: HTMLHeadingElement;
  /** Optional close action for a sidebar panel. */
  readonly closeButton: HTMLButtonElement | null;
}

/**
 * Creates product-owned title and close chrome for one sidebar panel.
 *
 * @param context - Current mounted product context.
 * @param panel - Active sidebar contribution.
 * @returns Header DOM retained with mounted panel content.
 */
export function createSidebarPanelHeader(
  context: ClassicEditorRenderContext,
  panel: ClassicEditorSidebarPanelContribution
): ClassicEditorSidebarPanelHeader {
  const element = context.ownerDocument.createElement("header");
  const heading = context.ownerDocument.createElement("h2");
  element.className = "qk-classic-editor__sidebar-panel-header";
  element.append(heading);
  const closeButton = createSidebarCloseButton(context, panel.side);
  if (closeButton !== null) element.append(closeButton);
  return { element, heading, closeButton };
}

/**
 * Refreshes locale and presentation without remounting feature content.
 *
 * @param section - Product-owned sidebar section.
 * @param header - Retained header chrome.
 * @param panel - Active sidebar contribution.
 * @param context - Latest mounted product context.
 */
export function updateSidebarPanelHeader(
  section: HTMLElement,
  header: ClassicEditorSidebarPanelHeader,
  panel: ClassicEditorSidebarPanelContribution,
  context: ClassicEditorRenderContext
): void {
  const presentation = panel.presentation ?? "default";
  section.dataset.presentation = presentation;
  header.element.hidden = presentation === "bare";
  header.heading.hidden = presentation === "bare";
  header.heading.textContent = resolveClassicEditorText(panel.label, context.locale);
  header.closeButton?.setAttribute("aria-label", resolveClassicEditorText(
    getBuiltinClassicEditorText("close"),
    context.locale
  ));
}

/**
 * Creates the common close action owned by standard sidebar panels.
 *
 * @param context - Current mounted product context.
 * @param side - Sidebar whose retained content is being dismissed.
 * @returns Accessible icon button bound to the sidebar controller.
 */
function createSidebarCloseButton(
  context: ClassicEditorRenderContext,
  side: "left" | "right"
): HTMLButtonElement {
  const button = context.ownerDocument.createElement("button");
  const icon = context.ownerDocument.createElement("span");
  button.type = "button";
  button.className = "qk-button qk-icon-button qk-button--neutral-text qk-icon-button--sm";
  icon.className = "qk-button__icon qk-button__icon--sm";
  icon.setAttribute("aria-hidden", "true");
  icon.innerHTML = resolveClassicEditorIcon("close") ?? "";
  button.append(icon);
  button.addEventListener("click", () => context.ui.closeSidebar(side));
  return button;
}
