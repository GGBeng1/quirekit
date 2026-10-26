import type { CommandProps } from "@quirekit/core";
import { createWordNumberingInstance, resolveWordNumberingRegistry, resolveWordParagraphNumbering } from "../../model";
import type { CreateWordNumberingInstanceResult, WordAbstractNumbering } from "../../types";

/**
 * Installs a copy-on-write definition together with every concrete paragraph reference.
 *
 * A fresh concrete identity gives paragraph-property revisions real before/after
 * endpoints. The old instance remains available to reject and export prior state.
 *
 * @param context - One atomic command transaction.
 * @param definition - Valid new abstract definition.
 * @param previousNumId - Whole sequence to migrate, or omission for a new list.
 * @returns Installed registry and new concrete identity.
 */
export function installWordNumberingDefinition(
  context: CommandProps,
  definition: WordAbstractNumbering,
  previousNumId?: string
): CreateWordNumberingInstanceResult {
  const registry = resolveWordNumberingRegistry(context.tr.doc.attrs.wordNumberingRegistry);
  const installed = createWordNumberingInstance({ ...registry,
    abstractNums: { ...registry.abstractNums, [definition.id]: definition }
  }, definition.id);
  context.tr.setDocAttribute("wordNumberingRegistry", installed.registry);
  if (previousNumId !== undefined) {
    context.tr.doc.descendants((node, position) => {
      if (!node.isTextblock) return true;
      const reference = resolveWordParagraphNumbering(node.attrs.wordNumbering);
      if (reference?.numId === previousNumId) context.tr.setNodeMarkup(position, undefined, {
        ...node.attrs, wordNumbering: { ...reference, numId: installed.numId }
      });
      return false;
    });
  }
  return installed;
}
