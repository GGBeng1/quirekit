import { describe, expect, it } from "vitest";
import { activityEventSchema, assertPendingEvent, contentHash, isSystemKind, kindMatches, validatePendingEvent } from "..";

const valid = { documentId: "d", epoch: "e", operationId: "o", actor: { id: "u", trust: "local" }, source: "human", kind: "md.insert.highlight", kindVersion: 1, facts: {} };

describe("activity protocol", () => {
  it("accepts minimal events and reports each invalid field", () => {
    expect(validatePendingEvent(valid)).toEqual([]);
    const problems = validatePendingEvent({ ...valid, epoch: "", actor: { id: "u", trust: "maybe" }, kind: "Insert", kindVersion: 0, facts: [], content: { format: "markdown" } });
    expect(problems).toHaveLength(6);
    expect(() => assertPendingEvent(null)).toThrow(TypeError);
  });
  it("keeps the JSON Schema required fields aligned with the validator", () => {
    for (const field of ["documentId", "epoch", "operationId", "actor", "source", "kind", "kindVersion", "facts"]) {
      expect(activityEventSchema.required).toContain(field);
      const { [field as keyof typeof valid]: _omitted, ...rest } = valid;
      expect(validatePendingEvent(rest).length).toBeGreaterThan(0);
    }
  });
  it("matches kind namespaces and system kinds", () => {
    expect(kindMatches("comment.add", "comment")).toBe(true);
    expect(kindMatches("commentary", "comment")).toBe(false);
    expect(isSystemKind("session.join")).toBe(true);
    expect(isSystemKind("text.edit")).toBe(false);
  });
  it("hashes UTF-8 content deterministically", () => {
    expect(contentHash("高亮")).toBe(contentHash("高亮"));
    expect(contentHash("a")).not.toBe(contentHash("b"));
    expect(contentHash("")).toBe("fnv1a64:cbf29ce484222325");
  });
});
