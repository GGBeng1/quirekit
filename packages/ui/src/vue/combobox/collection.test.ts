import { expect, it } from "vitest";
import { groupComboboxItems } from "./collection";

it("groups filtered candidates in the same stable order used by navigation", () => {
  const groups = groupComboboxItems([
    { value: "recent-a", label: "Recent A", group: "Recent" },
    { value: "all-a", label: "All A", group: "All" },
    { value: "recent-b", label: "Recent B", group: "Recent" }
  ]);

  expect(groups.map((group) => group.label)).toEqual(["Recent", "All"]);
  expect(groups.flatMap((group) => group.items).map((item) => item.value)).toEqual([
    "recent-a",
    "recent-b",
    "all-a"
  ]);
  expect(groupComboboxItems([{ value: "all-a", label: "All A", group: "All" }]))
    .toEqual([{ label: "All", items: [{ value: "all-a", label: "All A", group: "All" }] }]);
});
