import type { ComponentViewRenderer } from "@quirekit/msfe-core";
import { materializeCodeLine } from "./source";
import type { EmptyCodeProps } from "./types";

/** A noneditable entry that relinquishes focus to the sole source input after activation. */
export const emptyCodeRenderer: ComponentViewRenderer<EmptyCodeProps> = ({ dom, props, scope }) => {
  let current = props;
  const button = dom.ownerDocument.createElement("button");
  button.type = "button"; button.className = "msfe-empty-code";
  // The placeholder contributes one line to native block measurement. It is not
  // editable DOM and never synthesizes source during rendering or scrolling.
  button.style.cssText = "display:block;box-sizing:border-box;width:100%;min-height:2.5em;padding:.5em 1em;text-align:start;font:inherit;color:inherit;background:transparent;border:0;cursor:text;opacity:.5";
  /** @param next - Mapped source location, permission or localized label. */
  function update(next: EmptyCodeProps): void {
    current = next; button.textContent = next.label; button.setAttribute("aria-label", next.label); button.disabled = next.readOnly;
  }
  /** Revalidate the source before writing; stale mounts and repeated activation cannot insert twice. */
  function activate(): void {
    if (scope.disposed || current.readOnly) return;
    const editor = current.editor();
    if (editor.run(materializeCodeLine(current.from)).ok) editor.focus();
  }
  button.addEventListener("click", activate); update(props); dom.append(button);
  return { update, destroy() { button.removeEventListener("click", activate); button.remove(); } };
};
