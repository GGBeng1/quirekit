import { expect, it } from "vitest";
import { keyLabel } from "./labels";
it("expands symbols without assuming a platform or rewriting custom keys", () => {
  expect(keyLabel(["⌘", "⇧", "K"])).toBe("Command + Shift + K");
  expect(keyLabel(["Ctrl", "S"])).toBe("Ctrl + S");
  expect(keyLabel(["↑"])).toBe("Arrow up");
  expect(keyLabel(["Custom"])).toBe("Custom");
});
