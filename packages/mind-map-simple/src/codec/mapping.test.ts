import { expect, it } from "vitest";
import { readMindMapDocument, moveMindMapTopic, formatMindMapTopics } from "@quirekit/mind-map";
import { fromSimpleTree, toSimpleTree } from "./mapping";

const source = readMindMapDocument({ version: 1, revision: 2, layout: "logical-left",
  root: { id: "r", text: "日程😀\n<script>", collapsed: false, children: [
    { id: "a", text: "分支", side: "left", collapsed: true, children: [
      { id: "b", text: "隐藏", collapsed: false, children: [] },
    ] },
  ] } });

it("round-trips independent collapsed trees and retains the original v1 undo state", () => {
  const free = moveMindMapTopic(source, "a", { x: 0, y: -120 }, "left");
  expect(fromSimpleTree(toSimpleTree(free), source)).toEqual(free);
  expect(fromSimpleTree(toSimpleTree(source), free)).toEqual(source);
});

it("round-trips ids, order, Unicode, direction and collapsed descendants", () => {
  const vendor = toSimpleTree(source);
  expect(fromSimpleTree(vendor, source)).toEqual(source);
  vendor.data.text = "修改";
  expect(source.root.text).toBe("日程😀\n<script>");
});

it("reads layout from each history entry and rejects misplaced or unsupported layouts", () => {
  const vendor = toSimpleTree({ ...source, layout: "logical-right" });
  expect(fromSimpleTree(vendor, source).layout).toBe("logical-right");
  Object.assign(vendor.children[0]!.data, { _quirekitLayout: "mind-map" });
  expect(() => fromSimpleTree(vendor, source)).toThrow(/metadata/);
  delete vendor.children[0]!.data._quirekitLayout;
  Object.assign(vendor.data, { _quirekitLayout: "timeline" });
  expect(() => fromSimpleTree(vendor, source)).toThrow(/layout/);
});

it.each(["attachmentUrl", "generalization", "outerFrame", "associativeLineTargets"])("rejects unsupported %s", (key) => {
  const vendor = toSimpleTree(source);
  Object.assign(vendor.data, { [key]: "unsupported" });
  expect(() => fromSimpleTree(vendor, source)).toThrow(/Unsupported/);
});

it("round-trips every style field and rejects invalid vendor styles or styles in old carriers", () => {
  const styled = formatMindMapTopics(source, ["r", "a"], { bold: false, fontSize: 22, color: "#112233", fill: "transparent",
    borderColor: "#556677", borderWidth: 3, shape: "rounded", lineColor: "#778899", lineWidth: 2, linePattern: "dashed", lineStyle: "elbow" });
  const tree = toSimpleTree(styled);
  expect(fromSimpleTree(tree, source)).toEqual(styled);
  Object.assign(tree.data, { fontSize: "broken" });
  expect(() => fromSimpleTree(tree, source)).toThrow(/style/);
  const old = toSimpleTree(source); Object.assign(old.data, { fontSize: 18 });
  expect(() => fromSimpleTree(old, source)).toThrow(/style/);
});

it("tolerates known transient selection metadata but rejects rich text", () => {
  const vendor = toSimpleTree(source);
  Object.assign(vendor, { smmVersion: "0.14.0-fix.3" });
  Object.assign(vendor.data, { isActive: true });
  expect(fromSimpleTree(vendor, source)).toEqual(source);
  Object.assign(vendor.data, { richText: true });
  expect(() => fromSimpleTree(vendor, source)).toThrow(/Rich text/);
});
