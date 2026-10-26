import type { MindMapAnnotation } from "../../annotations/types";
import type { XmindCanvas, XmindContext } from "../types";
import { readText } from "../../model/validation";
import { reportXmind, reportXmindFields, xmindArray, xmindRecord } from "../reading";
import { readXmindStyle } from "./style";

/** @param value - Optional literal caption. @param path - Source field. @param context - Difference budget. @returns Portable caption. */
function caption(value: unknown, path: string, context: XmindContext): string {
  const text = value === undefined ? "" : readText(value, path);
  if (text.length > 160) reportXmind(context, "fallback", path, "Annotation caption reduced to the portable length.");
  return text.slice(0, 160);
}

/** @param sheet - Source sheet. @param canvas - Complete identity mapping. @param context - Difference budget. @param path - Sheet location. @returns Semantic relations and sibling groups. */
export function readXmindAnnotations(sheet: Record<string, unknown>, canvas: XmindCanvas, context: XmindContext, path: string): readonly MindMapAnnotation[] {
  const result: MindMapAnnotation[] = [];
  if (sheet.relationships !== undefined) for (const [index, value] of xmindArray(sheet.relationships, `${path}.relationships`).entries()) {
    const location = `${path}.relationships[${index}]`, relation = xmindRecord(value, location);
    reportXmindFields(relation, ["id", "class", "title", "end1Id", "end2Id", "style"], location, context);
    const from = typeof relation.end1Id === "string" ? canvas.ids.get(relation.end1Id) : undefined, to = typeof relation.end2Id === "string" ? canvas.ids.get(relation.end2Id) : undefined;
    if (!from || !to || from === to) { reportXmind(context, "unsupported-field", location, "Relationship endpoints do not resolve to two distinct topics."); continue; }
    const color = readXmindStyle(relation.style, `${location}.style`, context).lineColor ?? canvas.theme.get("relationship")?.lineColor;
    result.push({ kind: "relation", id: `annotation-${result.length + 1}`, from, to, text: caption(relation.title, `${location}.title`, context), ...(color ? { color } : {}) });
  }
  for (const owner of canvas.groups) for (const kind of ["boundary", "summary"] as const) {
    const field = kind === "boundary" ? "boundaries" : "summaries";
    const groups = owner.source[field] === undefined ? [] : xmindArray(owner.source[field], `${owner.path}.${field}`);
    const children = owner.source.children === undefined ? {} : xmindRecord(owner.source.children, `${owner.path}.children`);
    const summaries = children.summary === undefined ? [] : xmindArray(children.summary, `${owner.path}.children.summary`);
    const used = new Set<unknown>();
    for (const [index, value] of groups.entries()) {
      const location = `${owner.path}.${field}[${index}]`, group = xmindRecord(value, location);
      reportXmindFields(group, ["id", "title", "range", "style", ...(kind === "summary" ? ["topicId"] : [])], location, context);
      const range = typeof group.range === "string" ? /^\((\d+),(\d+)\)$/u.exec(group.range) : null;
      const start = Number(range?.[1]), end = Number(range?.[2]);
      if (!range || start > end || end >= owner.node.children.length) {
        reportXmind(context, "unsupported-field", location, "Group range is outside the attached siblings."); continue;
      }
      let title = group.title;
      if (kind === "summary") {
        const topic = summaries.find(value => xmindRecord(value, "summaryTopic").id === group.topicId);
        if (!topic) { reportXmind(context, "unsupported-field", location, "Summary topic reference is missing."); continue; }
        const summary = xmindRecord(topic, "summaryTopic"); used.add(topic); title = summary.title;
        reportXmindFields(summary, ["id", "class", "title"], `${owner.path}.children.summary`, context);
      }
      const color = readXmindStyle(group.style, `${location}.style`, context).lineColor ?? canvas.theme.get(kind)?.lineColor;
      result.push({ kind, id: `annotation-${result.length + 1}`, topicIds: owner.node.children.slice(start, end + 1).map(node => node.id),
        text: caption(title, `${location}.title`, context), ...(color ? { color } : {}) });
    }
    if (kind === "summary") for (const topic of summaries) if (!used.has(topic)) reportXmind(context, "unsupported-field", `${owner.path}.children.summary`, "An unreferenced summary topic is not represented.");
  }
  return result;
}
