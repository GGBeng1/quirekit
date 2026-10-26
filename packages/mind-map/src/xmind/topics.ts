import type { MindMapNode } from "../model/types";
import { reportXmind, reportXmindFields, xmindArray, xmindLayout, xmindPosition, xmindRecord, xmindText } from "./reading";
import type { XmindCanvas, XmindContext } from "./types";
import { readXmindDetails } from "./import/details";
import { readXmindStyle } from "./import/style";

/**
 * Projects topics into the admitted tree while collecting detached trees separately.
 * @param input - Source topic.
 * @param path - Workbook field path.
 * @param depth - Original source nesting depth, including detached topics.
 * @param context - Workbook-wide limits and diagnostics.
 * @param canvas - Current canvas position authority and free trees.
 * @param root - Whether this is the main root.
 * @param free - Whether this topic roots an independent tree.
 * @returns Canonical node with newly allocated identity.
 */
export function readXmindTopic(input: unknown, path: string, depth: number, context: XmindContext,
  canvas: XmindCanvas, root = false, free = false): MindMapNode {
  if (++context.count > 10000 || depth > 64) throw new RangeError("XMind: tree budget exceeded");
  const topic = xmindRecord(input, path);
  if (context.seen.has(topic)) throw new TypeError(`${path}: repeated reference or cycle`);
  context.seen.add(topic);
  const id = `topic-${context.count}`;
  if (topic.id !== undefined) {
    const sourceId = xmindText(topic.id, `${path}.id`, context);
    if (canvas.ids.has(sourceId)) throw new TypeError(`${path}.id: duplicate topic identity`);
    canvas.ids.set(sourceId, id);
  }
  const text = xmindText(topic.title, `${path}.title`, context);
  reportXmindFields(topic, ["id", "class", "title", "children", "branch", "notes", "href", "markers", "image", "style", "boundaries", "summaries",
    ...(root || free ? ["position", "structureClass"] : [])], path, context);
  if (topic.branch !== undefined && topic.branch !== null && topic.branch !== "folded" && topic.branch !== "") {
    reportXmind(context, "fallback", `${path}.branch`, "Unknown fold state; the topic is expanded.");
  }
  if (root && topic.branch === "folded") reportXmind(context, "fallback", `${path}.branch`, "The main root remains expanded.");
  const children = topic.children === undefined ? {} : xmindRecord(topic.children, `${path}.children`);
  reportXmindFields(children, ["attached", "detached", "summary"], `${path}.children`, context);
  const attached = children.attached === undefined ? [] : xmindArray(children.attached, `${path}.children.attached`);
  const detached = children.detached === undefined ? [] : xmindArray(children.detached, `${path}.children.detached`);
  const details = readXmindDetails(topic, path, context, canvas);
  const role = root ? "centralTopic" : free ? "floatingTopic" : depth === 1 ? "mainTopic" : "subTopic";
  const style = { ...canvas.theme.get(role), ...(typeof topic.class === "string" ? canvas.theme.get(topic.class) : {}), ...readXmindStyle(topic.style, `${path}.style`, context) };
  const node = { id, text, collapsed: !root && topic.branch === "folded",
    ...(Object.keys(style).length ? { style } : {}), ...(Object.keys(details).length ? { details } : {}),
    children: Array.from(attached, (child, index) => readXmindTopic(child, `${path}.children.attached[${index}]`, depth + 1, context, canvas)) };
  if (topic.boundaries !== undefined || topic.summaries !== undefined || children.summary !== undefined) canvas.groups.push({ source: topic, node, path });

  // Detached topics remain independent even when serialized under an ordinary branch.
  // Positions are projected once from the source root anchor, never from the viewport.
  Array.from(detached).forEach((child, index) => {
    const childPath = `${path}.children.detached[${index}]`;
    const value = xmindRecord(child, childPath);
    const topicRoot = readXmindTopic(value, childPath, depth + 1, context, canvas, false, true);
    let position = { x: 320, y: 180 * (canvas.floatingTopics.length + 1) };
    if (value.position !== undefined) {
      const absolute = xmindPosition(value.position, `${childPath}.position`, context);
      position = { x: absolute.x - canvas.origin.x, y: absolute.y - canvas.origin.y };
    } else reportXmind(context, "fallback", `${childPath}.position`, "Missing free-topic position; an initial position was assigned.");
    const layout = xmindLayout(value.structureClass, `${childPath}.structureClass`, context);
    if (value.structureClass !== undefined && layout === "mind-map") {
      reportXmind(context, "fallback", `${childPath}.structureClass`, "An independent tree grows in one direction in this editor.");
    }
    canvas.floatingTopics.push({ root: topicRoot, position, side: layout === "logical-left" || (layout === "mind-map" && position.x < 0) ? "left" : "right" });
  });
  return node;
}
