# @quirekit/render-contract

[English](./README.md) | 简体中文

Quire Render 的中立 TypeScript 数据契约，采用 [MIT](./LICENSE.md) 许可。
仅包含类型，没有运行时依赖、布局算法或绘制实现，可独立用于自定义后端、字体资源服务和文件适配。

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

领域包括 geometry、document、display-list、font、overlay 和 surface。渲染坐标沿用
CSS px；文档范围只是数值元数据。字体加载、DOM 挂载和单位换算由对应宿主或后端负责。

使用 `qkView`、Canvas/SVG 后端或几何算法需要另行安装 `@quirekit/renderer`，该实现采用
AGPL-3.0-only，也可取得单独的商业授权。契约包不依赖 Renderer；使用本包不会自动引入其实现。
Renderer 为兼容旧代码仍转导出这些类型。

当前是 alpha 开发者预览，尚未宣称公开发布或稳定 API。仓库内运行 `pnpm render:preview`
可生成本地安装包、独立示例和可重建源码。单独取得源码包后，使用 Node 22，执行
`npm install --ignore-scripts` 和 `npm run build` 即可构建；本包自带独立 `tsconfig.json`。
