# QuireKit

[中文](README.zh-CN.md)

QuireKit is a family of document editing packages: a Tiptap-compatible editor core built on
ProseMirror, the MSFE source-first Markdown editor framework, a streaming Markdown reader,
diagram and formula editors, and a shared UI component library.

> **Status: alpha.** Packages are published as `0.x` pre-releases. APIs may change between
> versions until 1.0.

## Packages

| Area | Packages |
| --- | --- |
| Editor core | `@quirekit/core`, `@quirekit/starter-kit`, `@quirekit/extension-*`, `@quirekit/pm-*` |
| Markdown source editor (MSFE) | `@quirekit/msfe-core`, `@quirekit/msfe-vue`, `@quirekit/msfe-react`, `@quirekit/msfe-starter-kit`, `@quirekit/msfe-*` |
| Streaming Markdown reader | `@quirekit/incremark-core`, `@quirekit/incremark`, `@quirekit/incremark-react` |
| Diagrams | `@quirekit/flowchart`, `@quirekit/flowchart-x6`, `@quirekit/mind-map`, `@quirekit/mind-map-simple`, `@quirekit/whiteboard`, `@quirekit/whiteboard-excalidraw`, `@quirekit/text-diagram`, `@quirekit/chart` |
| Formulas | `@quirekit/math`, `@quirekit/math-ui`, `@quirekit/math-omml`, `@quirekit/math-mathjax` |
| UI | `@quirekit/ui`, `@quirekit/unocss-preset` |
| Code editing | `@quirekit/cm-*`, `@quirekit/lezer-markdown` |

Packages whose README marks them as internal are dependencies of the packages above and carry
no API guarantee.

## Licensing

Packages in this repository use one of two licenses; each package's `LICENSE.md` is
authoritative:

- **MIT**: the editor core, extensions, MSFE, MD Editor, diagram and formula editors, data view, the AI contract, UI and
  more, free for any project.
- **AGPL-3.0-only**: the Canvas layout engine (`renderer`, `layout`, `view-engine`, `view` and
  related packages) and the Classic and Block editor shells. Distributing them in closed-source
  products (including shipping them to browsers), or offering a modified version as a network
  service, can be done under a QuireKit commercial license instead, without AGPL obligations, as
  section 7 of
  [`licenses/QuireKit-Commercial.md`](licenses/QuireKit-Commercial.md) describes.

Vendored ProseMirror, CodeMirror and Lezer packages keep their upstream license files, and
third-party notices ship with every package in `THIRD_PARTY_NOTICES.md`.

QuireKit also offers separately licensed components (DOCX import and export, Word document
features, PDF and OFD export, the AI runtime and assistants, and more). They are not part of this repository.

## Development

Requires Node 22 and pnpm 10.

```bash
pnpm install
pnpm build
pnpm test
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). All contributions require accepting the [CLA](CLA.md).
