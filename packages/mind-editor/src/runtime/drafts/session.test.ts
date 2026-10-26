import { expect, it, vi } from "vitest";
import { createMindEditorDrafts } from "./session";

it("keeps explicit patches by identity and clears only a successfully submitted generation", async () => {
  let resolve!: () => void;
  const write = vi.fn((_update: import("@quirekit/mind-map").MindMapContentUpdate) => new Promise<void>(done => { resolve = done; }));
  const drafts = createMindEditorDrafts(write, () => undefined);
  drafts.details(["a"], { note: "first" });
  const pending = drafts.flush();
  drafts.details(["a"], { note: "newer" });
  resolve(); await pending;
  expect(drafts.readDetails("a")).toEqual({ note: "newer" });
  expect(write.mock.calls[0]?.[0]).toEqual({ details: [{ ids: ["a"], patch: { note: "first" } }], annotations: [] });
});

it("retains failed batches and does no work when no drafts exist", async () => {
  const write = vi.fn(async () => { throw new Error("invalid address"); });
  const drafts = createMindEditorDrafts(write, () => undefined);
  await drafts.flush(); expect(write).not.toHaveBeenCalled();
  drafts.details(["a", "b"], { marker: "priority-1" });
  await expect(drafts.flush()).rejects.toThrow("invalid address");
  expect(drafts.readDetails("b")).toEqual({ marker: "priority-1" });
});

it("merges changed fields without overwriting other pending values", async () => {
  const write = vi.fn(async () => undefined);
  const drafts = createMindEditorDrafts(write, () => undefined);
  drafts.details(["a"], { note: "draft" }); drafts.details(["a"], { link: null });
  drafts.annotation({ id: "annotation", kind: "summary", topicIds: ["a"], text: "caption" });
  expect(drafts.readDetails("a")).toEqual({ note: "draft", link: null });
  await drafts.flush(); expect(drafts.readDetails("a")).toEqual({});
  expect(drafts.readAnnotation("annotation")).toBeUndefined();
});

it("clears committed fields independently when another field changes during publication", async () => {
  let resolve!: () => void;
  const drafts = createMindEditorDrafts(() => new Promise<void>(done => { resolve = done; }), () => undefined);
  drafts.details(["a"], { note: "committed" }); const pending = drafts.flush();
  drafts.details(["a"], { link: "https://example.com" }); resolve(); await pending;
  expect(drafts.readDetails("a")).toEqual({ link: "https://example.com" });
});
