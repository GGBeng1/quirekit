# @quirekit/render-contract

English | [简体中文](./README.zh-CN.md)

Neutral TypeScript data contracts for Quire Render, licensed under [MIT](./LICENSE.md).
This type-only package has no runtime dependencies, layout algorithms, or drawing
implementation. Use it independently for custom backends, font resources, and file adapters.

```ts
import type { QuireDisplayList, QuireFontServiceSource } from "@quirekit/render-contract";

const scene: QuireDisplayList = {
  bounds: { x: 0, y: 0, width: 120, height: 40 },
  commands: [{
    id: "background",
    kind: "fill-rect",
    rect: { x: 0, y: 0, width: 120, height: 40 },
    fillStyle: "#eef2ff"
  }]
};
```

Domains include geometry, document, display-list, font, overlay, and surface.
Render coordinates retain CSS-pixel semantics; document ranges are numeric metadata.
Hosts and backends own font loading, DOM mounting, and unit conversion.

Install `@quirekit/renderer` separately for `qkView`, Canvas/SVG backends, or geometry
algorithms; it is also MIT. This package does not depend on Renderer or bring in its
implementation.
Renderer still re-exports these types for existing consumers.

This is a alpha developer preview, not a claim of public release or stable APIs.
Run `pnpm render:preview` in the repository to generate local packages, an independent
example, and rebuildable source. With a standalone source package and Node 22, run
`npm install --ignore-scripts` and `npm run build`; a standalone `tsconfig.json` is included.
