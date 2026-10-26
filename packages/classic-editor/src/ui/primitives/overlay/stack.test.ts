import { describe, expect, it, vi } from "vitest";
import { ClassicPrimitiveOverlayStack } from ".";

describe("Classic primitive overlay stack", () => {
  it("keeps parents, replaces only a conflicting sibling branch, and isolates roots", () => {
    const stack = new ClassicPrimitiveOverlayStack();
    const firstRoot = {};
    const secondRoot = {};
    const closeParent = vi.fn();
    const closeChild = vi.fn();
    const closeSibling = vi.fn();
    const closeOtherRoot = vi.fn();

    stack.open({ id: "parent", root: firstRoot, owner: "menu", close: closeParent });
    stack.open({
      id: "child",
      root: firstRoot,
      owner: "menu",
      parentId: "parent",
      close: closeChild
    });
    stack.open({
      id: "other-root",
      root: secondRoot,
      owner: "popover",
      close: closeOtherRoot
    });
    stack.open({
      id: "sibling",
      root: firstRoot,
      owner: "popover",
      close: closeSibling
    });

    expect(closeParent).toHaveBeenCalledOnce();
    expect(closeChild).toHaveBeenCalledOnce();
    expect(closeOtherRoot).not.toHaveBeenCalled();
    expect(stack.activeIds(firstRoot)).toEqual(["sibling"]);
    expect(stack.activeIds(secondRoot)).toEqual(["other-root"]);
  });

  it("dismisses only the topmost eligible branch and preserves parent or teleported-child targets", () => {
    const stack = new ClassicPrimitiveOverlayStack();
    const root = {};
    const closeParent = vi.fn();
    const closeChild = vi.fn();
    const parentTarget = {} as EventTarget;
    const childTarget = {} as EventTarget;

    stack.open({
      id: "parent",
      root,
      owner: "menu",
      close: closeParent,
      containsTarget: (target) => target === parentTarget
    });
    stack.open({
      id: "child",
      root,
      owner: "menu",
      parentId: "parent",
      close: closeChild,
      containsTarget: (target) => target === childTarget
    });

    stack.dismissOutside(root, parentTarget);
    stack.dismissOutside(root, childTarget);
    expect(closeParent).not.toHaveBeenCalled();
    expect(closeChild).not.toHaveBeenCalled();

    stack.dismissOutside(root, {} as EventTarget);
    expect(closeChild).toHaveBeenCalledOnce();
    expect(closeParent).not.toHaveBeenCalled();
    expect(stack.activeIds(root)).toEqual(["parent"]);
  });

  it("handles Escape child-first and returns focus through the recorded policy", () => {
    const stack = new ClassicPrimitiveOverlayStack();
    const root = {};
    const parentFocus = vi.fn();
    const childFocus = vi.fn();

    stack.open({
      id: "parent",
      root,
      owner: "popover",
      close: vi.fn(),
      restoreFocus: parentFocus
    });
    stack.open({
      id: "child",
      root,
      owner: "menu",
      parentId: "parent",
      close: vi.fn(),
      restoreFocus: childFocus
    });

    stack.dismissEscape(root);
    expect(childFocus).toHaveBeenCalledOnce();
    expect(parentFocus).not.toHaveBeenCalled();
    stack.dismissEscape(root);
    expect(parentFocus).toHaveBeenCalledOnce();
  });

  it("replaces one identity exactly once before reparenting or moving roots and freezes caller facts", () => {
    const stack = new ClassicPrimitiveOverlayStack();
    const firstRoot = {};
    const secondRoot = {};
    const close = vi.fn();
    const original = new FakeIsolationTarget(false, null);
    const later = new FakeIsolationTarget(false, null);
    const registration = {
      id: "moving",
      root: firstRoot,
      owner: "menu" as const,
      close,
      modal: { isolationTargets: [original] }
    };
    stack.open(registration);
    registration.modal.isolationTargets.push(later);
    stack.open({ id: "parent", root: secondRoot, owner: "menu", close: vi.fn() });
    stack.open({
      ...registration,
      root: secondRoot,
      parentId: "parent",
      modal: { isolationTargets: [original] }
    });

    expect(close).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenLastCalledWith("replaced");
    expect(original.inert).toBe(true);
    expect(later.inert).toBe(false);
    expect(stack.activeIds(firstRoot)).toEqual([]);
    expect(stack.activeIds(secondRoot)).toEqual(["parent", "moving"]);
  });

  it("rejects empty and self-parent identities", () => {
    const stack = new ClassicPrimitiveOverlayStack();
    expect(() => stack.open({ id: "", root: {}, owner: "menu", close: vi.fn() })).toThrow();
    expect(() => stack.open({ id: "self", parentId: "self", root: {}, owner: "menu", close: vi.fn() })).toThrow();
  });
});

/** Minimal isolation target used to prove active registrations are copied. */
class FakeIsolationTarget {
  /** Current inert state. */
  inert: boolean;
  /** Current ARIA-hidden attribute. */
  private ariaHidden: string | null;
  /**
   * Creates an isolation target.
   * @param inert - Initial inert state.
   * @param ariaHidden - Initial ARIA-hidden state.
   */
  constructor(inert: boolean, ariaHidden: string | null) { this.inert = inert; this.ariaHidden = ariaHidden; }
  /**
   * Reads an attribute.
   * @param name - Attribute name.
   * @returns Value or null.
   */
  getAttribute(name: string): string | null { return name === "aria-hidden" ? this.ariaHidden : null; }
  /**
   * Writes an attribute.
   * @param name - Attribute name.
   * @param value - New value.
   * @returns Nothing.
   */
  setAttribute(name: string, value: string): void { if (name === "aria-hidden") this.ariaHidden = value; }
  /**
   * Removes an attribute.
   * @param name - Attribute name.
   * @returns Nothing.
   */
  removeAttribute(name: string): void { if (name === "aria-hidden") this.ariaHidden = null; }
}
