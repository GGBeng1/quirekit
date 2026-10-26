// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";
import { readQuireTransactionRenderImpact } from "@quirekit/core";
import { getProofingController } from "./session/registry";
import { getProofingIssueAt, getProofingIssues, getProofingSnapshot, proofingPluginKey } from "./plugin/state";
import {
  createFakeProvider,
  createProofingEditor,
  paragraph,
  readFlagged,
  settle,
  text
} from "./test-support";

describe("Proofing", () => {
  it("reports background batches as presentation-only without changing selection or history", async () => {
    const editor = createProofingEditor([paragraph(text("teh"))], { provider: createFakeProvider(["teh"]) });
    const batches: unknown[] = [];
    const doc = editor.state.pm.doc;
    const selection = editor.state.pm.selection.toJSON();
    editor.on("transaction", ({ transaction }) => {
      batches.push(transaction.getMeta(proofingPluginKey));
      expect(transaction.docChanged).toBe(false);
      expect(transaction.selectionSet).toBe(false);
      expect(transaction.getMeta("addToHistory")).toBe(false);
      expect(readQuireTransactionRenderImpact(transaction)).toEqual({ kind: "presentation-only" });
    });
    await settle();
    expect(batches.length).toBeGreaterThan(0);
    expect(batches.every(Array.isArray)).toBe(true);
    expect(readFlagged(editor)).toEqual(["teh"]);
    expect(editor.state.pm.doc).toBe(doc);
    expect(editor.state.pm.selection.toJSON()).toEqual(selection);
    expect(editor.can().undo()).toBe(false);
    editor.destroy();
  });

  it("flags misspellings across marks and paints wavy underlines", async () => {
    const provider = createFakeProvider(["teh", "wrold"]);
    const editor = createProofingEditor([paragraph(text("teh "), text("wrold", ["bold"]), text(" fine"))], { provider });
    await settle();

    expect(readFlagged(editor)).toEqual(["teh", "wrold"]);
    const painted = proofingPluginKey.getState(editor.state.pm)!.presentation.find();
    expect(painted).toHaveLength(2);
    expect(String((painted[0] as unknown as { type: { attrs: { style: string } } }).type.attrs.style)).toContain("wavy");
    expect(getProofingSnapshot(editor.state.pm)).toMatchObject({ status: "idle", issueCount: 2 });
  });

  it("keeps every underline in place after an edit earlier in the document", async () => {
    const provider = createFakeProvider(["teh"]);
    const editor = createProofingEditor([paragraph(text("first")), paragraph(text("teh end")), paragraph(text("teh"))], { provider });
    await settle();
    editor.commands.insertContentAt(1, "very ");

    expect(readFlagged(editor)).toEqual(["teh", "teh"]);
    await settle();
    expect(readFlagged(editor)).toEqual(["teh", "teh"]);
  });

  it("rechecks only the edited textblock", async () => {
    const provider = createFakeProvider(["teh"]);
    const editor = createProofingEditor([paragraph(text("one")), paragraph(text("two teh"))], { provider });
    await settle();
    provider.requests.length = 0;
    editor.commands.insertContentAt(4, " teh");
    await settle();

    expect(provider.requests.flatMap((request) => request.segments.map((segment) => segment.text))).toEqual(["one teh"]);
    expect(readFlagged(editor)).toEqual(["teh", "teh"]);
  });

  it("drops an answer for a block edited while the request was pending", async () => {
    const pending: Array<() => void> = [];
    const provider = createFakeProvider(["teh"], (_request, issues) => new Promise((resolve) => {
      pending.push(() => resolve({ issues }));
    }));
    const editor = createProofingEditor([paragraph(text("teh"))], { provider });
    await settle();
    editor.commands.insertContentAt(4, "x");
    pending.shift()?.();
    await settle();

    expect(readFlagged(editor)).toEqual([]);
    pending.forEach((resolve) => resolve());
    await settle();
    expect(getProofingIssues(editor.state.pm)).toEqual([]);
  });

  it("releases a hung request after the timeout and reports it once", async () => {
    const onError = vi.fn();
    const provider = createFakeProvider([], () => new Promise(() => undefined));
    const editor = createProofingEditor([paragraph(text("teh"))], { provider, timeoutMs: 5, onError });
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 20));
    await settle();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]![0]).toMatchObject({ kind: "timeout" });
    expect(proofingPluginKey.getState(editor.state.pm)!.inflight).toEqual([]);
    expect(getProofingSnapshot(editor.state.pm).status).toBe("degraded");
  });

  it("rejects findings outside their segment and reports them once per request", async () => {
    const onError = vi.fn();
    const provider = createFakeProvider(["teh"], async (request, issues) => ({
      issues: [...issues, { segmentId: request.segments[0]!.id, start: 2, end: 99, kind: "spelling" }, { segmentId: "nope", start: 0, end: 1, kind: "spelling" }]
    }));
    const editor = createProofingEditor([paragraph(text("teh"))], { provider, onError });
    await settle();

    expect(readFlagged(editor)).toEqual(["teh"]);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]![0]).toMatchObject({ kind: "validation-error" });
  });

  it("hides the word being typed until the caret leaves, but not a finding the caret merely enters", async () => {
    const editor = createProofingEditor([paragraph(text("and "))], { provider: createFakeProvider(["teh"]) });
    await settle();
    editor.chain().setTextSelection(5).insertContent("teh").run();
    await settle();
    const painted = () => proofingPluginKey.getState(editor.state.pm)!.presentation.find().length;
    expect(readFlagged(editor)).toEqual(["teh"]);
    expect(painted()).toBe(0);
    expect(getProofingIssueAt(editor.state.pm, 8)?.text).toBe("teh");

    editor.commands.setTextSelection(1);
    expect(painted()).toBe(1);
    editor.commands.setTextSelection(6);
    expect(painted()).toBe(1);
  });

  it("maps offsets after characters outside the basic multilingual plane", async () => {
    const editor = createProofingEditor([paragraph(text("😀 teh"))], { provider: createFakeProvider(["teh"]) });
    await settle();

    expect(readFlagged(editor)).toEqual(["teh"]);
  });

  it("replaces only differing letters as one undo step and keeps their formatting", async () => {
    const editor = createProofingEditor([paragraph(text("t", ["bold"]), text("eh"))], { provider: createFakeProvider(["teh"]) });
    await settle();
    const issue = getProofingIssues(editor.state.pm)[0]!;

    expect(editor.commands.replaceProofingIssue(issue.id, "the")).toBe(true);
    expect(editor.state.pm.doc.textContent).toBe("the");
    expect(editor.state.pm.doc.firstChild!.firstChild!.marks.map((mark) => mark.type.name)).toEqual(["bold"]);
    editor.commands.undo();
    expect(editor.state.pm.doc.textContent).toBe("teh");
  });

  it("refuses a replacement when the finding no longer exists", async () => {
    const editor = createProofingEditor([paragraph(text("teh"))], { provider: createFakeProvider(["teh"]) });
    await settle();
    const issue = getProofingIssues(editor.state.pm)[0]!;
    editor.commands.insertContentAt(2, "x");

    expect(editor.commands.replaceProofingIssue(issue.id, "the")).toBe(false);
  });

  it("keeps a one-off ignore through edits elsewhere and suppresses ignored words", async () => {
    const add = vi.fn();
    const provider = createFakeProvider(["teh", "wrold"]);
    const editor = createProofingEditor([paragraph(text("teh wrold teh"))], {
      provider,
      dictionaryStore: { list: () => [], add, remove: () => undefined }
    });
    await settle();
    editor.commands.ignoreProofingIssue(getProofingIssues(editor.state.pm)[0]!.id);
    editor.commands.insertContentAt(14, " end");
    await settle();
    expect(readFlagged(editor)).toEqual(["wrold", "teh"]);

    editor.commands.addProofingWord("Wrold");
    await settle();
    expect(readFlagged(editor)).toEqual(["teh"]);
    expect(add).toHaveBeenCalledWith("Wrold");
  });

  it("requests suggestions lazily and caches them", async () => {
    const suggest = vi.fn(async () => ["teh-fixed"]);
    const provider = { ...createFakeProvider(["teh"]), suggest };
    const editor = createProofingEditor([paragraph(text("teh"))], { provider });
    await settle();
    const controller = getProofingController(editor)!;
    const issue = getProofingIssues(editor.state.pm)[0]!;

    expect(await controller.suggest(issue)).toEqual(["teh-fixed"]);
    expect(await controller.suggest(issue)).toEqual(["teh-fixed"]);
    expect(suggest).toHaveBeenCalledTimes(1);
  });

  it("dispatches no transactions of its own while the user keeps typing", async () => {
    const editor = createProofingEditor([paragraph(text("start"))], { provider: createFakeProvider(["teh"]), debounceMs: 400, maxWaitMs: 2000 });
    await settle();
    const transactions: boolean[] = [];
    editor.on("transaction", ({ transaction }) => transactions.push(transaction.docChanged));
    for (const character of "typing teh") editor.commands.insertContentAt(editor.state.pm.doc.content.size - 1, character);
    await settle(2);

    expect(transactions).toHaveLength(10);
    expect(transactions.every(Boolean)).toBe(true);
    expect(getProofingSnapshot(editor.state.pm).status).toBe("checking");
  });

  it("holds results that arrive while the user types and applies them together afterwards", async () => {
    const pending: Array<() => void> = [];
    const provider = createFakeProvider(["teh"], (_request, issues) => new Promise((resolve) => {
      pending.push(() => resolve({ issues }));
    }));
    const editor = createProofingEditor([paragraph(text("teh")), paragraph(text("more"))], { provider, debounceMs: 60, maxWaitMs: 1000 });
    await settle();
    const transactions: boolean[] = [];
    editor.on("transaction", ({ transaction }) => transactions.push(transaction.docChanged));
    editor.commands.insertContentAt(editor.state.pm.doc.content.size - 1, "x");
    pending.splice(0).forEach((resolve) => resolve());
    await settle(2);

    expect(transactions).toEqual([true]);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await settle();
    expect(transactions.slice(0, 2)).toEqual([true, false]);
    expect(readFlagged(editor)).toEqual(["teh"]);
  });

  it("clears findings when switched off and checks again when switched on", async () => {
    const editor = createProofingEditor([paragraph(text("teh"))], { provider: createFakeProvider(["teh"]) });
    await settle();
    editor.commands.setProofingEnabled(false);
    expect(getProofingSnapshot(editor.state.pm)).toMatchObject({ enabled: false, status: "disabled", issueCount: 0 });

    editor.commands.setProofingEnabled(true);
    await settle();
    expect(readFlagged(editor)).toEqual(["teh"]);
  });
});
