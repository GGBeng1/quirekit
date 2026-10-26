import { describe, expect, it } from "vitest";
import { resolveClassicMobileVisualFrame } from "./viewport";

describe("compact visual viewport frame", () => {
  it("offsets by the pan when client rects follow the layout viewport", () => {
    // Chromium: a 120px keyboard pan leaves the host in place and reports offsetTop 120.
    expect(resolveClassicMobileVisualFrame({ top: 0, bottom: 800 }, { pageTop: 120, height: 450, documentTop: 0 }))
      .toEqual({ offset: 120, height: 450 });
  });

  it("offsets by the pan once when client rects follow the visual viewport", () => {
    // WebKit: the same pan already moves the host to -120 in client coordinates.
    expect(resolveClassicMobileVisualFrame({ top: -120, bottom: 680 }, { pageTop: 120, height: 450, documentTop: -120 }))
      .toEqual({ offset: 120, height: 450 });
  });

  it("keeps a host that starts below the visible top in place", () => {
    expect(resolveClassicMobileVisualFrame({ top: 100, bottom: 900 }, { pageTop: 0, height: 600, documentTop: 0 }))
      .toEqual({ offset: 0, height: 500 });
  });

  it("follows the visible part of a host scrolled partly out of view", () => {
    expect(resolveClassicMobileVisualFrame({ top: -50, bottom: 750 }, { pageTop: 50, height: 600, documentTop: -50 }))
      .toEqual({ offset: 50, height: 600 });
  });
});
