import {
  createEditor,
  type QuireEditor,
  type QuireExtensionViewEventContext
} from "@quirekit/core";
import type { QuireViewHost } from "@quirekit/renderer";
import type { Selection } from "@quirekit/pm";
import type {
  QuireInteractionSelectionTarget,
  QuireSelectionGeometryContext
} from "@quirekit/view-engine";
import { describe, expect, it, vi } from "vitest";
import { createMountedViewInteractionLifecycle } from "./interaction";

describe("mounted view interaction lifecycle", () => {
  it("owns interaction target, geometry, and command-routing state together", () => {
    const selection = {} as Selection;
    const target = createInteractionTarget();
    const lifecycle = createInteractionLifecycle(selection);

    expect(lifecycle.getInteractionTarget()).toBeNull();
    expect(lifecycle.getSelectionGeometryContext()).toBeUndefined();
    expect(lifecycle.getSelectionContext()).toBeUndefined();

    lifecycle.setInteractionTarget(target);

    expect(lifecycle.getInteractionTarget()).toBe(target);
    expect(lifecycle.getSelectionGeometryContext()).toEqual({
      viewRegion: target.region,
      referenceRect: target.referenceRect
    });
    expect(lifecycle.getSelectionContext()).toMatchObject({
      selection,
      selectionDomain: "text",
      commandTarget: "editable-text",
      activeRegion: target.region,
      activeReferenceRect: target.referenceRect,
      interactionTarget: target
    });

    const explicitGeometry: QuireSelectionGeometryContext = {
      referenceRect: { x: 30, y: 40, width: 50, height: 60 },
      visualContexts: []
    };
    lifecycle.setSelectionGeometryContext(explicitGeometry);
    expect(lifecycle.getSelectionGeometryContext()).toBe(explicitGeometry);

    lifecycle.setInteractionTarget(null);
    expect(lifecycle.getInteractionTarget()).toBeNull();
    expect(lifecycle.getSelectionGeometryContext()).toBeUndefined();
    expect(lifecycle.getSelectionContext()).toBeUndefined();

    lifecycle.destroy();
  });

  it("releases backend resources before foundations and only once", () => {
    const order: string[] = [];
    const lifecycle = createInteractionLifecycle({} as Selection);
    lifecycle.widgetEvents.destroy = vi.fn(() => {
      order.push("widget-runtime");
    });
    lifecycle.addCleanup(() => {
      order.push("surface");
    });
    lifecycle.addCleanup(() => {
      order.push("pointer");
    });

    lifecycle.destroy();
    lifecycle.destroy();

    expect(order).toEqual(["pointer", "surface", "widget-runtime"]);
  });

  it("owns explicit header/footer editing state per mounted lifecycle", () => {
    const first = createInteractionLifecycle({} as Selection);
    const second = createInteractionLifecycle({} as Selection);
    const headerTarget = createHeaderInteractionTarget();

    expect(first.prepareHeaderFooterPointerSelection(headerTarget, 1)).toBe("block");
    expect(first.getHeaderFooterEditingSession()).toBeNull();

    expect(first.prepareHeaderFooterPointerSelection(headerTarget, 2)).toBe("transition");
    expect(first.getHeaderFooterEditingSession()).toMatchObject({
      sourceId: "word-story:header-default",
      region: "header"
    });
    expect(second.getHeaderFooterEditingSession()).toBeNull();
    expect(first.prepareHeaderFooterPointerSelection(headerTarget, 2)).toBe("allow");

    expect(first.exitHeaderFooterEditing()).toBe(true);
    expect(first.getInteractionTarget()).toBeNull();
    expect(first.getHeaderFooterEditingSession()).toBeNull();

    first.destroy();
    second.destroy();
  });

  it("treats a scoped floating object as part of the enclosing header session", () => {
    const lifecycle = createInteractionLifecycle({} as Selection);
    const objectTarget = createHeaderScopedObjectTarget();

    expect(lifecycle.prepareHeaderFooterPointerSelection(objectTarget, 1))
      .toBe("block");
    expect(lifecycle.prepareHeaderFooterPointerSelection(objectTarget, 2))
      .toBe("transition");

    lifecycle.setInteractionTarget(objectTarget);
    expect(lifecycle.getInteractionTarget()).toBe(objectTarget);
    expect(lifecycle.prepareHeaderFooterPointerSelection(objectTarget, 1))
      .toBe("allow");

    expect(lifecycle.exitHeaderFooterEditing()).toBe(true);
    expect(lifecycle.getInteractionTarget()).toBeNull();
    lifecycle.destroy();
  });

  it("reports a body double click as an editing-domain transition", () => {
    const lifecycle = createInteractionLifecycle({} as Selection);
    const headerTarget = createHeaderInteractionTarget();

    expect(lifecycle.prepareHeaderFooterPointerSelection(headerTarget, 2))
      .toBe("transition");
    expect(lifecycle.prepareHeaderFooterPointerSelection(
      createInteractionTarget(),
      2
    )).toBe("transition");
    expect(lifecycle.getHeaderFooterEditingSession()).toBeNull();

    lifecycle.destroy();
  });

  it("routes the editing chrome exit through lifecycle cleanup", () => {
    const fixture = createInteractionLifecycleFixture({} as Selection);
    const headerTarget = createHeaderInteractionTarget();

    fixture.lifecycle.prepareHeaderFooterPointerSelection(headerTarget, 2);
    fixture.lifecycle.setInteractionTarget(headerTarget);
    const exit = fixture.overlayHost.querySelector<HTMLElement>(
      '[data-qk-header-footer-exit="header"]'
    );
    if (exit === null) {
      throw new Error("Missing header editing exit control");
    }

    exit.click();

    expect(fixture.lifecycle.getHeaderFooterEditingSession()).toBeNull();
    expect(fixture.lifecycle.getInteractionTarget()).toBeNull();
    expect(fixture.render).toHaveBeenCalledWith("selection");
    fixture.lifecycle.destroy();
  });

  it("notifies drawing creation state across arm, cancel, Escape, and teardown", () => {
    const activeChanges: boolean[] = [];
    const first = createEditableInteractionLifecycleFixture(activeChanges);

    expect(first.lifecycle.armDrawingCreation()).toBe(true);
    expect(activeChanges).toEqual([true]);
    expect(first.lifecycle.cancelDrawingCreation()).toBe(true);
    expect(activeChanges).toEqual([true, false]);

    expect(first.lifecycle.armDrawingCreation()).toBe(true);
    first.inputProxy.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true
    }));
    expect(activeChanges).toEqual([true, false, true, false]);

    expect(first.lifecycle.armDrawingCreation()).toBe(true);
    first.lifecycle.destroy();
    expect(activeChanges).toEqual([true, false, true, false, true, false]);
  });
});

/**
 * Creates a locked interaction lifecycle without constructing browser input.
 *
 * @param selection - Selection exposed by the fake editor state.
 * @returns Mounted interaction lifecycle fixture.
 */
function createInteractionLifecycle(selection: Selection) {
  return createInteractionLifecycleFixture(selection).lifecycle;
}

/**
 * Creates a locked lifecycle together with inspectable transient DOM hosts.
 *
 * @param selection - Selection exposed by the fake editor state.
 * @returns Lifecycle plus its overlay host and render observer.
 */
function createInteractionLifecycleFixture(selection: Selection) {
  // Header/footer exits remember and restore the body selection through a bookmark.
  const bookmark = { resolve: () => selection };
  const transaction = { setSelection: () => transaction, setMeta: () => transaction };
  const editor = {
    state: {
      pm: {
        selection: Object.assign(selection, { getBookmark: () => bookmark }),
        doc: {},
        tr: transaction
      }
    },
    dispatchTransaction: vi.fn()
  } as unknown as QuireEditor;
  const host: QuireViewHost = {
    id: "interaction-test",
    kind: "canvas",
    surface: {}
  };
  const overlayHost = document.createElement("div");
  const render = vi.fn();

  const lifecycle = createMountedViewInteractionLifecycle({
    host,
    eventHandlers: {},
    getWidgetContext: () => ({} as QuireExtensionViewEventContext),
    status: "lock",
    editor,
    inputProxy: {} as HTMLTextAreaElement,
    readEditable: () => false,
    root: document.createElement("div"),
    overlayHost,
    getInteractionSnapshot: () => undefined,
    render,
    onFocusChange: vi.fn()
  });

  return { lifecycle, overlayHost, render };
}

/**
 * Creates an editable lifecycle with observable drawing-creation state.
 *
 * @param activeChanges - Ordered active-state notifications to populate.
 * @returns Editable lifecycle and its keyboard input proxy.
 */
function createEditableInteractionLifecycleFixture(
  activeChanges: boolean[]
) {
  const editor = createEditor({
    content: {
      type: "doc",
      content: [{ type: "paragraph" }]
    }
  });
  const inputProxy = document.createElement("textarea");
  const lifecycle = createMountedViewInteractionLifecycle({
    host: {
      id: "drawing-creation-cursor-test",
      kind: "canvas",
      surface: {}
    },
    eventHandlers: {},
    getWidgetContext: () => ({} as QuireExtensionViewEventContext),
    status: "primary",
    editor,
    inputProxy,
    readEditable: () => true,
    root: document.createElement("div"),
    overlayHost: document.createElement("div"),
    getInteractionSnapshot: () => undefined,
    onDrawingCreationActiveChange: (active) => {
      activeChanges.push(active);
    },
    render: vi.fn(),
    onFocusChange: vi.fn()
  });

  return { lifecycle, inputProxy };
}

/**
 * Creates one retained editable-text interaction target.
 *
 * @returns Interaction target with stable region and geometry facts.
 */
function createInteractionTarget(): QuireInteractionSelectionTarget {
  return {
    domain: "text",
    commandTarget: "editable-text",
    hitKind: "position",
    region: {
      rootId: { value: "root:body" },
      regionId: { value: "region:paragraph" },
      kind: "body",
      visualInstanceId: "paragraph#page-1"
    },
    referenceRect: { x: 10, y: 20, width: 300, height: 24 }
  };
}

/**
 * Creates one retained editable header story target.
 *
 * @returns Header target with shared source and visual-instance identity.
 */
function createHeaderInteractionTarget(): QuireInteractionSelectionTarget {
  return {
    domain: "text",
    commandTarget: "editable-text",
    hitKind: "position",
    region: {
      rootId: { value: "root:header" },
      regionId: { value: "region:header" },
      kind: "header",
      visualInstanceId: "page:1:header"
    },
    source: {
      sourceId: "word-story:header-default",
      range: { from: 10, to: 20 }
    },
    referenceRect: { x: 10, y: 10, width: 300, height: 28 }
  };
}

/**
 * Creates an object target whose exact owner is nested in a header story.
 *
 * @returns Floating-object target with an explicit enclosing interaction scope.
 */
function createHeaderScopedObjectTarget(): QuireInteractionSelectionTarget {
  return {
    domain: "object",
    commandTarget: "object",
    hitKind: "object",
    region: {
      rootId: { value: "root:header-picture" },
      regionId: { value: "region:header-picture" },
      kind: "floating-object",
      visualInstanceId: "page:1:header-picture"
    },
    source: {
      sourceId: "header-picture-anchor",
      range: { from: 12, to: 13 }
    },
    referenceRect: { x: 20, y: 12, width: 120, height: 40 },
    interactionScope: {
      region: {
        rootId: { value: "root:header" },
        regionId: { value: "region:header" },
        kind: "header",
        visualInstanceId: "page:1:header"
      },
      source: {
        sourceId: "word-story:header-default",
        range: { from: 10, to: 20 }
      },
      capabilities: {
        editable: true,
        selectable: true,
        focusable: true,
        copyable: true,
        commandable: true,
        accessible: true
      }
    }
  } as unknown as QuireInteractionSelectionTarget;
}
// @vitest-environment happy-dom
