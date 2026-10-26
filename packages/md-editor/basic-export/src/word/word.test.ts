import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import type { MdDocxRequest } from '@quirekit/md-editor';
import { mdBasicDocx } from './converter';

/** @param policy - Conversion policy. @returns One explicit file operation. */
const request = (policy: MdDocxRequest['policy'] = {}): MdDocxRequest => ({ policy, features: {}, signal: new AbortController().signal });

const source = `# 周报

正文 **粗体**，公式 $x^2$。[^a]

::: note 提示
- 第一项
- 第二项
:::

| 项目 | 状态 |
| --- | --- |
| 导出 | 完成 |

\`\`\`mermaid
graph TD; A-->B
\`\`\`

[^a]: 脚注内容。
`;

describe('基础 Word 转换', () => {
  it('导出真实 DOCX：原生表格、公式、脚注和提示块，降级逐项报告', async () => {
    const result = await mdBasicDocx().exportDocx(source, request({ template: {} }));
    const xml = await (await JSZip.loadAsync(result.data)).file('word/document.xml')!.async('string');
    expect(xml).toContain('<w:tbl>');
    expect(xml).toContain('m:oMath');
    expect(xml).toContain('w:footnoteReference');
    expect(xml).toContain('第一项');
    expect(xml).not.toContain(':::');
    expect(result.diagnostics.map(item => item.code)).toEqual(expect.arrayContaining(['container-quote', 'diagram-source', 'template-ignored']));
  });

  it('导入 Word 另存件：保留标题、表格和列表，被丢弃的原生公式进入报告', async () => {
    const data = new Uint8Array(readFileSync(new URL('./fixtures/word-16.109.2-resaved.docx', import.meta.url)));
    const imported = await mdBasicDocx().importDocx(data, request());
    expect(imported.markdown).toContain('# 周报');
    expect(imported.markdown).toContain('## 小节');
    expect(imported.markdown).toMatch(/\|\s*\*\*项目\*\*\s*\|\s*\*\*状态\*\*\s*\|\n\| --- \| --- \|\n\|\s*导出\s*\|\s*完成\s*\|/u);
    expect(imported.markdown).toMatch(/- {1,3}第一项/u);
    expect(imported.diagnostics.some(item => item.code === 'math-unavailable')).toBe(true);
  });

  it('严格模式拒绝任何近似，取消后不返回结果', async () => {
    await expect(mdBasicDocx().exportDocx(source, request({ lossPolicy: 'strict' }))).rejects.toThrow(/Strict export/u);
    const controller = new AbortController();
    controller.abort();
    await expect(mdBasicDocx().exportDocx('正文', { policy: {}, features: {}, signal: controller.signal })).rejects.toThrow();
  });
});
