// @vitest-environment happy-dom
import { nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createClassicEditorObjectWorkspaceFixture,
  type ClassicEditorObjectWorkspaceFixture
} from "./mount-fixture";

const fixtures: ClassicEditorObjectWorkspaceFixture[] = [];

/** @returns Mounted wide object-workspace fixture. */
function fixture(): ClassicEditorObjectWorkspaceFixture {
  const value = createClassicEditorObjectWorkspaceFixture(document, 1000);
  fixtures.push(value);
  return value;
}

/** @param button - Trigger that owns its controlled pointerdown gesture. */
function gesture(button: HTMLButtonElement): void {
  button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  button.click();
}

afterEach(() => {
  for (const value of fixtures.splice(0)) value.mounted.destroy();
  document.body.replaceChildren();
});

describe("Classic object workspace mounted controls", () => {
  it("keeps an action without an icon readable and executable instead of showing a square", async () => {
    const value = fixture();
    const first = value.contribution.actions[0]!;
    const { icon: _icon, ...action } = first.action;
    value.mounted.activate({ ...value.contribution, actions: [{ ...first, action }] });
    await nextTick();
    const button = value.root.querySelector<HTMLButtonElement>(`[data-object-action="${action.id}"]`)!;
    expect(button.textContent).toContain("操作 1");
    expect(button.querySelector('[data-icon="square"]')).toBeNull();
    gesture(button);
    await vi.waitFor(() => expect(value.root.dataset.commandCount).toBe("1"));
  });

  it("reopens a color control after apply and preserves none, current, and mixed state", async () => {
    const value = fixture();
    const first = value.contribution.actions[0]!;
    /** @param color - Current color or no fill. @param mixed - Whether values differ. */
    const activateColor = (color: string | null, mixed: boolean): void => {
      value.mounted.activate({
        ...value.contribution,
        actions: [{
          ...first,
          control: {
            kind: "color",
            id: "fixture-color",
            value: color,
            mixed
          }
        }]
      });
    };
    activateColor(null, false);
    await nextTick();

    const trigger = value.root.querySelector<HTMLButtonElement>(
      '[data-object-color-control="fixture-color"]'
    )!;
    expect(trigger.getAttribute("aria-label")).toBe("操作 1：无填充");
    gesture(trigger);
    await nextTick();
    document.body.querySelector<HTMLButtonElement>(
      '.qk-color-picker__swatch-trigger[aria-label="#3E63DD"]'
    )!.click();
    await vi.waitFor(() => expect(value.root.dataset.commandCount).toBe("1"));

    activateColor("#3E63DD", false);
    await nextTick();
    expect(trigger.getAttribute("aria-label")).toBe("操作 1：#3E63DD");
    gesture(trigger);
    await vi.waitFor(() => expect(document.body.querySelector(
      '[role="dialog"][aria-label="操作 1"]'
    )).not.toBeNull());

    activateColor(null, true);
    await nextTick();
    expect(trigger.dataset.mixed).toBe("true");
    expect(trigger.getAttribute("aria-label")).toBe("操作 1：混合值");
  });

  it("reopens one compact menu control and executes its retained direct action", async () => {
    const value = fixture();
    const first = value.contribution.actions[0]!;
    const nested = value.contribution.actions[1]!.action;
    const secondNested = value.contribution.actions[2]!.action;
    value.mounted.activate({
      ...value.contribution,
      actions: [{
        ...first,
        control: {
          kind: "menu",
          id: "fixture-menu",
          label: { "zh-CN": "边框", en: "Borders" },
          icon: "tableBorders",
          mixed: false,
          groups: [{
            id: "topology",
            items: [{ action: nested }, { action: secondNested }]
          }]
        }
      }]
    });
    await nextTick();

    const trigger = value.root.querySelector<HTMLButtonElement>(
      '[data-object-menu-control="fixture-menu"]'
    )!;
    expect(trigger.getAttribute("aria-label")).toBe("边框");
    expect(trigger.querySelector('[data-icon="chevronDown"]')).toBeNull();
    gesture(trigger);
    await vi.waitFor(() => expect(document.body.querySelector(
      '[data-object-picker="fixture-menu"]'
    )).not.toBeNull());
    expect(document.body.querySelector(
      '[data-object-picker="fixture-menu"]'
    )?.closest('.qk-classic-editor__command-popover-surface')
      ?.getAttribute("data-padding")).toBe("none");
    expect(document.body.querySelector<HTMLElement>(
      '[data-object-picker="fixture-menu"] .qk-object-picker__grid'
    )?.style.gridTemplateColumns).toBe("repeat(2, 32px)");
    const firstItem = document.body.querySelector<HTMLButtonElement>(
      `[data-object-menu-item="${nested.id}"]`
    )!;
    const secondItem = document.body.querySelector<HTMLButtonElement>(
      `[data-object-menu-item="${secondNested.id}"]`
    )!;
    await vi.waitFor(() => expect(document.activeElement).toBe(firstItem));
    firstItem.dispatchEvent(new KeyboardEvent("keydown", {
      key: "ArrowRight",
      bubbles: true
    }));
    expect(document.activeElement).toBe(secondItem);
    secondItem.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true
    }));
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger));

    gesture(trigger);
    await vi.waitFor(() => expect(document.body.querySelector(
      '[data-object-picker="fixture-menu"]'
    )).not.toBeNull());
    document.body.querySelector<HTMLButtonElement>(
      `[data-object-menu-item="${nested.id}"]`
    )!.click();
    await vi.waitFor(() => expect(value.root.dataset.commandCount).toBe("1"));
    gesture(trigger);
    await vi.waitFor(() => expect(document.body.querySelector(
      '[data-object-picker="fixture-menu"]'
    )).not.toBeNull());
  });
});
