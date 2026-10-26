import { describe, expect, it } from "vitest";
import * as Y from "yjs";
import { decodePacket, encodePacket, resolvePacket } from "./wire";

const user = { id: "a", name: "Alice", color: "#2563eb" };
describe("optional presence wire contract", () => {
  it("preserves directed positions through concurrent source changes without serializing text", () => {
    const doc = new Y.Doc(), text = doc.getText("source"); text.insert(0, "hello world");
    const packet = encodePacket(text, user, "editing", { anchor: 9, head: 3 });
    const decoded = decodePacket(JSON.parse(JSON.stringify(packet)))!;
    text.insert(0, "new ");
    expect(resolvePacket(text, "peer", decoded).selection).toEqual({ anchor: 13, head: 7 });
    doc.destroy();
  });
  it("ignores malformed or unbounded display data and unknown relative types", () => {
    expect(decodePacket({ version: 1, user: { ...user, color: "red;display:none" }, selection: null, activity: "editing" })).toBeNull();
    expect(decodePacket({ version: 1, user: { ...user, name: "x".repeat(81) }, selection: null, activity: "viewing" })).toBeNull();
    expect(decodePacket({ version: 1, user, selection: { anchor: { item: { client: -1, clock: 0 } }, head: {} }, activity: "editing" })).toBeNull();
    const doc = new Y.Doc(), other = doc.getText("other"); other.insert(0, "foreign");
    const packet = encodePacket(other, user, "editing", { anchor: 1, head: 2 });
    expect(resolvePacket(doc.getText("source"), "peer", packet).selection).toBeNull(); doc.destroy();
  });
});
