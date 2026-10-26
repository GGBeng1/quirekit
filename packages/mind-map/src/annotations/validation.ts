import { readRecord, readText } from "../model/validation";
import type { MindMapAnnotation } from "./types";

/** @param input - Untrusted object list. @param topics - Complete topic identity set. @returns Detached validated annotations. */
export function readMindMapAnnotations(input: unknown, topics: ReadonlySet<string>): readonly MindMapAnnotation[] {
  if (!Array.isArray(input) || input.length > 500) throw new TypeError("annotations: expected bounded array");
  const ids = new Set<string>(); let references = 0;
  return Object.freeze(Array.from(input, candidate => {
    const data = readRecord(candidate, ["id", "kind", "text", "color", "from", "to", "topicIds"], "annotation");
    if (typeof data.id !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u.test(data.id) || ids.has(data.id)) throw new TypeError("annotation.id: invalid or duplicate");
    ids.add(data.id);
    const text = readText(data.text, "annotation.text");
    if (text.length > 160) throw new RangeError("annotation.text: caption budget exceeded");
    if (data.color !== undefined && (typeof data.color !== "string" || !/^#[\da-f]{6}$/iu.test(data.color))) throw new TypeError("annotation.color: invalid color");
    const common = { id: data.id, text, ...(typeof data.color === "string" ? { color: data.color.toLowerCase() } : {}) };
    /** @param id - Untrusted reference. @returns Checked existing identity. */
    function topic(id: unknown): string {
      if (++references > 10000 || typeof id !== "string" || !topics.has(id)) throw new TypeError("annotation: missing topic or reference budget exceeded");
      return id;
    }
    if (data.kind === "relation") {
      if (Object.hasOwn(data, "topicIds") || data.from === data.to) throw new TypeError("annotation: invalid relation endpoints");
      return Object.freeze({ ...common, kind: "relation" as const, from: topic(data.from), to: topic(data.to) });
    }
    if (!["summary", "boundary"].includes(data.kind as string) || Object.hasOwn(data, "from") || Object.hasOwn(data, "to")
      || !Array.isArray(data.topicIds) || !data.topicIds.length || data.topicIds.length > 10000) throw new TypeError("annotation: invalid group");
    const topicIds = data.topicIds.map(topic);
    if (new Set(topicIds).size !== topicIds.length) throw new TypeError("annotation: duplicate member");
    return Object.freeze({ ...common, kind: data.kind as "summary" | "boundary", topicIds: Object.freeze(topicIds) });
  }));
}
