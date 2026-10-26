import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import { quireProseComponents, QuireProseH2, QuireProsePre, QuireProseP } from "./index";

const markdownTags = ['a', 'blockquote', 'pre', 'code', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'img', 'ul', 'li', 'ol', 'p', 'strong', 'em', 'table', 'tbody', 'td', 'th', 'thead', 'tr'];

describe('public Prose elements', () => {
  it('provides component objects for the full Markdown element set', () => {
    expect(Object.keys(quireProseComponents)).toEqual(expect.arrayContaining(markdownTags));
    expect(Object.isFrozen(quireProseComponents)).toBe(true);
    expect(quireProseComponents.p).toBe(QuireProseP);
    expect(quireProseComponents).not.toHaveProperty('script');
  });

  it('renders every mapped tag without adding a wrapper, except the table scroll frame, and forwards native attributes', async () => {
    for (const [tag, component] of Object.entries(quireProseComponents)) {
      const props = { class: 'consumer', 'data-item': tag, ...(tag === 'img' ? { src: '/guide.svg', alt: '协作流程' } : {}) };
      const html = await renderToString(createSSRApp({ render: () => h(component, props, () => '内容') }));
      expect(html, tag).toMatch(new RegExp(tag === 'table' ? '^<div class="qk-prose-table" tabindex="0"><table\\b' : `^<${tag}\\b`));
      expect(html, tag).toContain('qk-prose-node');
      expect(html, tag).toContain('consumer');
      expect(html, tag).toContain(`data-item="${tag}"`);
      if (!['img', 'hr', 'br'].includes(tag)) expect(html).toContain('内容');
    }
  });

  it('preserves heading IDs and permits disabling the permalink', async () => {
    for (const anchor of [true, false]) {
      const html = await renderToString(createSSRApp({ render: () => h(QuireProseH2, { id: '项目 & 计划', anchor, 'aria-describedby': 'intro' }, () => '季度计划') }));
      expect(html).toContain('id="项目 &amp; 计划"');
      expect(html).toContain('aria-describedby="intro"');
      if (anchor) expect(html).toContain(`href="#${encodeURIComponent('项目 & 计划')}"`);
      else expect(html).not.toContain('<a');
    }
  });

  it('preserves code text and renderer slots without serializing parser metadata', async () => {
    const code = '<img src="x">\n  value\n';
    const plain = await renderToString(createSSRApp({ render: () => h(QuireProsePre, { code, language: 'html', filename: 'sample.html', highlights: [2], meta: 'preview' }) }));
    expect(plain).toContain('&lt;img src=&quot;x&quot;&gt;\n  value\n');
    expect(plain).not.toMatch(/\s(?:code|language|filename|highlights|meta)=/u);
    expect(plain).toContain('aria-label="sample.html"');
    const rich = await renderToString(createSSRApp({ render: () => h(QuireProsePre, { code }, () => h(quireProseComponents.code, {}, () => h('span', { class: 'line' }, '高亮内容'))) }));
    expect(rich.match(/<pre\b/gu)).toHaveLength(1);
    expect(rich.match(/<code\b/gu)).toHaveLength(1);
    expect(rich).toContain('<span class="line">高亮内容</span>');
  });

  it('lets a consumer override one renderer while retaining the defaults', async () => {
    const components = { ...quireProseComponents, a: 'button' };
    const html = await renderToString(createSSRApp({ render: () => h(components.p, {}, () => [h(components.strong, {}, () => '说明'), h(components.a, { type: 'button' }, '操作')]) }));
    expect(html).toMatch(/^<p\b/u);
    expect(html).toContain('<strong class="qk-prose-node">');
    expect(html).toContain('<button type="button">操作</button>');
    expect(quireProseComponents.a).not.toBe('button');
  });

  it('keeps native list, table, and paragraph-image nesting with their attributes', async () => {
    const c = quireProseComponents;
    const html = await renderToString(createSSRApp({ render: () => h('article', {}, [
      h(c.ol, { start: 3, reversed: true }, () => h(c.li, { value: 7 }, () => '最后一项')),
      h(c.table, {}, () => [h(c.caption, {}, () => '安排'), h(c.tbody, {}, () => h(c.tr, {}, () => h(c.th, { colspan: 2, scope: 'row' }, () => '阶段')))]),
      h(c.p, {}, () => h(c.img, { src: '/guide.svg', alt: '流程图', width: 640, height: 120 }))
    ]) }));
    expect(html).toContain('start="3"');
    expect(html).toContain('reversed');
    expect(html).toContain('value="7"');
    expect(html).toContain('colspan="2"');
    expect(html).toContain('scope="row"');
    expect(html).toContain('alt="流程图"');
    expect(html.match(/<div/gu)).toHaveLength(1);
    expect(html).toMatch(/<div class="qk-prose-table" tabindex="0"><table class="qk-prose-node">(<!--\[-->)?<caption/u);
  });

  it('keeps table attributes on the table and lets the frame own scrolling focus', async () => {
    const html = await renderToString(createSSRApp({ render: () => h(quireProseComponents.table, { id: 'plan', 'aria-label': '安排' }, () => h(quireProseComponents.tbody)) }));
    expect(html).toMatch(/^<div class="qk-prose-table" tabindex="0"><table id="plan" aria-label="安排" class="qk-prose-node">/u);
    expect(html.match(/tabindex/gu)).toHaveLength(1);
  });
});
