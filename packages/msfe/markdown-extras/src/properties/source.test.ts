import { describe, expect, it } from "vitest";
import { readDocumentProperties } from "./read";
import { planDocumentProperty } from "./write";
import type { DocumentPropertyChange } from "./types";

/** @param source - Exact Markdown. @param change - One explicit property intent. @returns Applied source or rejection. */
function edit(source: string, change: DocumentPropertyChange): string | null {
  const data = readDocumentProperties(source)!;
  const changes = planDocumentProperty(source, data, change);
  if (!changes) return null;
  let result = source;
  for (const change of [...changes].reverse()) result = result.slice(0, change.from) + (change.insert ?? "") + result.slice(change.to ?? change.from);
  return result;
}

describe("optional YAML properties source contract", () => {
  it("decodes quoted punctuation and preserves scalar types without flattening nested values", () => {
    const source = '---\ntitle: "A, B: 中文"\ntags: ["a,b", "c:d", "😀"]\ncount: 12\nready: false\nempty: null\nnested:\n  child: value\n---\n\nbody';
    const data = readDocumentProperties(source)!;
    expect(data.entries.map(entry => entry.value)).toEqual(["A, B: 中文", ["a,b", "c:d", "😀"], 12, false, null, undefined]);
    expect(data.entries.at(-1)!.editable).toBe(false);
    expect(data.source).toBe(source.slice(0, source.indexOf('\n---', 4) + 4));
  });
  it("patches only the selected value, preserving comments, other properties and body byte-for-byte", () => {
    const source = '---\n# title note\ntitle: old # trailing\n\nunknown:\n  nested: true\n---\n\n\nBody\n';
    expect(edit(source, { type: "set", key: "title", value: "new: # text" })).toBe(source.replace('old #', '"new: # text" #'));
    expect(edit(source, { type: "rename", key: "title", name: "new name" })).toBe(source.replace('title:', '"new name":'));
    expect(edit(source, { type: "set", key: "unknown", value: "no" })).toBeNull();
  });
  it("keeps CRLF, quoted booleans, flow and block lists and empty values writable", () => {
    const source = '\uFEFF---\r\ntitle:\r\nlist:\r\n  - "a,b"\r\n  - c\r\n---\r\nbody';
    expect(edit(source, { type: "set", key: "title", value: "true" })).toBe(source.replace('title:\r', 'title: "true"\r'));
    expect(readDocumentProperties(edit(source, { type: "set", key: "list", value: ["x,y", "z"] })!)!.entries[1]!.value).toEqual(["x,y", "z"]);
  });
  it("adds unique keys and removes simple entries without deleting comments or the header", () => {
    const source = '---\n# keep\ntitle: old # keep too\n\n---\nbody';
    expect(edit(source, { type: "add", key: "tags", value: ["new"] })).toBe(source.replace('\n---\nbody', '\n"tags": ["new"]\n---\nbody'));
    const removed = edit(source, { type: "remove", key: "title" })!;
    expect(removed).toContain('# keep\n'); expect(removed).toContain('# keep too'); expect(removed.endsWith('---\nbody')).toBe(true);
    expect(readDocumentProperties(removed)!.entries).toHaveLength(0);
    expect(edit(source, { type: "add", key: "title", value: "duplicate" })).toBeNull();
  });
  it("rejects stale source and protects internal list comments", () => {
    const source = '---\ntags:\n  - first # note\n  - second\n---\nbody';
    const data = readDocumentProperties(source)!;
    expect(data.entries[0]!.editable).toBe(false);
    expect(planDocumentProperty(source.replace('first', 'changed'), data, { type: "set", key: "tags", value: [] })).toBeNull();
  });
  it("preserves the string identity of newly added YAML keyword names", () => {
    const source = '---\ntitle: original\n---\nbody';
    for (const key of ['true', 'null', 'false']) {
      const next = edit(source, { type: "add", key, value: "value" })!;
      expect(readDocumentProperties(next)?.entries.map(entry => entry.key)).toEqual(['title', key]);
    }
  });
  for (const source of ['---\ntitle: a\ntitle: b\n---', '---\nx: [invalid\n---', '---\n- a\n---',
    '---\n{title: old, status: draft}\n---', '---\n  title: old\n---', '---\n? title\n: old\n---', '---\n"multi\nline": old\n---',
    '+++\ntitle = "toml"\n+++', 'text\n---\ntitle: later\n---', '---\ntitle: unclosed',
    '---\nx: &anchor value\ny: *anchor\n---', '---\nx: !!str value\n---', '---\nx: ' + 'a'.repeat(20_001) + '\n---']) {
    it(`retains unsupported or ambiguous source (${source.slice(0, 30)})`, () => { expect(readDocumentProperties(source)).toBeNull(); });
  }
});
