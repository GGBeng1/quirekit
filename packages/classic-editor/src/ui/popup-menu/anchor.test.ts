// @vitest-environment happy-dom

import {
  describe,
  expect,
  it
} from "vitest";
import {
  projectClassicEditorPopupMenuAnchor,
  resolveClassicEditorPopupMenuOverlayHost,
  retainClassicEditorPopupMenuAnchor
} from "./anchor";

describe("Classic Editor Popup Menu anchor", () => {
  it("adopts live geometry and retains it after semantic invalidation", () => {
    const initial = { x: 0, y: 0 };
    const live = { x: 420, y: 318 };

    expect(retainClassicEditorPopupMenuAnchor(initial, live)).toBe(live);
    expect(retainClassicEditorPopupMenuAnchor(live, null)).toBe(live);
  });

  it("resolves the product document overlay and projects client geometry once", () => {
    const root = document.createElement("section");
    const overlay = document.createElement("div");
    overlay.dataset.qkClassicDocumentOverlays = "";
    root.append(overlay);
    overlay.getBoundingClientRect = () => ({
      x: 80,
      y: -240,
      top: -240,
      right: 1080,
      bottom: 1760,
      left: 80,
      width: 1000,
      height: 2000,
      toJSON: () => undefined
    });

    expect(resolveClassicEditorPopupMenuOverlayHost(root)).toBe(overlay);
    expect(projectClassicEditorPopupMenuAnchor(
      { x: 320, y: 180 },
      overlay
    )).toEqual({ x: 240, y: 420 });
  });
});
