import type { AbstractMmlTokenNode, MmlNode } from '@mathjax/src/js/core/MmlTree/MmlNode.js';
import type { FormulaAdaptor, FormulaWrapper } from './types';

/**
 * Preserves mathematical token text alongside path glyphs for inspectable semantics.
 * @param node - Controlled MathML node, independent of its painted glyph variant.
 * @returns Original token content in structural order.
 */
function mathematicalText(node: MmlNode): string {
  return node.isToken ? (node as AbstractMmlTokenNode).getText() : node.childNodes.map(mathematicalText).join('');
}

/**
 * Associates logical text with emitted groups without adding visible text or ink.
 * @param wrapper - Completed layout tree.
 * @param adaptor - Matching isolated output DOM.
 */
export function annotateFormulaText(wrapper: FormulaWrapper, adaptor: FormulaAdaptor): void {
  const element = wrapper.dom?.[0];
  // Text wrappers can reuse their parent token's group; they must not overwrite its identity.
  if (element && wrapper.node.kind !== 'text') adaptor.setAttribute(element, 'data-math-text', mathematicalText(wrapper.node));
  wrapper.childNodes.forEach(child => annotateFormulaText(child, adaptor));
}
