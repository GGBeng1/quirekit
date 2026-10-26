import { onBeforeUnmount, onMounted } from "vue";
import type { Editor } from "@quirekit/core";
import { followBlockLink } from "../../sections/links";

/** @param editor - Mounted document owner. @param feedback - Missing-target feedback. */
export function useBlockLinks(editor: Editor, feedback: (message: string) => void): void {
  let window: Window | null | undefined;
  /** Handles explicit hash navigation; ordinary editing has no location subscription work. */
  function navigate(): void {
    if (window?.location.hash.startsWith("#block=") && !followBlockLink(editor, window.location.href)) feedback("此块已删除，或链接不属于当前本地文档");
  }
  /** Resolves a restored fragment after the document's retained surface exists. */
  function mount(): void {
    if (window) return;
    window = editor.mountedView?.dom.ownerDocument.defaultView;
    window?.addEventListener("hashchange", navigate); navigate();
  }
  editor.on("mount", mount);
  onMounted(mount);
  onBeforeUnmount(() => { editor.off("mount", mount); window?.removeEventListener("hashchange", navigate); });
}
