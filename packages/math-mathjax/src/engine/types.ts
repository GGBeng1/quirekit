import type { LiteElement } from '@mathjax/src/js/adaptors/lite/Element.js';
import type { LiteText } from '@mathjax/src/js/adaptors/lite/Text.js';
import type { LiteDocument } from '@mathjax/src/js/adaptors/lite/Document.js';
import type { SvgWrapper } from '@mathjax/src/js/output/svg/Wrapper.js';
import type { LiteAdaptor } from '@mathjax/src/js/adaptors/liteAdaptor.js';

/** Pinned engine wrapper; never exposed through the public package contract. */
export type FormulaWrapper = SvgWrapper<LiteElement, LiteText, LiteDocument>;
/** Isolated minimal DOM implementation used for Node and browser output. */
export type FormulaAdaptor = LiteAdaptor;
/** Engine SVG element, independent of a mounted document. */
export type FormulaElement = LiteElement;
