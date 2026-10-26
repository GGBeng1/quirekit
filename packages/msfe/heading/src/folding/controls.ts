import type { ComponentViewRenderer } from "@quirekit/msfe-core";
import type { HeadingFoldControlProps } from "../types";

/** @param mount - Framework-neutral component boundary. @returns Accessible fallback; product hosts supply their shared IconButton. */
export const nativeHeadingFoldControl: ComponentViewRenderer<HeadingFoldControlProps> = mount => {
  const document = mount.dom.ownerDocument, wrapper = document.createElement("span"), button = document.createElement("button");
  wrapper.className = "msfe-heading-toggle"; button.type = "button"; button.className = "msfe-heading-toggle-native";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"), path = document.createElementNS(svg.namespaceURI, "path");
  for (const [key, value] of Object.entries({ viewBox: "0 0 24 24", width: "16", height: "16", fill: "none", stroke: "currentColor", "stroke-width": "1.75", "aria-hidden": "true" })) svg.setAttribute(key, value);
  svg.append(path); button.append(svg); wrapper.append(button); mount.dom.append(wrapper);
  let current = mount.props;
  /** Uses the newest props after a source or fold update. */
  function toggle(): void { current.toggle(); }
  /** @param props - Current source-neutral control. */
  function update(props: HeadingFoldControlProps): void {
    current = props;
    button.setAttribute("aria-label", props.label); button.setAttribute("aria-expanded", String(props.expanded));
    path.setAttribute("d", props.expanded ? "m6 9 6 6 6-6" : "m9 6 6 6-6 6");
  }
  button.addEventListener("click", toggle); update(current);
  return { update,
    /** Releases only this widget's DOM and listeners. */
    destroy() { button.removeEventListener("click", toggle); wrapper.remove(); },
  };
};
