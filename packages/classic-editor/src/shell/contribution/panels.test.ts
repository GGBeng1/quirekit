// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";
import type {
  ClassicEditorRenderContext,
  ClassicEditorSidebarPanelContribution
} from "../../types";
import type { ClassicEditorShellRegions } from "../types";
import { destroyRenderedSidebars, renderSidebars } from "./panels";

describe("Classic sidebar panel lifecycle", () => {
  it("retains and updates one mounted panel across same-id refreshes", () => {
    const elements = createShellRegions();
    const update = vi.fn();
    const destroy = vi.fn();
    const render = vi.fn((context: ClassicEditorRenderContext) => {
      const button = context.ownerDocument.createElement("button");
      button.textContent = "Close";
      return { element: button, update, destroy };
    });
    const panel = {
      kind: "sidebar-panel",
      id: "inspector",
      side: "right",
      label: "Inspector",
      render
    } satisfies ClassicEditorSidebarPanelContribution;
    const firstContext = createContext("inspector", "canvas");
    const secondContext = createContext("inspector", "svg");

    renderSidebars(elements, [panel], firstContext);
    const firstButton = elements.rightSidebar.querySelector("button");
    renderSidebars(elements, [panel], secondContext);

    expect(render).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith(secondContext);
    expect(destroy).not.toHaveBeenCalled();
    expect(elements.rightSidebar.querySelector("button")).toBe(firstButton);

    destroyRenderedSidebars(elements);
    destroyRenderedSidebars(elements);
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("destroys a mounted panel when the selected contribution changes", () => {
    const elements = createShellRegions();
    const firstDestroy = vi.fn();
    const secondDestroy = vi.fn();
    const first = createMountedPanel("first", firstDestroy);
    const second = createMountedPanel("second", secondDestroy);

    renderSidebars(elements, [first, second], createContext("first", "canvas"));
    renderSidebars(elements, [first, second], createContext("second", "canvas"));

    expect(firstDestroy).toHaveBeenCalledOnce();
    expect(secondDestroy).not.toHaveBeenCalled();
    expect(elements.rightSidebar.textContent).toContain("second");

    renderSidebars(elements, [], createContext("second", "canvas"));
    expect(secondDestroy).toHaveBeenCalledOnce();
    expect(elements.rightSidebar.childNodes).toHaveLength(0);
  });

  it("refreshes stateless panel values instead of retaining stale nodes", () => {
    const elements = createShellRegions();
    let revision = 0;
    const panel = {
      kind: "sidebar-panel",
      id: "status",
      side: "right",
      label: "Status",
      render(context: ClassicEditorRenderContext) {
        const output = context.ownerDocument.createElement("output");
        output.textContent = String(++revision);
        return output;
      }
    } satisfies ClassicEditorSidebarPanelContribution;

    renderSidebars(elements, [panel], createContext("status", "canvas"));
    const firstOutput = elements.rightSidebar.querySelector("output");
    renderSidebars(elements, [panel], createContext("status", "canvas"));

    expect(elements.rightSidebar.textContent).toContain("2");
    expect(elements.rightSidebar.querySelector("output")).not.toBe(firstOutput);
  });

  it("lets a bare product workspace own its heading and panel spacing", () => {
    const elements = createShellRegions();
    const panel = {
      kind: "sidebar-panel",
      id: "workspace",
      side: "right",
      label: "AI workspace",
      presentation: "bare",
      render(context: ClassicEditorRenderContext) {
        const body = context.ownerDocument.createElement("div");
        body.dataset.workspace = "true";
        return body;
      }
    } satisfies ClassicEditorSidebarPanelContribution;

    renderSidebars(elements, [panel], createContext("workspace", "canvas"));

    const section = elements.rightSidebar.querySelector("section");
    const heading = elements.rightSidebar.querySelector("h2");
    expect(section?.dataset.presentation).toBe("bare");
    expect(heading?.hidden).toBe(true);
    expect(elements.rightSidebar.querySelector("[data-workspace=true]")).not.toBeNull();
  });

  it("provides one common close action for standard right-side panels", () => {
    const elements = createShellRegions();
    const closeSidebar = vi.fn();
    const panel = createMountedPanel("settings", vi.fn());

    renderSidebars(
      elements,
      [panel],
      createContext("settings", "canvas", closeSidebar)
    );
    elements.rightSidebar.querySelector<HTMLButtonElement>(
      "button[aria-label=Close]"
    )?.click();

    expect(closeSidebar).toHaveBeenCalledExactlyOnceWith("right");
  });

  it("routes a workspace-owned right panel into the shared document scroller", () => {
    const elements = createShellRegions();
    const destroy = vi.fn();
    const panel = {
      kind: "sidebar-panel",
      id: "comments",
      side: "right",
      scrollOwner: "workspace",
      label: "Comments",
      render(context: ClassicEditorRenderContext) {
        const body = context.ownerDocument.createElement("div");
        body.dataset.commentRail = "true";
        return { element: body, destroy };
      }
    } satisfies ClassicEditorSidebarPanelContribution;

    renderSidebars(elements, [panel], createContext("comments", "canvas"));

    expect(elements.root.dataset.rightSidebarScrollOwner).toBe("workspace");
    expect(elements.rightSidebar.hidden).toBe(true);
    expect(elements.rightSidebar.childNodes).toHaveLength(0);
    expect(elements.documentSidebar.hidden).toBe(false);
    expect(elements.documentSidebar.querySelector("h2")?.textContent)
      .toBe("Comments");
    expect(elements.documentSidebar.querySelector("[data-comment-rail=true]"))
      .not.toBeNull();

    renderSidebars(elements, [], createContext("comments", "canvas"));
    expect(destroy).toHaveBeenCalledOnce();
    expect(elements.documentSidebar.hidden).toBe(true);
  });

  it("preserves a mounted panel and its draft across scroll-owner changes", () => {
    const elements = createShellRegions();
    const destroyPanel = vi.fn();
    const destroyWorkspace = vi.fn();
    const panelOwned = createMountedPanel("review", destroyPanel);
    const workspaceOwned = {
      ...createMountedPanel("review", destroyWorkspace),
      scrollOwner: "workspace"
    } satisfies ClassicEditorSidebarPanelContribution;

    renderSidebars(elements, [panelOwned], createContext("review", "canvas"));
    const original = elements.rightSidebar.firstElementChild;
    renderSidebars(elements, [workspaceOwned], createContext("review", "canvas"));

    expect(destroyPanel).not.toHaveBeenCalled();
    expect(destroyWorkspace).not.toHaveBeenCalled();
    expect(elements.rightSidebar.hidden).toBe(true);
    expect(elements.documentSidebar.hidden).toBe(false);
    expect(elements.documentSidebar.firstElementChild).toBe(original);

    elements.root.dataset.layout = "compact";
    renderSidebars(elements, [workspaceOwned], createContext("review", "canvas"));
    expect(elements.rightSidebar.firstElementChild).toBe(original);

    destroyRenderedSidebars(elements);
    expect(destroyPanel).toHaveBeenCalledOnce();
    expect(destroyWorkspace).not.toHaveBeenCalled();
  });
});

/**
 * Creates the shell-region subset required by sidebar rendering.
 *
 * @returns Stable left and right sidebar hosts.
 */
function createShellRegions(): ClassicEditorShellRegions {
  return {
    root: document.createElement("section"),
    leftSidebar: document.createElement("aside"),
    rightSidebar: document.createElement("aside"),
    documentSidebar: document.createElement("aside")
  } as ClassicEditorShellRegions;
}

/**
 * Creates the render-context facts consumed by sidebar reconciliation.
 *
 * @param activePanelId - Selected right-sidebar panel id.
 * @param backend - Active mounted backend.
 * @param closeSidebar - Observable right-panel close operation.
 * @returns Minimal Classic render context.
 */
function createContext(
  activePanelId: string | null,
  backend: "canvas" | "svg",
  closeSidebar = vi.fn()
): ClassicEditorRenderContext {
  return {
    ownerDocument: document,
    backend,
    locale: "en",
    ui: {
      closeSidebar,
      state: {
        leftSidebar: {
          visible: false,
          activePanelId: null,
          targetId: null,
          navigationRevision: 0
        },
        rightSidebar: {
          visible: true,
          activePanelId,
          targetId: null,
          navigationRevision: 0
        }
      }
    }
  } as unknown as ClassicEditorRenderContext;
}

/**
 * Creates one mounted panel fixture with observable cleanup.
 *
 * @param id - Stable panel id and visible body text.
 * @param destroy - Cleanup spy returned by the mounted lifecycle.
 * @returns Sidebar contribution fixture.
 */
function createMountedPanel(
  id: string,
  destroy: () => void
): ClassicEditorSidebarPanelContribution {
  return {
    kind: "sidebar-panel",
    id,
    side: "right",
    label: id,
    render(context) {
      const body = context.ownerDocument.createElement("p");
      body.textContent = id;
      return { element: body, destroy };
    }
  };
}
