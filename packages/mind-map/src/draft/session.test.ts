import { describe, expect, it, vi } from "vitest";
import { createMindMapDraft } from "./session";
import { readMindMapDocument } from "../model/document";
import type { MindMapCommit } from "./types";

const original = readMindMapDocument({ version: 1, revision: 8, layout: "mind-map",
  root: { id: "root", text: "原文", collapsed: false, children: [] } });

describe("detached mind map session", () => {
  it("does not mutate source, submits exactly once and closes on success", () => {
    const draft = createMindMapDraft("block-7", original);
    draft.replace({ ...original, root: { ...original.root, text: "新稿" } });
    expect(original.root.text).toBe("原文");
    const commit = vi.fn<MindMapCommit>(() => "saved");
    expect(draft.save(commit)).toBe("saved");
    expect(commit.mock.calls[0]?.[0]).toEqual({ targetId: "block-7", expectedRevision: 8,
      document: { ...original, revision: 9, root: { ...original.root, text: "新稿" } } });
    expect(() => draft.save(commit)).toThrow();
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it.each(["conflict", "readonly", "missing"] as const)("retains draft when host returns %s", (result) => {
    const draft = createMindMapDraft("block", original);
    expect(draft.save(() => result)).toBe(result);
    expect(draft.getDocument()).toEqual(original);
    expect(draft.save(() => "saved")).toBe("saved");
  });

  it("cancel performs no host write and prevents later mutation or commit", () => {
    const draft = createMindMapDraft("block", original);
    const commit = vi.fn(() => "saved" as const);
    draft.cancel(); draft.cancel();
    expect(() => draft.save(commit)).toThrow();
    expect(() => draft.replace(original)).toThrow();
    expect(commit).not.toHaveBeenCalled();
  });

  it("rejects a changed base revision and permits retry after a throwing host", () => {
    const draft = createMindMapDraft("block", original);
    expect(() => draft.replace({ ...original, revision: 9 })).toThrow();
    expect(() => draft.save(() => { throw new Error("transaction rejected"); })).toThrow();
    expect(draft.save(() => "saved")).toBe("saved");
  });

  it("disallows reentrant commits", () => {
    const draft = createMindMapDraft("block", original);
    expect(draft.save(() => {
      expect(() => draft.save(() => "saved")).toThrow();
      expect(() => draft.replace(original)).toThrow();
      return "saved";
    })).toBe("saved");
  });

  it("rejects revision overflow before calling the host", () => {
    const draft = createMindMapDraft("block", { ...original, revision: Number.MAX_SAFE_INTEGER });
    const commit = vi.fn<MindMapCommit>(() => "saved");
    expect(() => draft.save(commit)).toThrow(/revision/);
    expect(commit).not.toHaveBeenCalled();
  });
});
