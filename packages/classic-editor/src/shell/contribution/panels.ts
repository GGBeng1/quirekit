import type {
  ClassicEditorMountedRenderable,
  ClassicEditorRenderContext,
  ClassicEditorSidebarPanelContribution
} from "../../types";
import { appendRenderedValue, isMountedRenderable } from "./utils";
import type { ClassicEditorShellRegions } from "../types";
import {
  createSidebarPanelHeader,
  updateSidebarPanelHeader,
  type ClassicEditorSidebarPanelHeader
} from "./sidebar-panel-header";

/** One interactive panel retained inside a stable sidebar host. */
interface RetainedClassicEditorSidebarPanel {
  /** Stable contribution id used to reconcile later refreshes. */
  readonly id: string;
  /** Product-owned section whose presentation follows the active contribution. */
  readonly section: HTMLElement;
  /** Product-owned title and close chrome. */
  readonly header: ClassicEditorSidebarPanelHeader;
  /** Extension-owned mounted content lifecycle. */
  readonly controller: ClassicEditorMountedRenderable;
}

const retainedSidebarPanels = new WeakMap<
  HTMLElement,
  RetainedClassicEditorSidebarPanel
>();

/**
 * Renders left and right sidebar panel contributions.
 *
 * @param elements - Product shell elements.
 * @param panels - Sidebar panel contributions.
 * @param context - Mounted product context.
 */
export function renderSidebars(
  elements: ClassicEditorShellRegions,
  panels: readonly ClassicEditorSidebarPanelContribution[],
  context: ClassicEditorRenderContext
): void {
  const rightPanel = panels.find((panel) =>
    panel.side === "right"
    && context.ui.state.rightSidebar.activePanelId === panel.id
  );
  const rightScrollOwner = elements.root.dataset.layout === "compact" ? "panel" : rightPanel?.scrollOwner ?? "panel";
  // Retain the actual panel subtree across breakpoints, including input drafts
  // and subscriptions; only its host changes between rail and overlay.
  const from = rightScrollOwner === "panel" ? elements.documentSidebar : elements.rightSidebar;
  const to = rightScrollOwner === "panel" ? elements.rightSidebar : elements.documentSidebar;
  const retained = retainedSidebarPanels.get(from);
  if (retained && retained.id === rightPanel?.id) {
    destroyRetainedSidebarPanel(to);
    to.replaceChildren(retained.section);
    retainedSidebarPanels.delete(from);
    retainedSidebarPanels.set(to, retained);
  }
  renderSidebar(
    elements.leftSidebar,
    panels.find((panel) =>
      panel.side === "left"
      && context.ui.state.leftSidebar.activePanelId === panel.id
    ),
    context
  );
  renderSidebar(
    elements.rightSidebar,
    rightScrollOwner === "panel" ? rightPanel : undefined,
    context
  );
  renderSidebar(
    elements.documentSidebar,
    rightScrollOwner === "workspace" ? rightPanel : undefined,
    context
  );
  const rightVisible = context.ui.state.rightSidebar.visible
    && rightPanel !== undefined;
  elements.rightSidebar.hidden = !rightVisible || rightScrollOwner !== "panel";
  elements.documentSidebar.hidden = !rightVisible
    || rightScrollOwner !== "workspace";
  elements.root.dataset.rightSidebarScrollOwner = rightScrollOwner;
}

/**
 * Releases mounted sidebar contribution content before replacement or teardown.
 *
 * @param elements - Product shell regions that own the sidebar hosts.
 */
export function destroyRenderedSidebars(
  elements: Pick<
    ClassicEditorShellRegions,
    "documentSidebar" | "leftSidebar" | "rightSidebar"
  >
): void {
  destroyRetainedSidebarPanel(elements.leftSidebar);
  destroyRetainedSidebarPanel(elements.rightSidebar);
  destroyRetainedSidebarPanel(elements.documentSidebar);
  elements.leftSidebar.replaceChildren();
  elements.rightSidebar.replaceChildren();
  elements.documentSidebar.replaceChildren();
}

/**
 * Reconciles one side without invalidating an in-flight event target.
 *
 * @param host - Stable product-owned sidebar host.
 * @param panel - Currently selected applicable panel, if any.
 * @param context - Latest mounted product context.
 */
function renderSidebar(
  host: HTMLElement,
  panel: ClassicEditorSidebarPanelContribution | undefined,
  context: ClassicEditorRenderContext
): void {
  const retained = retainedSidebarPanels.get(host);
  if (retained !== undefined && retained.id === panel?.id) {
    updateSidebarPanelHeader(retained.section, retained.header, panel, context);
    retained.controller.update?.(context);
    return;
  }

  // A changed owner ends the old lifecycle before the host accepts replacement DOM.
  destroyRetainedSidebarPanel(host);
  host.replaceChildren();
  if (panel === undefined) return;

  const section = context.ownerDocument.createElement("section");
  const header = createSidebarPanelHeader(context, panel);
  section.className = "qk-classic-editor__sidebar-panel";
  updateSidebarPanelHeader(section, header, panel, context);
  section.append(header.element);
  const value = panel.render(context);
  appendRenderedValue(section, value);
  host.append(section);
  if (isMountedRenderable(value)) {
    retainedSidebarPanels.set(host, {
      id: panel.id,
      section,
      header,
      controller: value
    });
  }
}

/**
 * Ends one retained panel lifecycle at most once.
 *
 * @param host - Sidebar host whose mounted controller should be released.
 */
function destroyRetainedSidebarPanel(host: HTMLElement): void {
  const retained = retainedSidebarPanels.get(host);
  if (retained === undefined) return;
  retainedSidebarPanels.delete(host);
  retained.controller.destroy();
}
