import { Node, selectionPreset, type QuireSelectionContribution } from "@quirekit/core";

/**
 * Admits a product atom to the existing cross-block selection lifecycle.
 * @param extension - Canonical atom and its original feature commands.
 * @returns The same node with source-owned selection or the shared atomic preset.
 */
export function withBlockAtomicSelection<Options extends object, Storage extends object>(extension: Node<Options, Storage>): Node<Options, Storage> {
  return extension.extend({
    /** @returns Source-owned contributions, or one whole-atom selection contract. */
    addSelection() {
      const inherited = (this.parent as (() => readonly QuireSelectionContribution[]) | undefined)?.();
      return inherited?.length ? inherited : [selectionPreset.atomicBlock({ id: `block-${this.name}`, nodeTypes: [this.name] })];
    }
  });
}
