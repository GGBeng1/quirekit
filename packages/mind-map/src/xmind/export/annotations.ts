import type { MindMapAnnotation } from "../../annotations/types";
import { reportXmind } from "../reading";
import type { XmindExportContext, XmindExportTopic } from "./types";

/** @param annotations - Semantic source objects. @param topics - Complete canonical ownership. @param context - Difference budget. @param path - Export sheet path. @returns Representable directed relationships. */
export function exportXmindAnnotations(annotations: readonly MindMapAnnotation[], topics: ReadonlyMap<string, XmindExportTopic>, context: XmindExportContext, path: string): readonly Record<string, unknown>[] {
  const relationships: Record<string, unknown>[] = []; const synthetic = new Set(topics.keys());
  for (const [index, annotation] of annotations.entries()) {
    const style = annotation.color ? { style: { properties: { "line-color": annotation.color } } } : {};
    if (annotation.kind === "relation") { relationships.push({ id: annotation.id, title: annotation.text, end1Id: annotation.from, end2Id: annotation.to, ...style }); continue; }
    const members = annotation.topicIds.map(id => topics.get(id)!).sort((a, b) => a.index - b.index), parent = members[0]?.parent;
    if (!parent || members.some((member, i) => member.parent !== parent || member.index !== members[0]!.index + i)) {
      reportXmind(context.report, "unsupported-field", `${path}.annotations[${index}]`, "XMind groups require a continuous range of attached siblings."); continue;
    }
    const range = `(${members[0]!.index},${members.at(-1)!.index})`, field = annotation.kind === "summary" ? "summaries" : "boundaries";
    const group: Record<string, unknown> = { id: annotation.id, range, ...style };
    if (annotation.kind === "boundary") group.title = annotation.text;
    else {
      let id = `summary-${annotation.id}`; while (synthetic.has(id)) id += "-"; synthetic.add(id);
      const children = (parent.output.children ??= {}) as Record<string, unknown>;
      ((children.summary ??= []) as Record<string, unknown>[]).push({ id, title: annotation.text }); group.topicId = id;
    }
    ((parent.output[field] ??= []) as Record<string, unknown>[]).push(group);
  }
  return relationships;
}
