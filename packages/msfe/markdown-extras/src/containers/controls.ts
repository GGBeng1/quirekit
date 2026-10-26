import type { ComponentViewRenderer } from "@quirekit/msfe-core";
import type { ContainerControlProps } from "./types";

/** @param mount - Host-owned component boundary. @returns Plain accessible control; product hosts supply their public component renderer. */
export const nativeContainerControl: ComponentViewRenderer<ContainerControlProps> = mount => {
  const button = mount.dom.ownerDocument.createElement("button");
  button.type = "button";
  let current = mount.props;
  /** Dispatches through the newest retained props, never a stale source offset. */
  const toggle = (): void => current.toggle();
  /** @param props - Latest semantic visibility and localized label. */
  function update(props: ContainerControlProps): void {
    current = props; button.textContent = props.expanded ? "▾" : "▸";
    button.setAttribute("aria-label", props.label); button.setAttribute("aria-expanded", String(props.expanded));
  }
  button.addEventListener("click", toggle); mount.dom.append(button); update(current);
  return { update,
    /** Releases the listener when the generic component boundary unmounts. */
    destroy() { button.removeEventListener("click", toggle); button.remove(); },
  };
};
