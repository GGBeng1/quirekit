import { describe, expect, it } from "vitest";
import { QUIREKIT_DEFAULT_CANVAS_FONT } from "@quirekit/layout/text";
import { resolveDisplayListStyles } from "./styles";

describe("display-list styles", () => {
  it("uses the QuireKit fallback font for default text rendering", () => {
    expect(resolveDisplayListStyles(undefined).font).toBe(QUIREKIT_DEFAULT_CANVAS_FONT);
  });

  it("uses highlighted preedit backgrounds by default", () => {
    const styles = resolveDisplayListStyles(undefined);

    expect(styles.imePreeditBackground).toBe(true);
    expect(styles.imePreeditUnderline).toBe(true);
  });

  it("lets surface config override semantic selection and preedit styles", () => {
    const styles = resolveDisplayListStyles(
      {
        selectionFillStyle: "#ffff00",
        imePreeditBackgroundFillStyle: "#eeeeee",
        imePreeditBackground: false,
        imePreeditUnderline: false
      },
      {
        selection: {
          fillStyle: "rgba(96, 165, 250, 0.28)"
        },
        ime: {
          preeditBackgroundFillStyle: "rgba(191, 219, 254, 0.6)",
          preeditUnderline: true
        }
      }
    );

    expect(styles.selectionFillStyle).toBe("rgba(96, 165, 250, 0.28)");
    expect(styles.imePreeditBackgroundFillStyle).toBe("rgba(191, 219, 254, 0.6)");
    expect(styles.imePreeditBackground).toBe(true);
    expect(styles.imePreeditUnderline).toBe(true);
  });
});
