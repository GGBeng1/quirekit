import { describe, expect, it } from 'vitest';
import { prepareBasicMarkdown } from './prepare';

const png = 'data:image/png;base64,iVBORw0KGgo=';
const word = { alerts: true, containers: true };

describe('MSFE 语法改写', () => {
  it('嵌套容器转为引用块，提示类容器带 GitHub 提示标记', () => {
    const { markdown, diagnostics } = prepareBasicMarkdown(':::: note 共同语言\n外层正文\n\n::: warning 发布前\n- 检查浏览器\n:::\n::::\n\n结尾', word);
    expect(markdown).toBe('> [!NOTE]\n> **共同语言**\n>\n> 外层正文\n>\n> > [!WARNING]\n> > **发布前**\n> >\n> > - 检查浏览器\n>\n\n\n结尾');
    expect(diagnostics.map(item => item.code)).toEqual(['container-quote', 'container-quote']);
  });

  it('PDF 不写提示标记，属性块不进入标题，关闭容器时保留原文', () => {
    expect(prepareBasicMarkdown('::: highlight {emoji=📌 color=purple}\n要点\n:::', { alerts: false, containers: true }).markdown).toBe('>\n> 要点\n');
    expect(prepareBasicMarkdown('::: note 标题\n正文\n:::', { alerts: true, containers: false }).markdown).toBe('::: note 标题\n正文\n:::');
  });

  it('嵌入对象用预览图或占位文字，文本图表保留源码', () => {
    const flow = JSON.stringify({ title: '系统架构', preview: { dataUrl: png, width: 1, height: 1 } });
    const { markdown, diagnostics } = prepareBasicMarkdown(['```quirekit-flowchart', flow, '```', '', '```quirekit-data-view', '{"title":"清单"}', '```', '', '```mermaid', 'graph TD; A-->B', '```'].join('\n'), word);
    expect(markdown).toBe(`![系统架构](${png})\n\n*[quirekit-data-view: 清单]*\n\n\`\`\`mermaid\ngraph TD; A-->B\n\`\`\``);
    expect(diagnostics.map(item => [item.code, item.disposition])).toEqual([['diagram-preview', 'approximated'], ['embed-placeholder', 'unsupported'], ['diagram-source', 'approximated']]);
  });

  it('文档属性保留为 YAML 代码，单波浪线下标保持原文，代码不改动', () => {
    const { markdown, diagnostics } = prepareBasicMarkdown('---\ntitle: 示例\n---\nH~2~O 与 ~~删除~~，`a~b~c`\n\n```\n::: note\n~x~\n```', word);
    expect(markdown).toBe('```yaml\ntitle: 示例\n```\nH\\~2\\~O 与 ~~删除~~，`a~b~c`\n\n```\n::: note\n~x~\n```');
    expect(diagnostics.map(item => item.code)).toEqual(['frontmatter-source', 'inline-source']);
  });
});
