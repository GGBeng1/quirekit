import { additionalNeutralPalettes } from "./color/neutral-palettes";
import type { QuireKitBaseTokens } from "./types";

/** Explicit base design tokens used to compile every semantic theme. */
export const defaultBaseTokens: Readonly<QuireKitBaseTokens> = Object.freeze({
  color: Object.freeze({
    source: Object.freeze({
      cobalt: "#425be1",
      violet: "#814fb3",
      blue: "#0e6ee6",
      green: "#008847",
      amber: "#f3a21a",
      red: "#de2852",
      ink: "#20242a"
    }),
    white: "#ffffff",
    neutralLight: Object.freeze([
      "#fbfcfe",
      "#f4f6fa",
      "#f0f3f9",
      "#eaeef5",
      "#dde2ea",
      "#bdc3cc",
      "#9198a5",
      "#656e7d",
      "#485161",
      "#2b3545",
      "#121c2c"
    ] as const),
    neutralDark: Object.freeze([
      "#0d1117",
      "#121824",
      "#1a2230",
      "#202a39",
      "#283344",
      "#435167",
      "#5c6b82",
      "#8593a5",
      "#99a7b9",
      "#b5c0ce",
      "#e8edf4"
    ] as const),
    inkNeutralLight: Object.freeze([
      "#fcfcfc",
      "#f8f8f9",
      "#f2f2f4",
      "#eaeaee",
      "#dbdbe0",
      "#b9b9c1",
      "#84848d",
      "#67676f",
      "#53535b",
      "#404047",
      "#18181b"
    ] as const),
    inkNeutralDark: Object.freeze([
      "#09090b",
      "#111113",
      "#19191c",
      "#222225",
      "#2a2a2e",
      "#414149",
      "#5a5a65",
      "#8a8a93",
      "#9e9ea7",
      "#b5b5bd",
      "#f0f0f2"
    ] as const),
    neutralPalettes: additionalNeutralPalettes,
    curveLight: Object.freeze({
      // Tinted surfaces retain a hue; deep accents stop before collapsing into near-black.
      lightnessShift: Object.freeze([0.94, 0.85, 0.72, 0.52, 0.28, 0, 0.06, 0.16, 0.29, 0.36, 0.43] as const),
      chroma: Object.freeze([0.14, 0.28, 0.46, 0.65, 0.84, 1, 1, 0.92, 0.76, 0.8, 0.78] as const)
    }),
    curveDark: Object.freeze({
      // The first tinted surface sits above the neutral page and leads into the Soft states.
      lightnessShift: Object.freeze([0.55, 0.47, 0.41, 0.28, 0.14, 0, 0.06, 0.18, 0.34, 0.52, 0.72] as const),
      chroma: Object.freeze([0.16, 0.28, 0.43, 0.62, 0.81, 1, 1, 0.9, 0.85, 0.48, 0.26] as const)
    }),
    palettes: Object.freeze({
      "#f3a21a": Object.freeze({
        light: Object.freeze([
          "#fff6eb", "#ffefd9", "#ffe6c7", "#ffd39c", "#ffbb5f", "#f3a21a",
          "#e99312", "#d97c09", "#ba4e00", "#aa4200", "#963a00"
        ] as const)
      })
    }),
    sourceStep: 6,
    minimumSolidContrast: 3
  }),
  typography: Object.freeze({
    family: Object.freeze({
      product: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
      mono: '"JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, "PingFang SC", "Microsoft YaHei", monospace'
    }),
    size: Object.freeze({ 12: "12px", 13: "13px", 14: "14px", 16: "16px", 20: "20px", 28: "28px", 40: "40px" }),
    lineHeight: Object.freeze({ 12: "1.6667", 13: "1.6154", 14: "1.5714", 16: "1.5", 20: "1.4", 28: "1.2857", 40: "1.2" }),
    weight: Object.freeze({ regular: 400, medium: 500, semibold: 600 }),
    letterSpacing: Object.freeze({ normal: "normal", tight: "-0.01em" })
  }),
  spacing: Object.freeze({ 0: "0px", 2: "2px", 4: "4px", 6: "6px", 8: "8px", 12: "12px", 16: "16px", 20: "20px", 24: "24px", 32: "32px", 40: "40px", 48: "48px", 64: "64px" }),
  radius: Object.freeze({ 0: "0px", 2: "2px", 4: "4px", 6: "6px", 8: "8px", 12: "12px", 999: "999px" }),
  borderWidth: Object.freeze({ 0: "0px", 1: "1px", 2: "2px" }),
  elevation: Object.freeze({
    light: Object.freeze({
      0: "none",
      1: "0 1px 2px rgb(15 23 42 / 0.08), 0 1px 1px rgb(15 23 42 / 0.04)",
      2: "0 12px 32px rgb(15 23 42 / 0.12), 0 2px 8px rgb(15 23 42 / 0.08)",
      3: "0 24px 64px rgb(15 23 42 / 0.18), 0 8px 24px rgb(15 23 42 / 0.10)"
    }),
    dark: Object.freeze({
      0: "none",
      1: "0 2px 4px rgb(0 0 0 / 0.32), 0 0 0 1px rgb(255 255 255 / 0.06)",
      2: "0 16px 40px rgb(0 0 0 / 0.48), 0 0 0 1px rgb(255 255 255 / 0.08)",
      3: "0 28px 72px rgb(0 0 0 / 0.60), 0 0 0 1px rgb(255 255 255 / 0.10)"
    })
  }),
  motion: Object.freeze({
    duration: Object.freeze({ 0: "0ms", 120: "120ms", 180: "180ms", 240: "240ms" }),
    easing: Object.freeze({ standard: "cubic-bezier(0.2, 0, 0, 1)", accelerate: "cubic-bezier(0.4, 0, 1, 1)", decelerate: "cubic-bezier(0, 0, 0.2, 1)" })
  }),
  opacity: Object.freeze({ 0: 0, 30: 0.3, 42: 0.42, 68: 0.68, 78: 0.78, 88: 0.88, 94: 0.94, 100: 1 }),
  layer: Object.freeze({ 0: 0, 100: 100, 1000: 1000, 1100: 1100, 1200: 1200, 1300: 1300 }),
  size: Object.freeze({ 16: "16px", 20: "20px", 24: "24px", 28: "28px", 32: "32px", 36: "36px", 40: "40px", 44: "44px" })
});
