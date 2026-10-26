import { describe, expect, it } from "vitest";
import type { ClassicEditorControlContribution } from "@classic/types";
import {
  resolveClassicEditorControlInteraction,
  showsClassicEditorControlIcon,
  showsClassicEditorControlLabel
} from "./control-presentation";

/**
 * Creates one minimal control contribution for presentation tests.
 *
 * @param presentation - Requested visible control treatment.
 * @param icon - Optional trusted icon name.
 * @returns Shared action-control fixture.
 */
function control(
  presentation: ClassicEditorControlContribution["presentation"],
  icon: string | undefined
): ClassicEditorControlContribution {
  return {
    id: "test-control",
    label: "Test control",
    behavior: { execute: () => true },
    icon,
    presentation
  };
}

describe("Classic control presentation", () => {
  it("distinguishes immediate actions from declared toggle state", () => {
    const action = control(undefined, "undo");
    expect(resolveClassicEditorControlInteraction(action)).toBe("action");
    expect(resolveClassicEditorControlInteraction({
      ...action, behavior: { execute: () => true, isActive: () => false }
    })).toBe("toggle");
    expect(resolveClassicEditorControlInteraction({
      ...action, interaction: "disclosure",
      behavior: { execute: () => true, isActive: () => true }
    })).toBe("disclosure");
  });

  it("uses the same action semantics for direct contributions", () => {
    const action = { id: "undo", label: "Undo", order: 0, run: () => true };
    const contribution = { id: "undo-control", label: "Undo", action };
    expect(resolveClassicEditorControlInteraction(contribution)).toBe("action");
    expect(resolveClassicEditorControlInteraction({
      ...contribution, action: { ...action, isActive: () => false }
    })).toBe("toggle");
    expect(resolveClassicEditorControlInteraction({
      ...contribution, interaction: "action",
      action: { ...action, isActive: () => true }
    })).toBe("action");
  });

  it("keeps icon-only controls compact", () => {
    expect(
      showsClassicEditorControlIcon(control("icon", "extension"))
    ).toBe(true);
    expect(
      showsClassicEditorControlLabel(control("icon", "extension"))
    ).toBe(false);
  });

  it("honors icon-label and label-only treatments on every command surface", () => {
    expect(
      showsClassicEditorControlIcon(control("icon-label", "extension"))
    ).toBe(true);
    expect(
      showsClassicEditorControlLabel(control("icon-label", "extension"))
    ).toBe(true);
    expect(
      showsClassicEditorControlIcon(control("label", "extension"))
    ).toBe(false);
    expect(
      showsClassicEditorControlLabel(control("label", "extension"))
    ).toBe(true);
  });

  it("shows the label when no icon is available", () => {
    expect(
      showsClassicEditorControlIcon(control(undefined, undefined))
    ).toBe(false);
    expect(
      showsClassicEditorControlLabel(control(undefined, undefined))
    ).toBe(true);
  });

  it("keeps the same presentation contract for a direct action control", () => {
    const direct: ClassicEditorControlContribution = {
      id: "direct-control",
      label: "Direct",
      action: {
        id: "format.bold",
        label: "Direct",
        order: 1,
        run: () => true
      },
      icon: "bold",
      presentation: "icon-label"
    };

    expect(showsClassicEditorControlIcon(direct)).toBe(true);
    expect(showsClassicEditorControlLabel(direct)).toBe(true);
  });
});
