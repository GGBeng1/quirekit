// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createClassicEditorObjectWorkspaceFixture,
  type ClassicEditorObjectWorkspaceFixture
} from "./mount-fixture";

const fixtures: ClassicEditorObjectWorkspaceFixture[] = [];

/** @param width - Root-local layout width. @returns One isolated live object workspace. */
function fixture(width: number): ClassicEditorObjectWorkspaceFixture {
  const value = createClassicEditorObjectWorkspaceFixture(document, width);
  fixtures.push(value);
  return value;
}

afterEach(() => {
  for (const value of fixtures.splice(0)) value.mounted.destroy();
  document.body.replaceChildren();
});

describe("public object workspace overlay ownership", () => {
  it("keeps an unhandled desktop menu request open and accepts async execution once", async () => {
    const value = fixture(1000);
    await vi.waitFor(() => expect(value.root.querySelector("[data-object-more-trigger]")).not.toBeNull());
    const trigger = value.root.querySelector<HTMLButtonElement>("[data-object-more-trigger]")!;
    const action = value.mounted.controller.projectActions("wide").overflow[0]!.action;
    let resolve: (handled: boolean) => void = () => undefined;
    const execute = vi.spyOn(value.mounted.controller, "execute")
      .mockImplementationOnce(() => new Promise<boolean>(complete => { resolve = complete; }))
      .mockResolvedValue(true);
    trigger.click();
    const selector = `[data-object-more-layout] [data-object-action="${action.id}"]`;
    await vi.waitFor(() => expect(value.root.querySelector(selector)).not.toBeNull());
    const item = value.root.querySelector<HTMLElement>(selector)!;
    await vi.waitFor(() => expect(value.root.querySelector('[role="menu"], [role="dialog"]')?.contains(document.activeElement)).toBe(true));
    // Test the adapter at the public Menu selection boundary; real pointer and
    // Arrow/Enter behavior is covered by the product browser fixture.
    item.dispatchEvent(new CustomEvent("menu:select", { bubbles: true }));
    item.dispatchEvent(new CustomEvent("menu:select", { bubbles: true }));
    await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
    expect(execute).toHaveBeenCalledWith(action, "menu");
    resolve(false);
    await vi.waitFor(() => expect(item.matches(":disabled") || item.hasAttribute("data-disabled")).toBe(false));
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    item.dispatchEvent(new CustomEvent("menu:select", { bubbles: true }));
    await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("false"));
  });

  it("projects a disabled mixed toggle and shortcut through the public menu row", async () => {
    const value = fixture(1000);
    const original = value.contribution.actions[0]!;
    value.mounted.activate({
      ...value.contribution,
      actions: [{
        ...original,
        prominence: "overflow",
        action: { ...original.action, isActive: () => true, canExecute: () => false, shortcut: "Ctrl+B" },
        presentation: () => ({ mixed: true })
      }]
    });
    await vi.waitFor(() => expect(value.root.querySelector("[data-object-more-trigger]")).not.toBeNull());
    value.root.querySelector<HTMLButtonElement>("[data-object-more-trigger]")!.click();
    await vi.waitFor(() => expect(value.root.querySelector('[role="menuitemcheckbox"]')).not.toBeNull());
    const item = value.root.querySelector<HTMLElement>('[role="menuitemcheckbox"]')!;
    expect(item.getAttribute("aria-checked")).toBe("mixed");
    expect(item.getAttribute("aria-disabled")).toBe("true");
    expect(item.textContent).toContain("Ctrl+B");
    expect(item.dataset.mixed).toBe("true");
    expect(item.querySelector('[data-part="item-indicator"]')?.hasAttribute("hidden")).toBe(true);
  });
});
