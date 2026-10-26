import { xmindArray } from "../reading";
import { extras, titleFields, xmlRecord } from "./helpers";
import { legacyDetails } from "./details";
import { legacyAnnotation, legacyStyle } from "./styles";

/** @param styles - Resolved legacy styles. @returns Bounded recursive topic projector. */
export function legacyTopicReader(styles: ReadonlyMap<string, Record<string, unknown>>): (value: unknown, depth: number) => Record<string, unknown> {
  let count = 0;
  /** @param value - Source topic. @param depth - Source nesting. @returns Equivalent modern topic data. */
  function topic(value: unknown, depth: number): Record<string, unknown> {
    if (++count > 10000 || depth > 64) throw new RangeError("XMind: XML tree budget exceeded");
    const node = xmlRecord(value, "topic");
    const result: Record<string, unknown> = { ...extras(node, ["@id", "@timestamp", "@structure-class", "@branch", "@style-id", "@href", "title", "children", "position", "notes", "marker-refs", "img", "image", "boundaries", "summaries", "#text"]),
      ...titleFields(node.title, "topic.title"), ...legacyStyle(node, styles), ...legacyDetails(node),
      ...(node["@id"] === undefined ? {} : { id: node["@id"] }), ...(node["@structure-class"] === undefined ? {} : { structureClass: node["@structure-class"] }),
      ...(node["@branch"] === undefined ? {} : { branch: node["@branch"] }) };
    if (node.position !== undefined) {
      const point = xmlRecord(node.position, "topic.position");
      if (typeof point["@x"] !== "string" || !point["@x"].trim() || typeof point["@y"] !== "string" || !point["@y"].trim()) throw new TypeError("topic.position: missing coordinates");
      result.position = { ...extras(point, ["@x", "@y"]), x: Number(point["@x"]), y: Number(point["@y"]) };
    }
    if (node.children !== undefined) {
      const sourceChildren = xmlRecord(node.children, "topic.children");
      const children: Record<string, unknown> = extras(sourceChildren, ["topics", "#text"]);
      for (const group of sourceChildren.topics === undefined ? [] : xmindArray(sourceChildren.topics, "topic.children.topics")) {
        const record = xmlRecord(group, "topics"), kind = record["@type"];
        if (typeof kind !== "string" || !kind || Object.hasOwn(children, kind) || ["__proto__", "constructor", "prototype"].includes(kind)) throw new TypeError("XMind: invalid or duplicate topics group");
        children[kind] = (record.topic === undefined ? [] : xmindArray(record.topic, "topics.topic")).map(value => topic(value, depth + 1));
        const unknown = extras(record, ["@type", "topic", "#text"]); if (Object.keys(unknown).length) children[`${kind}-metadata`] = unknown;
      }
      result.children = children;
    }
    for (const [field, child] of [["boundaries", "boundary"], ["summaries", "summary"]] as const) if (node[field] !== undefined) {
      const source = xmlRecord(node[field], field);
      result[field] = (source[child] === undefined ? [] : xmindArray(source[child], child)).map(value => legacyAnnotation(value, styles));
    }
    return result;
  }
  return topic;
}
