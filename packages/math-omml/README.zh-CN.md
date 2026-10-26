# @quirekit/math-omml

[English](./README.md) | 简体中文

在 LaTeX 公式与 Word 的 OMML 之间转换（DOCX 中公式的存储格式），输出形态与 Word 自身的 LaTeX
输入一致，因此在 Word 中打开即是原生、可继续编辑的公式。不依赖编辑器、DOM 或 DOCX 库，
可在浏览器与 Node 中使用。

只转换公式本身；整篇 LaTeX 文档到 DOCX 的转换不在本包范围内。

```ts
import { latexToOmml } from "@quirekit/math-omml";

const result = latexToOmml("x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}", { display: true });
if (result.ok) {
  result.xml;    // <m:oMathPara xmlns:m="…">…</m:oMathPara>，可放入 w:p
  result.losses; // Word 无法表达而被近似的写法，如 "negative-space"
} else {
  result.diagnostic; // 不受支持的源码及其位置；不会产生部分结果
}
```

- `latexToOmml(latex, { display })`：返回 XML 字符串、preserve-order 元素与损失清单。
- `ommlToLatex(element)`：严格反推。只有反推结果重新编码后与原公式完全一致才返回 LaTeX，
  否则返回中文原因（如“不支持左侧上下标”），不产生部分结果。
- `encodeMathOmml(document, display)`：从 `@quirekit/math` 解析结果编码。
- `serializeOmml(element, { namespaces })`：序列化 preserve-order 元素。
- `ommlToMathML(element)`：展示用转换，覆盖全部 OMML 结构（含无法转回 LaTeX 的写法），
  不认识的结构画为占位方框并在 `approximations` 中列出。
- `canonicalOmml` / `sameOmml` / `ommlFingerprint`：语义比较与内容指纹，忽略 Word 重新保存时的
  常态格式、run 拆分与等于默认值的属性。

支持的 LaTeX 语法见 `@quirekit/math`。

## 许可

[MIT](./LICENSE.md)
