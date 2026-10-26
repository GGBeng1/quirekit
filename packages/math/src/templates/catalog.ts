import type { MathTemplate } from './types';
import { basicMathTemplates } from './families/basic';
import { operatorMathTemplates } from './families/operators';
import { functionMathTemplates } from './families/functions';
import { decorationMathTemplates } from './families/decorations';
import { matrixMathTemplates } from './matrix';
import { sequenceMathTemplates, commonMathTemplates } from './families/presets';

/** Structural templates; the marker is consumed by insertion, never persisted. */
export const mathTemplates: readonly MathTemplate[] = Object.freeze([
  ...basicMathTemplates, ...operatorMathTemplates, ...functionMathTemplates,
  ...decorationMathTemplates, ...matrixMathTemplates, ...sequenceMathTemplates, ...commonMathTemplates,
]);
