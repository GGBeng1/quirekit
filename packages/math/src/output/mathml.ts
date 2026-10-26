import type { MathDocument, MathExpression } from '../model/types';
import type { MathOutputOptions } from './types';

import { escapeXml } from './xml';
import { mathSlotChildren } from '../visual/slots';
import { renderMathStructure } from './structure';
import { mathSwitchBefore, styledByMathSwitch } from './families';
/**
 * Projects one admitted expression to Presentation MathML without source rewriting.
 * @param expression - Complete supported expression.
 * @param placeholders - Whether empty arguments are visible in a template preview.
 * @returns Structural MathML markup.
 */
function expressionMarkup(expression: MathExpression, placeholders: boolean): string {
  if (expression.kind === 'sequence') {
    const { children } = expression;
    if (!children.length) return `<mrow>${placeholders ? '<mtext>□</mtext>' : ''}</mrow>`;
    return `<mrow>${children.map((child, index) => styledByMathSwitch(mathSwitchBefore(children, index), expressionMarkup(child, placeholders))).join('')}</mrow>`;
  }
  const roles = mathSlotChildren(expression);
  return renderMathStructure(expression, role => expressionMarkup(roles.find(item => item.role === role)!.expression, placeholders));
}
/**
 * Produces native browser MathML; the caller owns CSS theme and host geometry.
 * @param document - Valid supported formula document.
 * @param options - Explicit presentation mode.
 * @returns Standalone MathML markup with an accessible source label.
 */
export function renderMathML(document: MathDocument, options: MathOutputOptions = {}): string {
  const display = options.display === 'block' ? 'block' : 'inline';
  return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="${display}" aria-label="${escapeXml(document.latex)}">${expressionMarkup(document.root, options.placeholders === true)}</math>`;
}
