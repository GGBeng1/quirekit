# @quirekit/math-omml

English | [简体中文](./README.zh-CN.md)

Converts LaTeX formulas to and from Word's OMML formula format. Output follows Word's own LaTeX input form, so supported formulas open as native, editable Word equations. Works in browsers and Node without an editor, DOM or DOCX library.

It converts formulas, not complete LaTeX documents.

```ts
import { latexToOmml } from "@quirekit/math-omml";

const result = latexToOmml("x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}", { display: true });
if (result.ok) {
  result.xml;    // <m:oMathPara xmlns:m="…">…</m:oMathPara>; can be placed inside w:p
  result.losses; // Approximations for syntax Word cannot represent, such as "negative-space"
} else {
  result.diagnostic; // Unsupported source and its location; no partial result is returned
}
```

- `latexToOmml(latex, { display })` returns XML, order-preserving XML elements and a list of conversion losses.
- `ommlToLatex(element)` returns LaTeX only when encoding it again reproduces the formula exactly. Otherwise it returns a reason in Chinese, such as unsupported left-side scripts, without a partial result.
- `encodeMathOmml(document, display)` encodes a parsed `@quirekit/math` document.
- `serializeOmml(element, { namespaces })` serializes order-preserving XML elements.
- `ommlToMathML(element)` converts OMML for display, including structures that cannot be converted back to LaTeX. Unknown structures appear as placeholder boxes and are listed in `approximations`.
- `canonicalOmml` / `sameOmml` / `ommlFingerprint` compare formula meaning, ignoring routine formatting changes, split runs and default-valued attributes introduced by Word when saving.

See [`@quirekit/math`](../math/README.md) for supported LaTeX syntax.

## License

[MIT](./LICENSE.md)
