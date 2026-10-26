import { getMathCommands, featuredMathCommandIds, mathCommandCategories, matchesMathCommand } from '@quirekit/math';
import type { FormulaCatalogItem } from './types';

/** The core owns discovery semantics; this adapter adds only gallery sizing hints. */
export const formulaChoices: readonly FormulaCatalogItem[] = getMathCommands().map(item => ({ ...item, wide: item.group === 'sequences' || item.group === 'common' }));
export { featuredMathCommandIds as featuredFormulaIds, mathCommandCategories as formulaGroups, matchesMathCommand as matchesFormula };
