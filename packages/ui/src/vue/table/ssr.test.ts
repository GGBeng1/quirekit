import { createSSRApp, createVNode, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import Table from "./table.vue";
import QuireLocaleProvider from "../locale-provider/locale-provider.vue";
const rows = [{ id: "a", n: 12 }, { id: "b", n: 2 }];
const columns = [{ id: "n", title: "Size", field: "n", compare: (a: typeof rows[number], b: typeof rows[number]) => a.n - b.n }];
describe("Table server rendering", () => {
  it("renders local ordering, named selection and only the active aria-sort before hydration", async () => {
    const app = createSSRApp({ render: () => createVNode(Table, {
      rows, columns, rowKey: "id", selectable: true, sortingMode: "local",
      defaultSorting: { columnId: "n", direction: "asc" }, defaultSelectedKeys: ["b"],
      rowLabel: (row: typeof rows[number]) => `Record ${row.id}`
    }) });
    const html = await renderToString(app);
    expect(html).toContain('aria-sort="ascending"');
    expect(html.indexOf('data-row-key="b"')).toBeLessThan(html.indexOf('data-row-key="a"'));
    expect(html).toContain('data-row-key="b" data-selected');
    expect(html).toContain('选择 Record b');
    expect(html.match(/type="checkbox"/g)).toHaveLength(3);
    expect(html).not.toContain('aria-selected');
  });
  it("keeps custom headers outside the default sort button", async () => {
    const app = createSSRApp({ render: () => createVNode(Table, { rows, columns, rowKey: "id" }, {
      'header-n': () => h('button', { type: 'button' }, 'Custom sorting')
    }) });
    const html = await renderToString(app);
    expect(html.match(/<button /g)).toHaveLength(1);
    expect(html).toContain('Custom sorting');
  });
  it("spans the selection column in empty state and disables page selection", async () => {
    const app = createSSRApp({ render: () => createVNode(Table, { rows: [], columns, rowKey: "id", selectable: true }) });
    const html = await renderToString(app);
    expect(html).toContain('colspan="2"');
    expect(html).toMatch(/<input[^>]*disabled[^>]*type="checkbox"|<input[^>]*type="checkbox"[^>]*disabled/);
    expect(html).toContain('qk-empty-state--sm');
    expect(html).toContain('data-illustration="table"');
    expect(html).toContain('暂无数据');
  });
  it("lets an empty slot replace the default illustration and explain a failed request", async () => {
    const app = createSSRApp({ render: () => createVNode(Table, {
      rows: [], columns, rowKey: "id"
    }, {
      empty: () => h('p', { role: 'alert' }, '数据加载失败，请稍后重试')
    }) });
    const html = await renderToString(app);
    expect(html).toContain('<p role="alert">数据加载失败，请稍后重试</p>');
    expect(html).not.toContain('qk-empty-state');
    expect(html).not.toContain('暂无数据');
  });
  it.each([
    { name: 'first load', currentRows: [], showsPlaceholder: true },
    { name: 'refresh', currentRows: rows, showsPlaceholder: false }
  ])("keeps the empty state out of $name", async ({ currentRows, showsPlaceholder }) => {
    const app = createSSRApp({ render: () => createVNode(Table, {
      rows: currentRows, columns, rowKey: "id", loading: true
    }, {
      loading: () => h('p', '首次加载占位'),
      empty: () => h('p', '已确认空结果')
    }) });
    const html = await renderToString(app);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('role="status">正在加载…');
    expect(html.includes('首次加载占位')).toBe(showsPlaceholder);
    expect(html.includes('data-row-key="a"')).toBe(!showsPlaceholder);
    expect(html).not.toContain('qk-empty-state');
    expect(html).not.toContain('已确认空结果');
  });
  it("reads loading, empty and selection text from the active language", async () => {
    const app = createSSRApp({ render: () => h(QuireLocaleProvider, { locale: "en" }, () => [
      createVNode(Table, { rows: [], columns, rowKey: "id", selectable: true, loading: true }),
      createVNode(Table, { rows, columns, rowKey: "id", selectable: true, rowLabel: (row: typeof rows[number]) => `Record ${row.id}` }),
      createVNode(Table, { rows: [], columns, rowKey: "id" })
    ]) });
    const html = await renderToString(app);
    expect(html).toContain('role="status">Loading…');
    expect(html).toContain('Select all selectable rows on this page');
    expect(html).toContain('Select Record b');
    expect(html).toContain('No data');
    expect(html).toContain('Table · scroll area');
    expect(html).not.toMatch(/[\p{Script=Han}]/u);
  });
});
