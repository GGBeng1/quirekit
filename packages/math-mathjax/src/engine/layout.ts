import { mathjax } from '@mathjax/src/js/mathjax.js';
import { MathML } from '@mathjax/src/js/input/mathml.js';
import { SVG } from '@mathjax/src/js/output/svg.js';
import { liteAdaptor } from '@mathjax/src/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from '@mathjax/src/js/handlers/html.js';
import type { LiteElement } from '@mathjax/src/js/adaptors/lite/Element.js';
import type { LiteText } from '@mathjax/src/js/adaptors/lite/Text.js';
import type { LiteDocument } from '@mathjax/src/js/adaptors/lite/Document.js';
import type { MathDocument, MathFormulaLayout } from '@quirekit/math';
import type { FormulaElement, FormulaWrapper } from './types';
import { LocalMathFont } from './font';
import { formulaSlots } from '../geometry/slots';
import { annotateFormulaText } from './text';

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

/** Captures the exact placed wrapper tree without copying any engine algorithms. */
class FormulaSvg extends SVG<LiteElement, LiteText, LiteDocument> {
  /** Wrapper ownership is released immediately after serialization. */
  root: FormulaWrapper | undefined;
  /**
   * Observes completed SVG placement for renderer-neutral hit geometry.
   * @param wrapper - Engine-owned mathematical layout tree.
   * @param parent - Isolated output container.
   */
  override processMath(wrapper: FormulaWrapper, parent: FormulaElement): void {
    super.processMath(wrapper, parent);
    this.root = wrapper;
  }
}

/**
 * Checks whether a fallback text glyph belongs to an `mtext` token.
 * @param node - SVG `text` element.
 * @param svg - Root SVG element.
 * @returns Whether an ancestor group renders `mtext`.
 */
function insideText(node: LiteElement, svg: LiteElement): boolean {
  for (let current: LiteElement | null = adaptor.parent(node); current && current !== svg; current = adaptor.parent(current)) {
    if (adaptor.getAttribute(current, 'data-mml-node') === 'mtext') return true;
  }
  return false;
}

/**
 * Creates a private engine; its caller serializes conversions and owns cache lifetime.
 * @returns Formula conversion using local font modules and fixed SVG output.
 */
export function createFormulaEngine() {
  const output = new FormulaSvg({ fontCache: 'none', fontData: LocalMathFont, linebreaks: { inline: false } });
  const engine = mathjax.document('', { InputJax: new MathML({ allowHtmlInTokenNodes: false }), OutputJax: output });
  /**
   * Produces one atomic graphic and logical editing snapshot.
   * @param markup - Controlled MathML from the admitted core or a trusted converter.
   * @param document - Source and structural ownership matching the markup, or the accessible label of read-only markup.
   * @param editable - Whether to expose authoring slots; requires a document.
   * @returns Immutable SVG and em metrics.
   */
  async function layout(markup: string, document: MathDocument | string, editable: boolean): Promise<MathFormulaLayout> {
    try {
      const container = await engine.convertPromise(markup, { em: 16, ex: 8, containerWidth: 1_000_000 });
      const svg = adaptor.tags(container, 'svg')[0];
      const root = output.root;
      // Prose text may fall back to a system font; a mathematical token missing from the math font may not.
      const missing = svg && adaptor.tags(svg, 'text').some(text => !insideText(text, svg));
      if (!svg || !root || missing || adaptor.tags(svg, 'g').some(group => adaptor.getAttribute(group, 'data-mml-node') === 'merror')) {
        throw new Error('Formula cannot be rendered with the supported mathematical font');
      }
      const [, top, width, height] = adaptor.getAttribute(svg, 'viewBox').split(/\s+/u).map(Number);
      if (![top, width, height].every(Number.isFinite)) throw new Error('Invalid formula layout metrics');
      const slots = editable && typeof document !== "string" ? formulaSlots(root, svg, adaptor, document) : Object.freeze([]);
      annotateFormulaText(root, adaptor);
      // MathJax normally supplies this glyph stroke through its container stylesheet.
      // Resolve it here so standalone SVGs preserve the backend's actual visual output.
      for (const path of adaptor.tags(svg, 'path')) if (adaptor.getAttribute(path, 'data-c')) adaptor.setAttribute(path, 'stroke-width', String(output.options.blacker));
      adaptor.setAttribute(svg, 'width', `${width! / 1000}em`);
      adaptor.setAttribute(svg, 'height', `${height! / 1000}em`);
      // An editable graphic is labelled by its input; the cached layout must not carry one source's text.
      if (editable) adaptor.setAttribute(svg, 'aria-hidden', 'true');
      else adaptor.setAttribute(svg, 'aria-label', typeof document === "string" ? document : document.latex);
      adaptor.setAttribute(svg, 'data-math-renderer', 'mathjax');
      adaptor.removeAttribute(svg, 'style');
      return Object.freeze({ svg: adaptor.outerHTML(svg), width: width! / 1000, height: height! / 1000, baseline: -top! / 1000, slots });
    } finally { output.root = undefined; }
  }
  return layout;
}
