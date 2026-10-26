import { expect, it } from "vitest";
import { railStyle } from "./rails";

it("reserves rail widths on the outline's side and after the document for comments", () => {
  const base = { blockControls: true, comments: false, toolbarHeight: 40 } as const;
  expect(railStyle({ ...base, outline: "none", outlinePosition: "end" })).toBeUndefined();
  expect(railStyle({ ...base, outline: "side", outlinePosition: "end", comments: true })).toMatchObject({
    "--md-editor-rail-start": "88px", "--md-editor-rail-end": `${24 + 304 + 264}px`, "--md-editor-comment-reserve": "304px", "--md-editor-outline-width": "240px" });
  expect(railStyle({ ...base, outline: "side", outlinePosition: "start" })).toMatchObject({ "--md-editor-rail-start": `${88 + 264}px`, "--md-editor-rail-end": "24px" });
  expect(railStyle({ ...base, outline: "toggle", outlinePosition: "end", blockControls: false })).toMatchObject({
    "--md-editor-rail-start": "24px", "--md-editor-rail-end": `${24 + 64}px`, "--md-editor-outline-width": "40px" });
});
