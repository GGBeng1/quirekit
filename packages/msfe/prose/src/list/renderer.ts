import type { MsfeNodeViewProps, MsfeNodeViewRenderer } from "@quirekit/msfe-core";
import type { TaskAttributes } from "./types";

/** Accessible native fallback; Vue/React consumers replace only addNodeView. */
export const taskRenderer: MsfeNodeViewRenderer = ({ dom, props }) => {
  const input = dom.ownerDocument.createElement("input");
  input.type = "checkbox"; input.className = "msfe-task-control"; input.setAttribute("aria-label", "完成任务");
  let current = props as MsfeNodeViewProps<TaskAttributes>;
  input.addEventListener("change", () => {
    const result = current.updateAttributes({ checked: input.checked });
    if (!result.ok) input.checked = current.attrs.checked;
  });
  /** @param next - Current source fields and canonical editing permission. */
  function update(next: MsfeNodeViewProps): void {
    current = next as MsfeNodeViewProps<TaskAttributes>;
    input.checked = current.attrs.checked; input.disabled = current.readOnly;
  }
  dom.append(input); update(props);
  return { update, destroy() { input.remove(); } };
};
