import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mdBasicPdfExport } from './exporter';

const fonts = {
  regular: new Uint8Array(readFileSync('../../font-pack/dist/pdf/fonts/NotoSansHans-Regular.otf')),
  bold: new Uint8Array(readFileSync('../../font-pack/dist/pdf/fonts/NotoSansHans-Bold.otf')),
};
const context = { ownerDocument: undefined as unknown as Document, signal: new AbortController().signal };
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('基础 PDF 导出', () => {
  it('生成真实 PDF 字节，内嵌中文字体，公式、脚注、容器与斜体逐项报告', async () => {
    const markdown = `# 方案\n\n中文与 *English*，公式 $x^2$。[^a]\n\n::: tip 提示\n- [x] 完成\n:::\n\n$$\nE=mc^2\n$$\n\n| 项目 | 状态 |\n| --- | --- |\n| 导出 | 完成 |\n\n![示意](data:image/png;base64,${png})\n\n![远程](https://example.com/a.png)\n\n[^a]: 脚注。\n`;
    const exporter = mdBasicPdfExport({ fonts });
    const result = await exporter.export(markdown, { policy: { template: {} }, features: {}, signal: context.signal }, context);
    const text = new TextDecoder('latin1').decode(result.data);
    expect(text.startsWith('%PDF-')).toBe(true);
    expect(text).toMatch(/NotoSansHans|SourceHanSans/u);
    expect(text).toContain('/Subtype /Image');
    expect(result.pageCount).toBe(1);
    expect(new Set(result.diagnostics.map(item => item.code))).toEqual(new Set(['container-quote', 'template-ignored', 'pdf-italic', 'math-unavailable', 'footnote-flattened', 'image-unavailable']));
    expect(exporter.describeDiagnostic?.('pdf-italic', 'zh-CN')).toContain('斜体');
  });
});
