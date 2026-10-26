import type { MsfeIconFactory } from "./types";

/** Small SVG fallback; hosts can supply their shared icon registry through the same seam. */
export const defaultEditorIcon: MsfeIconFactory = (name, document) => {
  const wrapper = document.createElement("span");
  wrapper.className = "msfe-control-icon";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [key, value] of Object.entries({ viewBox: "0 0 24 24", width: "16", height: "16",
    fill: "none", stroke: "currentColor", "stroke-width": "1.75", "stroke-linecap": "round", "stroke-linejoin": "round",
    "aria-hidden": "true", focusable: "false" })) svg.setAttribute(key, value);
  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute("d", { chevronDown: "m6 9 6 6 6-6", chevronRight: "m9 6 6 6-6 6",
    close: "m6 6 12 12M6 18 18 6", ellipsis: "M5 12h.01M12 12h.01M19 12h.01" }[name]);
  svg.append(path); wrapper.append(svg); return wrapper;
};
