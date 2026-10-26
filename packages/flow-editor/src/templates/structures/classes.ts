import type { FlowchartNode } from "@quirekit/flowchart";
import { diagram, diagramEdge, diagramNode } from "../diagrams/build";
import type { RecipeTone } from "../recipes/types";

/** @param id - Stable class ID. @param name - Literal class title. @param x - World left. @param y - World top. @param attributes - Field signatures. @param operations - Method signatures. @param tone - Palette. @returns A genuine three-compartment class. */
function klass(id: string, name: string, x: number, y: number, attributes: readonly string[], operations: readonly string[], tone: RecipeTone): FlowchartNode {
  return { ...diagramNode(id, "uml-class", name, x, y, 320, 220, tone, { fontSize: 14, bold: true }), uml: { attributes, operations } };
}
/** @returns Original domain model illustrating ownership, association and dependency. */
export function orderClasses() {
  return diagram([
    klass("order", "Order", 0, 0, ["- id: UUID", "- status: OrderStatus", "- items: OrderItem[]"], ["+ addItem(product, quantity): void", "+ total(): Money"], "blue"),
    klass("item", "OrderItem", 500, 0, ["- product: Product", "- quantity: number"], ["+ subtotal(): Money"], "purple"),
    klass("customer", "Customer", 0, 370, ["- id: UUID", "- name: string"], ["+ placeOrder(): Order"], "green"),
    klass("product", "Product", 500, 370, ["- sku: string", "- price: Money"], ["+ isAvailable(): boolean"], "orange"),
  ], [
    diagramEdge("composition", { node: "order", port: "right" }, { node: "item", port: "left" }, { label: "1 ─ 1..*", style: { sourceArrow: "diamond", targetArrow: "none" } }),
    diagramEdge("places", { node: "customer", port: "top" }, { node: "order", port: "bottom" }, { label: "1 ─ 0..*" }),
    diagramEdge("references", { node: "item", port: "bottom" }, { node: "product", port: "top" }, { label: "* ─ 1" }),
    diagramEdge("queries", { node: "customer", port: "right" }, { node: "product", port: "left" }, { label: "查询", style: { dashed: true, targetArrow: "open" } }),
  ]);
}
/** @returns Original abstraction model illustrating realization, inheritance and aggregation. */
export function serviceClasses() {
  return diagram([
    klass("service", "«interface» Notification", 250, 0, [], ["+ send(message: string): void"], "blue"),
    klass("base", "BaseNotification", 250, 350, ["# channel: string"], ["+ send(message: string): void", "# format(message): string"], "purple"),
    klass("email", "EmailNotification", 0, 710, ["- transport: MailTransport"], ["+ send(message: string): void"], "green"),
    klass("sms", "SmsNotification", 500, 710, ["- gateway: SmsGateway"], ["+ send(message: string): void"], "orange"),
    klass("hub", "NotificationCenter", 820, 0, ["- channels: Notification[]"], ["+ broadcast(message): void"], "purple"),
  ], [
    diagramEdge("realizes", { node: "base", port: "top" }, { node: "service", port: "bottom" }, { label: "实现", style: { targetArrow: "triangle-hollow", dashed: true } }),
    diagramEdge("inherits-email", { node: "email", port: "top" }, { node: "base", port: "bottom" }, { routing: "orthogonal", style: { targetArrow: "triangle-hollow" } }),
    diagramEdge("inherits-sms", { node: "sms", port: "top" }, { node: "base", port: "bottom" }, { routing: "orthogonal", style: { targetArrow: "triangle-hollow" } }),
    diagramEdge("aggregates", { node: "hub", port: "left" }, { node: "service", port: "right" }, { label: "0..*", style: { sourceArrow: "diamond-hollow", targetArrow: "none" } }),
  ]);
}
