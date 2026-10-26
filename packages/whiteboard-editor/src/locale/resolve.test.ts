import { expect, it } from "vitest";
import { readWhiteboardScene, WhiteboardError } from "@quirekit/whiteboard";
import { whiteboardErrorMessage, whiteboardMessages } from "./resolve";
import { en } from "./en";
import { zhCN } from "./zh-cn";

it("covers every message, regional English tags and the Chinese default without mixed-language copy", () => {
  expect(Object.keys(en).sort()).toEqual(Object.keys(zhCN).sort());
  expect(Object.values(en).every(value => value.length > 0 && !/\p{Script=Han}/u.test(value))).toBe(true);
  expect(whiteboardMessages("en-GB")).toBe(en);
  expect(whiteboardMessages("EN-US")).toBe(en);
  expect(whiteboardMessages("zh-CN")).toBe(zhCN);
  expect(whiteboardMessages("unknown")).toBe(zhCN);
});
it("localizes structured validation errors without rewriting the original diagnostic", () => {
  let error: unknown;
  try { readWhiteboardScene({}); } catch (reason) { error = reason; }
  expect(error).toBeInstanceOf(WhiteboardError);
  expect(whiteboardErrorMessage(error, "en")).toBe("Unsupported Excalidraw file format.");
  expect(whiteboardErrorMessage(error, "zh-CN")).toBe("不支持的 Excalidraw 文件格式");
  expect((error as Error).message).toBe("不支持的 Excalidraw 文件格式");
  expect(whiteboardErrorMessage(new SyntaxError("OS-dependent text"), "en")).toContain("valid JSON");
  expect(whiteboardErrorMessage(new DOMException("disk full", "QuotaExceededError"), "en")).toContain("storage is full");
  expect(whiteboardErrorMessage(new Error("未知失败"), "en")).not.toMatch(/\p{Script=Han}/u);
});
