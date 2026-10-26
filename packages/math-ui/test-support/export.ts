import { parseMathLatex } from '@quirekit/math';
import { createMathJaxRenderer, serializeMathSvg } from '@quirekit/math-mathjax';

/**
 * Exercises the public standalone export contract without sharing editable state.
 * @param source - Complete admitted source used by the browser fixture.
 * @returns Resolved graphic and pixel dimensions for image/Canvas consumers.
 */
export async function exportFormula(source: string) {
  const parsed = parseMathLatex(source);
  if (!parsed.ok) throw new Error(parsed.diagnostic.message);
  const renderer = createMathJaxRenderer();
  try {
    const layout = await renderer.render(parsed.document);
    return { svg: serializeMathSvg(layout, { fontSize: 48, color: '#1463ff' }), width: layout.width * 48, height: layout.height * 48 };
  } finally { renderer.dispose(); }
}
