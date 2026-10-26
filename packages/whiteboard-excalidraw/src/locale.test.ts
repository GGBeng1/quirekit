import { expect, it } from "vitest";
import { whiteboardLanguage } from "./locale";
it("matches exact Excalidraw language codes without unsupported region tags", () => {
  expect(whiteboardLanguage("en-US")).toBe("en");
  expect(whiteboardLanguage("EN-GB")).toBe("en");
  expect(whiteboardLanguage("zh-CN")).toBe("zh-CN");
  expect(whiteboardLanguage("unknown")).toBe("zh-CN");
  expect(whiteboardLanguage()).toBe("zh-CN");
});
