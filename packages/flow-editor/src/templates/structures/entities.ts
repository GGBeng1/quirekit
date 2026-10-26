import type { FlowchartEntityField, FlowchartNode } from "@quirekit/flowchart";
import { diagram, diagramEdge, diagramNode } from "../diagrams/build";
import type { RecipeTone } from "../recipes/types";

/** @param id - Table name. @param text - Visible name. @param x - World left. @param y - World top. @param fields - Ordered fields. @param tone - Template palette. @returns Genuine editable entity. */
function entity(id: string, text: string, x: number, y: number, fields: readonly FlowchartEntityField[], tone: RecipeTone): FlowchartNode {
  return { ...diagramNode(id, "er-entity", text, x, y, 300, 190, tone, { fontSize: 14, bold: true }), entity: { fields } };
}
/** @param name - Literal field. @param type - Literal type. @param key - Visual key. @returns Structured field. */
function field(name: string, type: string, key: FlowchartEntityField["key"] = "none"): FlowchartEntityField { return { name, type, key }; }
/** @returns Original commerce model with explicit one-to-many and identifying key annotations. */
export function commerceEntities() {
  return diagram([
    entity("customer", "客户 Customer", 0, 0, [field("id", "uuid", "primary"), field("name", "varchar"), field("email", "varchar")], "blue"),
    entity("order", "订单 Order", 460, 0, [field("id", "uuid", "primary"), field("customer_id", "uuid", "foreign"), field("created_at", "datetime"), field("status", "varchar")], "purple"),
    entity("item", "订单明细 OrderItem", 460, 300, [field("order_id", "uuid", "primary-foreign"), field("product_id", "uuid", "primary-foreign"), field("quantity", "integer"), field("price", "decimal")], "orange"),
    entity("product", "商品 Product", 0, 300, [field("id", "uuid", "primary"), field("name", "varchar"), field("price", "decimal")], "green"),
  ], [
    diagramEdge("places", { node: "customer", port: "right" }, { node: "order", port: "left" }, { label: "下单", style: { sourceArrow: "er-one", targetArrow: "er-zero-many" } }),
    diagramEdge("contains", { node: "order", port: "bottom" }, { node: "item", port: "top" }, { label: "包含", style: { sourceArrow: "er-one", targetArrow: "er-one-many" } }),
    diagramEdge("products", { node: "product", port: "right" }, { node: "item", port: "left" }, { label: "明细商品", style: { sourceArrow: "er-one", targetArrow: "er-zero-many" } }),
  ]);
}
/** @returns Original membership model resolving a many-to-many relationship through a junction entity. */
export function membershipEntities() {
  return diagram([
    entity("user", "用户 User", 0, 0, [field("id", "uuid", "primary"), field("display_name", "varchar"), field("email", "varchar")], "blue"),
    entity("member", "团队成员 Membership", 440, 0, [field("user_id", "uuid", "primary-foreign"), field("team_id", "uuid", "primary-foreign"), field("role", "varchar"), field("joined_at", "datetime")], "purple"),
    entity("team", "团队 Team", 880, 0, [field("id", "uuid", "primary"), field("name", "varchar"), field("description", "text")], "green"),
  ], [
    diagramEdge("memberships", { node: "user", port: "right" }, { node: "member", port: "left" }, { label: "参与", style: { sourceArrow: "er-one", targetArrow: "er-zero-many" } }),
    diagramEdge("team-members", { node: "team", port: "left" }, { node: "member", port: "right" }, { label: "拥有", style: { sourceArrow: "er-one", targetArrow: "er-one-many" } }),
  ]);
}
