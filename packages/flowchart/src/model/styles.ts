import type { FlowchartEdgeStyle, FlowchartNodeStyle } from "./types";
import { choice, number, record } from "./validation";

/** @param input - Untrusted optional formatting. @param edge - Whether this is a connector. @returns Checked immutable overrides. */
export function readStyle(input: unknown, edge: boolean): FlowchartNodeStyle | FlowchartEdgeStyle {
  const keys = edge ? ["stroke", "width", "dashed", "sourceArrow", "targetArrow", "drawing"] : ["fill", "stroke", "color", "fontSize", "bold", "drawing", "textAlign", "verticalAlign", "padding"];
  const value = record(input, keys, "style");
  const result: Record<string, string | number | boolean> = {};
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) continue;
    const v = value[key];
    if (key === "drawing") result[key] = choice(v, ["standard", "sketch", "pencil"], key);
    else if (key === "textAlign") result[key] = choice(v, ["left", "center", "right"], key);
    else if (key === "verticalAlign") result[key] = choice(v, ["top", "middle", "bottom"], key);
    else if (key === "padding") result[key] = number(v, 0, 80, key);
    else if (["fill", "stroke", "color"].includes(key)) {
      if (typeof v !== "string" || !/^#[\da-fA-F]{6}$/u.test(v)) throw new TypeError("style: expected six-digit hexadecimal color");
      result[key] = v;
    } else if (key === "fontSize" || key === "width") result[key] = number(v, key === "width" ? 1 : 10, key === "width" ? 8 : 72, key);
    else if (key === "bold" || key === "dashed") {
      if (typeof v !== "boolean") throw new TypeError(`style.${key}: expected boolean`);
      result[key] = v;
    } else result[key] = choice(v, ["none", "block", "open", "diamond", "circle", "er-one", "er-many", "er-zero-one", "er-one-many", "er-zero-many", "triangle-hollow", "diamond-hollow"], key);
  }
  return Object.freeze(result);
}
