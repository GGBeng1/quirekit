import { whiteboardRecord } from "../validation";
import type { WhiteboardDiagramPatch } from "./types";

const id = { type: "string", minLength: 1, maxLength: 160 } as const;
const color = { type: "string", pattern: "^(#[0-9a-fA-F]{6}|transparent)$" } as const;
/** Public JSON schema for the same bounded programmatic edit request. */
export const whiteboardDiagramSchema = {
  type: "object", additionalProperties: false,
  properties: {
    title: { type: "string", maxLength: 200 },
    nodes: { type: "array", maxItems: 100, items: { type: "object", required: ["id"], additionalProperties: false, properties: {
      id, shape: { enum: ["rectangle", "ellipse", "diamond", "text"] }, label: { type: "string", maxLength: 2000 },
      x: { type: "number", minimum: -100000, maximum: 100000 }, y: { type: "number", minimum: -100000, maximum: 100000 },
      width: { type: "number", minimum: 40, maximum: 2000 }, height: { type: "number", minimum: 30, maximum: 2000 },
      fill: color, color, fontSize: { type: "number", minimum: 12, maximum: 96 },
    } } },
    edges: { type: "array", maxItems: 200, items: { type: "object", required: ["id", "from", "to"], additionalProperties: false,
      properties: { id, from: id, to: id, label: { type: "string", maxLength: 2000 }, color } } },
    remove: { type: "array", maxItems: 300, items: id },
  },
} as const;

/** @param value - Untrusted API/model input. @returns Validated edit without silently dropping fields. */
export function readWhiteboardDiagramPatch(value: unknown): WhiteboardDiagramPatch {
  if (!whiteboardRecord(value)) throw new Error("白板图形请求必须是对象");
  validate(value, whiteboardDiagramSchema);
  if (!value.nodes && !value.edges && !value.remove && value.title === undefined) throw new Error("请指定要修改的节点、连线或标题");
  const patch = value as unknown as WhiteboardDiagramPatch;
  const ids = [...(patch.nodes ?? []), ...(patch.edges ?? [])].map(item => item.id);
  if (new Set(ids).size !== ids.length || patch.remove?.some(item => ids.includes(item))) throw new Error("白板请求包含重复或同时增删的 ID");
  return patch;
}

/** @param value - Input at the current field. @param schema - Restricted public schema. */
function validate(value: unknown, schema: Readonly<Record<string, unknown>>): void {
  if (Array.isArray(schema.enum)) { if (!schema.enum.includes(value)) throw new Error("不支持的白板图形类型"); return; }
  if (schema.type === "object") {
    if (!whiteboardRecord(value)) throw new Error("白板字段必须是对象");
    const properties = schema.properties as Record<string, Readonly<Record<string, unknown>>>;
    for (const key of schema.required as string[] ?? []) if (!(key in value)) throw new Error(`白板缺少字段 ${key}`);
    for (const [key, item] of Object.entries(value)) {
      if (!Object.hasOwn(properties, key)) throw new Error(`不支持的白板字段 ${key}`);
      validate(item, properties[key]!);
    }
  } else if (schema.type === "array") {
    if (!Array.isArray(value) || value.length > Number(schema.maxItems)) throw new Error("白板修改超出数量限制");
    value.forEach(item => validate(item, schema.items as Record<string, unknown>));
  } else if (schema.type === "string") {
    if (typeof value !== "string" || value.length < Number(schema.minLength ?? 0) || value.length > Number(schema.maxLength ?? Infinity)
      || (schema.pattern && !new RegExp(String(schema.pattern), "u").test(value))) throw new Error("白板文字、ID 或颜色无效");
  } else if (typeof value !== "number" || !Number.isFinite(value) || value < Number(schema.minimum) || value > Number(schema.maximum)) {
    throw new Error("白板坐标或尺寸无效");
  }
}
