// @vitest-environment happy-dom
import { expect, it } from "vitest";
import { guardWhiteboardLeave } from "./leave";

it("warns before navigation and releases independently for each workspace", () => {
  const releaseFirst = guardWhiteboardLeave(window), releaseSecond = guardWhiteboardLeave(window);
  expect(window.dispatchEvent(new Event("beforeunload", { cancelable: true }))).toBe(false);
  releaseFirst(); releaseFirst();
  expect(window.dispatchEvent(new Event("beforeunload", { cancelable: true }))).toBe(false);
  releaseSecond();
  expect(window.dispatchEvent(new Event("beforeunload", { cancelable: true }))).toBe(true);
});
