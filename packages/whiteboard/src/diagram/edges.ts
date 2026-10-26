import { baseElement, bindingId, placeLabel, touchElement } from "./elements";
import type { DiagramElement, WhiteboardDiagramEdge } from "./types";
import { whiteboardRecord } from "../validation";

/** @param elements - Isolated scene map. @param request - Explicit connection. */
export function putEdge(elements: Map<string, DiagramElement>, request: WhiteboardDiagramEdge): void {
  const previous = elements.get(request.id);
  if (previous && (previous.type !== "arrow" || previous.isDeleted)) throw new Error(`连线 ID ${request.id} 已被其他元素使用`);
  const arrow = previous ?? { ...baseElement(request.id, "arrow"), startArrowhead: null, endArrowhead: "arrow", elbowed: false };
  if (request.from === request.to) throw new Error("连线必须连接两个不同节点");
  if (bindingId(arrow.startBinding) !== request.from) arrow.startBinding = { elementId: request.from, focus: 0, gap: 4 };
  if (bindingId(arrow.endBinding) !== request.to) arrow.endBinding = { elementId: request.to, focus: 0, gap: 4 };
  if (request.color !== undefined) arrow.strokeColor = request.color;
  elements.set(arrow.id, arrow); touchElement(arrow);
  if (request.label !== undefined) {
    const previousLabel = [...elements.values()].find(item => item.type === "text" && item.containerId === arrow.id && !item.isDeleted);
    const id = previousLabel?.id ?? `${arrow.id}:label`;
    if (!previousLabel && elements.has(id)) throw new Error(`白板文字 ID 冲突：${id}`);
    const label = { ...baseElement(id, "text"), ...previousLabel, text: request.label, originalText: request.label,
      fontSize: 18, fontFamily: 2, lineHeight: 1.25, textAlign: "center", verticalAlign: "middle", autoResize: true, containerId: arrow.id };
    placeLabel(label, arrow); touchElement(label); elements.set(id, label);
  }
}

/** @param node - Shape. @param other - Opposite shape. @returns Border connection point in scene space. */
function border(node: DiagramElement, other: DiagramElement): readonly [number, number] {
  const cx = node.x + node.width / 2, cy = node.y + node.height / 2;
  const angle = Number(node.angle ?? 0), cos = Math.cos(angle), sin = Math.sin(angle);
  const sceneX = other.x + other.width / 2 - cx, sceneY = other.y + other.height / 2 - cy;
  const dx = cos * sceneX + sin * sceneY, dy = -sin * sceneX + cos * sceneY;
  const nx = dx / (node.width / 2), ny = dy / (node.height / 2);
  const divisor = node.type === "ellipse" ? Math.hypot(nx, ny) : node.type === "diamond" ? Math.abs(nx) + Math.abs(ny) : Math.max(Math.abs(nx), Math.abs(ny));
  if (divisor === 0) return [cx, cy];
  return [cx + (cos * dx - sin * dy) / divisor, cy + (sin * dx + cos * dy) / divisor];
}

/**
 * Repairs both directions of native bindings after edits and deletion. Only
 * arrows touching changed shapes are repositioned; freehand paths stay intact.
 * @param elements - Isolated native scene map.
 * @param changed - Explicitly changed node/edge identities.
 */
export function reconcileBindings(elements: Map<string, DiagramElement>, changed: ReadonlySet<string>): void {
  const incoming = new Map<string, { id: string; type: string }[]>();
  /** @param target - Container identity. @param element - Attached text/arrow. */
  function attach(target: string, element: DiagramElement): void {
    const list = incoming.get(target) ?? []; list.push({ id: element.id, type: element.type }); incoming.set(target, list);
  }
  for (const element of elements.values()) {
    if (element.isDeleted) continue;
    if (element.type === "text" && typeof element.containerId === "string") attach(element.containerId, element);
    if (element.type !== "arrow") continue;
    const startId = bindingId(element.startBinding), endId = bindingId(element.endBinding);
    if (startId) attach(startId, element); if (endId) attach(endId, element);
    if (!startId || !endId || ![element.id, startId, endId].some(id => changed.has(id))) continue;
    const start = elements.get(startId), end = elements.get(endId);
    if (!start || !end || start.isDeleted || end.isDeleted || ![start, end].every(node => ["rectangle", "ellipse", "diamond"].includes(node.type))) {
      throw new Error(`连线 ${element.id} 必须引用现有的矩形、菱形或椭圆`);
    }
    if (element.elbowed || Number(element.angle ?? 0) !== 0) throw new Error(`连线 ${element.id} 是原生折线或旋转箭头，请在白板中手动调整其几何位置`);
    const a = border(start, end), b = border(end, start);
    const oldPoints = Array.isArray(element.points) ? element.points : [];
    const middle = oldPoints.slice(1, -1).map(point => {
      if (!Array.isArray(point) || typeof point[0] !== "number" || typeof point[1] !== "number") throw new Error(`连线 ${element.id} 路径无效`);
      return [element.x + point[0] - a[0], element.y + point[1] - a[1]];
    });
    const points = [[0, 0], ...middle, [b[0] - a[0], b[1] - a[1]]];
    element.x = a[0]; element.y = a[1];
    element.width = Math.max(...points.map(point => point[0]!)) - Math.min(...points.map(point => point[0]!));
    element.height = Math.max(...points.map(point => point[1]!)) - Math.min(...points.map(point => point[1]!));
    element.points = points; touchElement(element);
    for (const label of elements.values()) if (label.type === "text" && label.containerId === element.id) {
      placeLabel(label, element); label.x = (a[0] + b[0] - label.width) / 2; label.y = (a[1] + b[1] - label.height) / 2; touchElement(label);
    }
  }
  for (const element of elements.values()) {
    if (element.isDeleted) continue;
    const expected = incoming.get(element.id) ?? [];
    const prior = Array.isArray(element.boundElements) ? element.boundElements : [];
    const bindings = prior.filter(item => whiteboardRecord(item) && expected.some(binding => binding.id === item.id && binding.type === item.type));
    for (const binding of expected) if (!bindings.some(item => whiteboardRecord(item) && item.id === binding.id)) bindings.push(binding);
    if (JSON.stringify(element.boundElements ?? []) !== JSON.stringify(bindings)) { element.boundElements = bindings; touchElement(element); }
  }
}
