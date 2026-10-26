import type { SimpleInstance } from "../types";
import { readSimplePlainInput } from "./value";

/**
 * Normalizes the pinned plain input seam without replacing native editing or geometry.
 * @param instance - Private runtime owned for its complete adapter lifetime.
 */
export function installSimplePlainInput(instance: SimpleInstance): void {
  const edit = instance.renderer.textEdit;
  const read = edit.getEditText, show = edit.showEditTextBox;
  /** @returns Current native value, or the original reader before an input exists. */
  edit.getEditText = function readInput(): string {
    const input = edit.textEditNode;
    if (!input) return read.call(edit);
    return readSimplePlainInput(input);
  };
  /** @param options - Original presentation arguments, retaining vendor focus and placement. */
  edit.showEditTextBox = function showInput(options: unknown): void {
    show.call(edit, options);
    const input = edit.textEditNode;
    // A source ending in LF already has a meaningful terminal BR. Append its
    // caret placeholder without replacing children or resetting native selection.
    if (input?.lastChild?.nodeName === "BR") input.appendChild(input.ownerDocument.createElement("br"));
  };
}
