import { describe, expect, it, vi } from "vitest";
import { createQuireViewContextKey } from "./context-key";
import { createQuireViewScope } from "./scope";
import type { QuireViewTarget } from "./types";

interface TestContext {
  /** Runtime name used by scope tests. */
  readonly name: string;
}

const ServiceKey = createQuireViewContextKey<{ readonly open: (id: string) => void }>(
  "test.service"
);

function createTarget(): QuireViewTarget<TestContext> {
  return {
    id: "button",
    nodePath: "0",
    rect: { x: 1, y: 2, width: 3, height: 4 },
    role: "button",
    pointerEvents: "auto",
    events: {
      click: { handler: "button.open" },
      contextMenu: {
        handler: "button.menu",
        payload: { source: "context-menu" }
      }
    }
  };
}

function createParentTarget(): QuireViewTarget<TestContext> {
  return {
    id: "callout",
    nodePath: "0",
    rect: { x: 0, y: 0, width: 20, height: 20 },
    role: "callout",
    pointerEvents: "auto",
    events: {
      click: { handler: "callout.select" }
    }
  };
}

function createChildTarget(): QuireViewTarget<TestContext> {
  return {
    id: "button",
    nodePath: "0.1",
    rect: { x: 1, y: 2, width: 3, height: 4 },
    role: "button",
    pointerEvents: "auto",
    events: {
      click: { handler: "button.open" }
    }
  };
}

describe("qkView event scope", () => {
  it("dispatches named event handlers with scope-local provided values", () => {
    const open = vi.fn();
    const scope = createQuireViewScope<TestContext>({
      context: { name: "canvas" }
    });
    const target = createTarget();

    scope.provide(ServiceKey, { open });
    scope.registerEventHandler("button.open", (event) => {
      event.require(ServiceKey).open(event.target?.id ?? "");
      expect(event.context.name).toBe("canvas");
      expect(event.point).toEqual({ x: 2, y: 3 });
    });

    expect(scope.dispatchViewEvent({
      type: "click",
      target,
      point: { x: 2, y: 3 }
    })).toBe(true);
    expect(open).toHaveBeenCalledWith("button");
  });

  it("dispatches named-handler binding payloads", () => {
    const scope = createQuireViewScope<TestContext>({
      context: { name: "svg" }
    });
    const target = createTarget();
    const handler = vi.fn();

    scope.registerEventHandler("button.menu", (event) => {
      handler(event.payload);
    });

    expect(scope.dispatchViewEvent({
      type: "contextMenu",
      target
    })).toBe(true);
    expect(handler).toHaveBeenCalledWith({ source: "context-menu" });
  });

  it("dispatches direct handlers and supports default cancellation", () => {
    const scope = createQuireViewScope<TestContext>({
      context: { name: "html" }
    });
    const handler = vi.fn();

    expect(scope.dispatchViewEvent({
      type: "custom.ready",
      binding: (event) => {
        event.preventDefault();
        event.stopPropagation();
        handler(event.defaultPrevented, event.propagationStopped);
      }
    })).toBe(true);

    expect(handler).toHaveBeenCalledWith(true, true);
  });

  it("returns detailed default cancellation state without changing boolean dispatch", () => {
    const scope = createQuireViewScope<TestContext>({
      context: { name: "canvas" }
    });

    const result = scope.dispatchViewEventResult({
      type: "custom.ready",
      binding: (event) => {
        event.preventDefault();
      }
    });

    expect(result).toEqual({
      handled: true,
      defaultPrevented: true,
      pointerCaptureRequested: false
    });
    expect(scope.dispatchViewEvent({
      type: "custom.ready",
      binding: () => false
    })).toBe(false);
  });

  it("exposes the current host to direct and named handlers", () => {
    const canvasSurface = { tagName: "canvas" };
    const svgSurface = { tagName: "svg" };
    const scope = createQuireViewScope<TestContext>({
      context: { name: "canvas" },
      host: {
        kind: "canvas",
        surface: canvasSurface
      }
    });
    const target = createTarget();
    const directHandler = vi.fn();
    const namedHandler = vi.fn();

    expect(scope.getHost()?.surface).toBe(canvasSurface);

    expect(scope.dispatchViewEvent({
      type: "custom.ready",
      binding: (event) => {
        directHandler(event.host?.kind, event.host?.surface);
      }
    })).toBe(true);

    scope.setHost({
      kind: "svg",
      surface: svgSurface
    });
    scope.registerEventHandler("button.open", (event) => {
      namedHandler(event.host?.kind, event.host?.surface);
    });

    expect(scope.dispatchViewEvent({
      type: "click",
      target
    })).toBe(true);
    expect(directHandler).toHaveBeenCalledWith("canvas", canvasSurface);
    expect(namedHandler).toHaveBeenCalledWith("svg", svgSurface);
  });

  it("unregisters event handlers through the cleanup function", () => {
    const scope = createQuireViewScope<TestContext>({
      context: { name: "canvas" }
    });
    const cleanup = scope.registerEventHandler("button.open", () => true);

    expect(scope.dispatchViewEvent({
      type: "click",
      target: createTarget()
    })).toBe(true);

    cleanup();

    expect(scope.dispatchViewEvent({
      type: "click",
      target: createTarget()
    })).toBe(false);
  });

  it("dispatches target paths from deepest target to outer targets", () => {
    const parent = createParentTarget();
    const child = createChildTarget();
    const scope = createQuireViewScope<TestContext>({
      context: { name: "canvas" }
    });
    const calls: string[] = [];

    scope.registerEventHandler("button.open", (event) => {
      calls.push(`${event.currentTarget?.id ?? ""}:${event.target?.id ?? ""}`);
    });
    scope.registerEventHandler("callout.select", (event) => {
      calls.push(`${event.currentTarget?.id ?? ""}:${event.target?.id ?? ""}`);
    });

    expect(scope.dispatchViewEvent({
      type: "click",
      target: child,
      path: [child, parent]
    })).toBe(true);
    expect(calls).toEqual(["button:button", "callout:button"]);
  });

  it("stops path dispatch when a handler stops propagation", () => {
    const parent = createParentTarget();
    const child = {
      ...createChildTarget(),
      events: {
        click: (event) => {
          event.stopPropagation();
        }
      }
    } satisfies QuireViewTarget<TestContext>;
    const scope = createQuireViewScope<TestContext>({
      context: { name: "canvas" }
    });
    const parentHandler = vi.fn();

    scope.registerEventHandler("callout.select", parentHandler);

    expect(scope.dispatchViewEvent({
      type: "click",
      target: child,
      path: [child, parent]
    })).toBe(true);
    expect(parentHandler).not.toHaveBeenCalled();
  });
});
