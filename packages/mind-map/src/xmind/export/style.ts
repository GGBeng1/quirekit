import type { MindMapNodeStyle } from "../../formatting/types";

const names = { color: "fo:color", fill: "svg:fill", borderColor: "border-line-color", lineColor: "line-color", fontSize: "fo:font-size", borderWidth: "border-line-width", lineWidth: "line-width" } as const;

/** @param style - Admitted CSS-pixel style. @returns XMind properties with point-unit lengths. */
export function xmindStyle(style?: MindMapNodeStyle): Record<string, unknown> | undefined {
  if (!style) return undefined;
  const properties: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(style)) {
    if (Object.hasOwn(names, key)) properties[names[key as keyof typeof names]] = typeof value === "number" ? `${value * .75}pt` : value === "transparent" ? "none" : value;
    else if (key === "bold") properties["fo:font-weight"] = value ? "bold" : "normal";
    else if (key === "shape") properties["shape-class"] = `org.xmind.topicShape.${({ rectangle: "rect", rounded: "roundedRect", ellipse: "ellipse", diamond: "diamond" } as const)[value as NonNullable<MindMapNodeStyle["shape"]>]}`;
    else if (key === "lineStyle") properties["line-class"] = `org.xmind.branchConnection.${({ curve: "curve", elbow: "roundedElbow", direct: "straight" } as const)[value as NonNullable<MindMapNodeStyle["lineStyle"]>]}`;
    else if (key === "linePattern") properties["line-pattern"] = value === "dashed" ? "dash" : "solid";
  }
  return { properties };
}
