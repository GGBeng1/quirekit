import type { DiagramElement, WhiteboardDiagramNode } from "./types";
import { whiteboardRecord } from "../validation";

/** @param id - Native identity. @param type - Native kind. @returns Complete baseline native element. */
export function baseElement(id: string, type: string): DiagramElement {
  return { id, type, x: 0, y: 0, width: 200, height: 100, angle: 0, strokeColor: "#334155", backgroundColor: "transparent",
    fillStyle: "solid", strokeWidth: 2, strokeStyle: "solid", roughness: 0, opacity: 100, groupIds: [], frameId: null,
    roundness: null, seed: 1, version: 1, versionNonce: 1, isDeleted: false, boundElements: [], updated: 0, link: null, locked: false };
}

/** @param element - Isolated draft. Marks one actual content change in the native version fields. */
export function touchElement(element: DiagramElement): void {
  element.version = Number(element.version ?? 0) + 1;
  element.versionNonce = Number(element.versionNonce ?? 0) + 1;
}

/** @param elements - Isolated element map. @param request - Node edit. @param index - Auto-layout ordinal. */
export function putNode(elements: Map<string, DiagramElement>, request: WhiteboardDiagramNode, index: number): void {
  const previous = elements.get(request.id), type = request.shape ?? previous?.type ?? "rectangle";
  if (!["rectangle", "ellipse", "diamond", "text"].includes(type) || (previous && (previous.isDeleted || previous.type !== type))) {
    throw new Error(`不能把现有元素 ${request.id} 替换为另一种图形；请使用新 ID`);
  }
  const node = previous ?? { ...baseElement(request.id, type), x: (index % 4) * 280, y: Math.floor(index / 4) * 180, backgroundColor: "#dbeafe" };
  for (const field of ["x", "y", "width", "height"] as const) if (request[field] !== undefined) node[field] = request[field];
  if (request.fill !== undefined) node.backgroundColor = request.fill;
  if (request.color !== undefined) node.strokeColor = request.color;
  elements.set(node.id, node); touchElement(node);
  const oldLabel = type === "text" ? node : [...elements.values()].find(item => item.type === "text" && item.containerId === node.id && !item.isDeleted);
  if (type === "text" || request.label !== undefined || oldLabel) {
    const labelId = oldLabel?.id ?? `${node.id}:label`;
    if (!oldLabel && elements.has(labelId)) throw new Error(`白板文字 ID 冲突：${labelId}`);
    const label = oldLabel ?? baseElement(labelId, "text");
    label.text = request.label ?? String(label.text ?? ""); label.originalText = label.text;
    label.fontSize = request.fontSize ?? Number(label.fontSize ?? 20); label.fontFamily ??= 2;
    label.lineHeight ??= 1.25; label.textAlign ??= type === "text" ? "left" : "center";
    label.verticalAlign = type === "text" ? "top" : "middle"; label.containerId = type === "text" ? null : node.id;
    label.autoResize = true; label.strokeColor = request.color ?? label.strokeColor ?? "#334155";
    placeLabel(label, node); touchElement(label); elements.set(label.id, label);
  }
}

/** @param label - Native bound text. @param parent - Shape/arrow owning it. */
export function placeLabel(label: DiagramElement, parent: DiagramElement): void {
  const lines = String(label.text ?? "").split("\n"), size = Number(label.fontSize ?? 20);
  label.width = Math.max(size, ...lines.map(line => [...line].reduce((sum, c) => sum + (c.charCodeAt(0) > 255 ? size : size * 0.6), 0)));
  label.height = lines.length * size * Number(label.lineHeight ?? 1.25);
  if (label === parent) return;
  label.x = parent.x + (parent.width - label.width) / 2; label.y = parent.y + (parent.height - label.height) / 2;
}

/** @param value - Native arrow binding. @returns Referenced element, when present. */
export function bindingId(value: unknown): string | undefined {
  return whiteboardRecord(value) && typeof value.elementId === "string" ? value.elementId : undefined;
}
