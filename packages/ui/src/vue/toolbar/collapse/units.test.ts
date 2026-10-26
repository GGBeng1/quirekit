import { expect, it } from "vitest";
import type { QuireKitToolbarEntry } from "../../../components/toolbar/types";
import { listToolbarCollapseSlots, splitToolbarCollapseSlots } from "./units";

const items: readonly QuireKitToolbarEntry[] = [
  { value: "undo", label: "撤销" },
  { value: "sep", label: "", kind: "separator" },
  { value: "format", label: "格式", kind: "group", children: [
    { value: "bold", label: "加粗" }, { value: "italic", label: "斜体" }, { value: "hidden", label: "隐藏", hidden: true }, { value: "underline", label: "下划线" }
  ] }
];

it("splits a group between the row and the panel under the same identity", () => {
  const slots = listToolbarCollapseSlots(items);
  expect(slots.map(slot => slot.key)).toEqual(["undo", "sep", "format/bold", "format/italic", "format/underline"]);
  const split = splitToolbarCollapseSlots(slots, 3);
  expect(split.visible.map(entry => entry.value)).toEqual(["undo", "sep", "format"]);
  expect(split.visible[2]?.children?.map(child => child.value)).toEqual(["bold"]);
  expect(split.collapsed.map(entry => entry.value)).toEqual(["format"]);
  expect(split.collapsed[0]?.children?.map(child => child.value)).toEqual(["italic", "underline"]);
});

it("drops a leading separator from the panel", () => {
  const split = splitToolbarCollapseSlots(listToolbarCollapseSlots(items), 1);
  expect(split.collapsed.map(entry => entry.value)).toEqual(["format"]);
});
