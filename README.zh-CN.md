# QuireKit

[English](README.md)

QuireKit 是一组文档编辑包：基于 ProseMirror、兼容 Tiptap 的编辑内核，源码优先的 Markdown
编辑器框架 MSFE，流式 Markdown 阅读引擎，图表与公式编辑器，以及共享的 UI 组件库。

> **状态：alpha。** 包以 `0.x` 预发布版本发布，1.0 之前 API 可能变化。

## 包

| 方向 | 包 |
| --- | --- |
| 编辑内核 | `@quirekit/core`、`@quirekit/starter-kit`、`@quirekit/extension-*`、`@quirekit/pm-*` |
| Markdown 源码编辑器（MSFE） | `@quirekit/msfe-core`、`@quirekit/msfe-vue`、`@quirekit/msfe-react`、`@quirekit/msfe-starter-kit`、`@quirekit/msfe-*` |
| 流式 Markdown 阅读 | `@quirekit/incremark-core`、`@quirekit/incremark`、`@quirekit/incremark-react` |
| 图表 | `@quirekit/flowchart`、`@quirekit/flowchart-x6`、`@quirekit/mind-map`、`@quirekit/mind-map-simple`、`@quirekit/whiteboard`、`@quirekit/whiteboard-excalidraw`、`@quirekit/text-diagram`、`@quirekit/chart` |
| 公式 | `@quirekit/math`、`@quirekit/math-ui`、`@quirekit/math-omml`、`@quirekit/math-mathjax` |
| UI | `@quirekit/ui`、`@quirekit/unocss-preset` |
| 代码编辑 | `@quirekit/cm-*`、`@quirekit/lezer-markdown` |

README 标注为内部包的，是上面这些包的依赖，不承诺 API 稳定。

## 许可

本仓库的所有包均为 MIT，可自由用于任何项目，包括编辑内核、Canvas/SVG 排版引擎与视图、
Classic 与 Block 编辑器外壳、MSFE、MD Editor、图形与公式编辑器、多维表格和 UI。以各包内的
`LICENSE.md` 为准。Word 兼容能力（Word 语义、DOCX 往返、PDF/OFD 导出、审阅与公文模板）
作为 QuireKit 商业组件单独提供。

vendored 的 ProseMirror、CodeMirror 与 Lezer 包保留上游许可文件，第三方声明随每个包的
`THIRD_PARTY_NOTICES.md` 分发。

QuireKit 另有单独授权的组件（DOCX 导入导出、Word 文档能力、PDF 与 OFD 导出、AI 运行时与助手等），不在本仓库中。

## 开发

需要 Node 22 与 pnpm 10。

```bash
pnpm install
pnpm build
pnpm test
```

## 贡献

见 [CONTRIBUTING.md](CONTRIBUTING.md)。所有贡献都需要同意 [CLA](CLA.md)。
