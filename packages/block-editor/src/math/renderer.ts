import type { Editor } from "@quirekit/core";
import type { MathDocument } from "@quirekit/math";
import type { MathJaxRenderer } from "@quirekit/math-mathjax";

const services = new WeakMap<Editor, { owners: number; renderer: Promise<MathJaxRenderer> }>();

/** @param editor - Mounted document. @returns A bounded renderer lease that does no work until a formula is mounted. */
export function acquireBlockMathRenderer(editor: Editor) {
  let service = services.get(editor);
  if (!service) {
    service = { owners: 0, renderer: import("@quirekit/math-mathjax").then(module => module.createMathJaxRenderer({ maxEntries: 64, maxBytes: 4 * 1024 * 1024, maxPending: 128 })) };
    services.set(editor, service);
  }
  service.owners++;
  const owned = service;
  let released = false;
  return {
    /** @param document - Parsed source. @param display - Explicit mathematical layout mode. @returns Matching SVG and baseline. */
    async render(document: MathDocument, display: boolean) {
      const renderer = await owned.renderer;
      if (released) throw new Error("Formula view released");
      return renderer.render(document, { display: display ? "block" : "inline" });
    },
    /** Releases the cache when the last mounted formula is removed. */
    release(): void {
      if (released) return;
      released = true;
      if (--owned.owners === 0) {
        services.delete(editor);
        void owned.renderer.then(renderer => renderer.dispose(), () => {});
      }
    }
  };
}
