import { describe, expect, it, vi } from "vitest";
import { createFlowchart, createFlowchartDraft, createFlowchartNode } from "../index";

describe("host-owned flowchart commit", () => {
  it("commits exactly one detached replacement and closes only on success", () => {
    const host = createFlowchart(), draft = createFlowchartDraft("target", host);
    draft.replace({ ...host, nodes: [createFlowchartNode("a", "process", { x: 0, y: 0 }, "编辑")] });
    const commit = vi.fn(() => "saved" as const);
    expect(draft.save(commit)).toBe("saved");
    expect(commit).toHaveBeenCalledExactlyOnceWith({ targetId: "target", expectedRevision: 0, document: expect.objectContaining({ revision: 1 }) });
    expect(host.nodes).toHaveLength(0); expect(() => draft.getDocument()).toThrow();
  });
  it.each(["conflict", "readonly", "missing"] as const)("retains edits after %s", result => {
    const draft = createFlowchartDraft("target", createFlowchart());
    expect(draft.save(() => result)).toBe(result);
    expect(draft.getDocument().revision).toBe(0);
    expect(draft.save(() => "saved")).toBe("saved");
  });
  it("prevents reentrant and asynchronous commits", () => {
    const draft = createFlowchartDraft("target", createFlowchart());
    expect(() => draft.save(() => { draft.cancel(); return "saved"; })).toThrow();
    // Runtime callers without TypeScript must still keep commit atomic.
    expect(() => draft.save((() => Promise.resolve("saved")) as never)).toThrow(/synchronous/);
    expect(draft.getDocument().revision).toBe(0);
  });
  it("rejects changing the base and cancels without any host write", () => {
    const draft = createFlowchartDraft("target", createFlowchart());
    expect(() => draft.replace({ ...createFlowchart(), revision: 2 })).toThrow();
    draft.cancel(); draft.cancel(); expect(() => draft.getDocument()).toThrow();
  });
});
