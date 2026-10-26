import { expect, it, vi } from "vitest";
import type { SimpleInstance } from "./types";
import { bindSimpleSelectionProjection } from "./selection";

it("projects only selection flags and forwards every persistent or mixed command unchanged", () => {
  const execCommand = vi.fn(), instance = { execCommand } as unknown as SimpleInstance;
  const node = { nodeData: { data: { isActive: false } } }, dispose = bindSimpleSelectionProjection(instance);
  instance.execCommand("SET_NODE_DATA", node, { isActive: true });
  expect(node.nodeData.data.isActive).toBe(true); expect(execCommand).not.toHaveBeenCalled();
  const patch = { isActive: false, text: "persistent" };
  instance.execCommand("SET_NODE_DATA", node, patch); instance.execCommand("SET_NODE_TEXT", node, "text");
  expect(execCommand.mock.calls).toEqual([["SET_NODE_DATA", node, patch], ["SET_NODE_TEXT", node, "text"]]);
  dispose(); dispose(); expect(instance.execCommand).toBe(execCommand);
});
