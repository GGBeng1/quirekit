import type { MathExpression } from '../model/types';
import { mathOperatorCommands } from '../latex/commands';
import { accentMarkup, delimiterMarkup, fenced, fractionMarkup, matrixMarkup, scripted, styledMarkup, symbolMarkup, textMarkup } from './families';
import type { MathSlotMarkup } from './families';
import { escapeXml } from './xml';

/**
 * Shares structural MathML between display and editing; callers own slot projection.
 * @param expression - Complete admitted structure.
 * @param slot - Renders one named editable role in the caller's projection.
 * @returns Safe structural MathML.
 */
export function renderMathStructure(expression: MathExpression, slot: MathSlotMarkup): string {
  switch (expression.kind) {
    case 'sequence': return slot('group');
    case 'symbol': return symbolMarkup(expression);
    case 'fraction': return fractionMarkup(expression, slot);
    case 'radical': {
      // The presentation box owns font-driven spacing, keeping editable slot bounds intact.
      const base = `<mrow data-math-radicand="true">${slot('radicand')}</mrow>`;
      return expression.degree ? `<mroot>${base}${slot('degree')}</mroot>` : `<msqrt>${base}</msqrt>`;
    }
    case 'scripts': {
      const stacked = expression.base.kind === 'styled' && expression.base.name === 'operatorname*';
      return scripted(slot('base'), expression.subscript ? slot('subscript') : '', expression.superscript ? slot('superscript') : '', stacked);
    }
    case 'operator': {
      const glyph = mathOperatorCommands[expression.name][0];
      const named = /^[a-z]/iu.test(glyph);
      const base = named ? `<mi mathvariant="normal">${escapeXml(glyph)}</mi>` : `<mo largeop="true" movablelimits="false">${glyph}</mo>`;
      const limits = scripted(base, expression.lower ? slot('lower') : '', expression.upper ? slot('upper') : '', expression.placement === 'above-below');
      // A named operator is an identifier in MathML; TeX still separates it from its operand.
      const gap = expression.body || named ? '<mspace width="0.1667em"/>' : '';
      return `<mrow>${limits}${gap}${expression.body ? slot('body') : ''}</mrow>`;
    }
    case 'function': {
      const name = `<mi mathvariant="normal">${expression.name}</mi>`;
      const scripts = scripted(name, expression.subscript ? slot('subscript') : '', expression.superscript ? slot('superscript') : '');
      return `<mrow>${scripts}<mo>&#x2061;</mo>${expression.argument ? `<mspace width="0.1667em"/>${slot('argument')}` : ''}</mrow>`;
    }
    case 'fence': return fenced(slot('content'), expression.open, expression.close);
    case 'accent': return accentMarkup(expression, slot);
    case 'matrix': return matrixMarkup(expression, slot);
    case 'styled': return styledMarkup(expression, slot);
    case 'text': return textMarkup(expression, slot);
    case 'space': return `<mspace width="${Number(expression.width.toFixed(4))}em"/>`;
    case 'delimiter': return delimiterMarkup(expression.value, expression.size);
    case 'switch': return '';
    case 'marker': {
      if (expression.command !== 'tag' && expression.command !== 'tag*') return '';
      const text = expression.command === 'tag' ? `(${expression.text ?? ''})` : expression.text ?? '';
      return `<mspace width="1em"/><mtext>${escapeXml(text)}</mtext>`;
    }
  }
}
