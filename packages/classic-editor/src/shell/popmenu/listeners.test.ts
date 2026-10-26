// @vitest-environment happy-dom
import { expect, it, vi } from "vitest";
import { createClassicEditorPopmenuListeners } from "./listeners";

it("leaves menu pointer and Escape ownership to public UI while invalidating screen points", () => {
  const close = vi.fn();
  const listeners = createClassicEditorPopmenuListeners({ open: vi.fn(), close });
  const root = document.createElement("div");
  document.body.append(root);
  listeners.updateRoot(root, []);
  listeners.updateDocument(document);
  try {
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(close).not.toHaveBeenCalled();
    document.body.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("blur"));
    expect(close).toHaveBeenCalledTimes(2);
  } finally {
    listeners.destroy();
    root.remove();
  }
  document.body.dispatchEvent(new Event("scroll"));
  window.dispatchEvent(new Event("blur"));
  expect(close).toHaveBeenCalledTimes(2);
});

it("invalidates only scrolling that moves the owning client anchor", () => {
  const close = vi.fn();
  const listeners = createClassicEditorPopmenuListeners({ open: vi.fn(), close });
  const ancestor = document.createElement("section");
  const root = document.createElement("div");
  root.className = "qk-classic-editor";
  const canvasScroll = document.createElement("div");
  const nestedRoot = document.createElement("div");
  nestedRoot.className = "qk-classic-editor";
  const nestedScroll = document.createElement("div");
  nestedRoot.append(nestedScroll);
  const inlineMenu = document.createElement("div");
  inlineMenu.setAttribute("role", "menu");
  const inlineMenuScroll = document.createElement("div");
  inlineMenu.append(inlineMenuScroll);
  root.append(canvasScroll, nestedRoot, inlineMenu);
  ancestor.append(root);
  const siblingRoot = document.createElement("div");
  siblingRoot.className = "qk-classic-editor";
  const siblingScroll = document.createElement("div");
  siblingRoot.append(siblingScroll);
  const portalledMenu = document.createElement("div");
  portalledMenu.setAttribute("role", "menu");
  const unrelatedPane = document.createElement("div");
  document.body.append(ancestor, siblingRoot, portalledMenu, unrelatedPane);
  listeners.updateRoot(root, []);
  listeners.updateDocument(document);
  try {
    for (const target of [inlineMenu, inlineMenuScroll, portalledMenu, siblingRoot,
      siblingScroll, nestedRoot, nestedScroll, unrelatedPane]) {
      target.dispatchEvent(new Event("scroll"));
    }
    expect(close).not.toHaveBeenCalled();

    for (const target of [canvasScroll, root, ancestor, document.body,
      document.documentElement, document]) {
      target.dispatchEvent(new Event("scroll"));
    }
    expect(close).toHaveBeenCalledTimes(6);
    listeners.destroy();
    canvasScroll.dispatchEvent(new Event("scroll"));
    expect(close).toHaveBeenCalledTimes(6);
  } finally {
    listeners.destroy();
    ancestor.remove();
    siblingRoot.remove();
    portalledMenu.remove();
    unrelatedPane.remove();
  }
});

it("moves semantic event ownership between roots and releases listeners on destruction", () => {
  const open = vi.fn();
  const listeners = createClassicEditorPopmenuListeners({ open, close: vi.fn() });
  const first = document.createElement("div");
  const second = document.createElement("div");
  const contribution = { id: "actions", kind: "popmenu" as const, eventType: "product:actions", items: () => [] };
  listeners.updateRoot(first, [contribution, contribution]);
  const event = new CustomEvent("product:actions", { detail: { x: 20, y: 30 } });
  first.dispatchEvent(event);
  expect(open).toHaveBeenCalledExactlyOnceWith("product:actions", event);
  listeners.updateRoot(second, [contribution]);
  first.dispatchEvent(event);
  expect(open).toHaveBeenCalledTimes(1);
  second.dispatchEvent(event);
  expect(open).toHaveBeenCalledTimes(2);
  listeners.destroy();
  second.dispatchEvent(event);
  expect(open).toHaveBeenCalledTimes(2);
});
