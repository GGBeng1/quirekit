import { createGenerator } from "@unocss/core";
import { describe, expect, it } from "vitest";
import { defineQuireKitUnoConfig } from "../preset/config";
import { toastShortcuts, toastStaticCss } from "./toast";

describe("toast recipe", () => {
  it("publishes every documented anatomy class", async () => {
    const uno = await createGenerator(defineQuireKitUnoConfig());
    const result = await uno.generate("", { preflights: true });

    expect(result.css).toContain(".qk-toast__group");
    expect(result.css).toContain(".qk-toast__close-trigger");
    expect(result.css).toContain("z-index:var(--qk-layer-toast)");
  });

  it("uses Zag placement variables and respects reduced motion", () => {
    expect(toastStaticCss).toContain("translate:var(--x) var(--y)");
    expect(toastStaticCss).toContain("opacity:var(--opacity)");
    expect(toastStaticCss).toContain("prefers-reduced-motion:reduce");
  });

  it("uses readable palette text tokens for status icons", () => {
    for (const family of ["info", "success", "warning", "danger"]) {
      expect(toastStaticCss).toContain(
        `--qk-toast-status-color:var(--qk-color-${family}-solid)`
      );
      expect(toastStaticCss).toContain(
        `--qk-toast-icon-color:var(--qk-color-${family}-text)`
      );
      expect(toastStaticCss).toContain(
        `--qk-toast-icon-surface:var(--qk-color-${family}-hover-surface)`
      );
    }
  });

  it("keeps the default icon color free for status variables", () => {
    const iconShortcut = toastShortcuts.find(([name]) => name === "qk-toast__icon");

    expect(String(iconShortcut?.[1])).not.toContain("text-qk-info-foreground");
    expect(String(iconShortcut?.[1])).toContain("--qk-toast-icon-color");
    expect(String(iconShortcut?.[1])).toContain("--qk-color-info-text");
  });

  it("publishes outline and accent appearances", async () => {
    const uno = await createGenerator(defineQuireKitUnoConfig());
    const result = await uno.generate("", { preflights: true });

    expect(result.css).toContain(".qk-toast--appearance-outline");
    expect(result.css).toContain(".qk-toast--appearance-accent");
    expect(toastStaticCss).toContain(
      ".qk-toast--appearance-outline{--qk-toast-border-color:var(--qk-color-border-subtle)"
    );
    expect(toastStaticCss).toContain(
      "--qk-toast-border-color:color-mix(in srgb,var(--qk-toast-status-color) 24%,var(--qk-color-surface-overlay))"
    );
    expect(result.css).toContain('.qk-toast--appearance-accent::before');
    expect(result.css).toContain('background-color:var(--qk-toast-status-color)');
    expect(result.css).not.toContain('--qk-toast-leading-border-width');
    expect(toastStaticCss).toContain("--qk-toast-icon-size:28px");
  });

  it("rotates the loading glyph around the SVG view box center", () => {
    expect(toastStaticCss).toContain("transform-box:view-box");
    expect(toastStaticCss).toContain("transform-origin:center");
    expect(toastStaticCss).toContain(".qk-toast__spinner>.qk-icon__svg");
  });
});
