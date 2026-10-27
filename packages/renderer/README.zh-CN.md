# Quire Render · @quirekit/renderer

[English](./README.md) | 简体中文

**Quire Render** 是 QuireKit 的统一渲染引擎，`@quirekit/renderer` 承载其核心。
它实现几何算法、组件编译及 Canvas 2D/SVG 后端，中立类型来自 MIT 的
`@quirekit/render-contract` 并保持兼容转导出。它不依赖 ProseMirror、
`@quirekit/core`、编辑器状态、IME 或剪贴板代码。

当你希望用同一份描述同时输出到 Canvas 2D 或 SVG 时，就可以使用它。QuireKit 的编辑器视图会依赖这个包，
但这个包本身也可以独立渲染普通 UI。

## 名称与输出层次

- **`qkView`**：声明式组件组合及局部布局入口。
- **Quire Display List**：绘制协议，公开类型仍为 `QuireDisplayList`。
- **Render Backend**：消费绘制指令的输出实现，本包提供 Canvas 2D 和 SVG。

可选 `@quirekit/pdf` 与 `@quirekit/ofd-renderer` 消费同一绘制协议及各自页面导出计划，
字体、图片和格式特有语义由调用方显式提供。文档分页属于 Layout/View Engine，DOCX 则由
语义转换和 OOXML 编译生成；`qkView` 的交互控件和 DOM overlay 不会自动进入文件。
各后端支持范围与损失策略分别验证。完整分层见
[Quire Render 架构](../../docs/architecture/quire-render.zh-CN.md)。

## 它负责什么 What It Owns

```text
@quirekit/renderer
  core    几何/范围/显示列表算法、绘制分派与中立类型转导出
  canvas  Canvas 2D 绘制后端
  svg     SVG 序列化与真实 DOM 同步后端
  widget  qkView 声明式 UI 工厂与编译器
```

这个包不负责文档排版、命中测试、选区映射、已挂载编辑器生命周期、键盘输入、IME、剪贴板或事务。
这些编辑器职责属于 `@quirekit/view` 和 `@quirekit/core`。

## 许可

[MIT](./LICENSE.md)；第三方代码继续遵循随包的[上游声明](./THIRD_PARTY_NOTICES.md)。

仅需几何、绘制、字体或绘制表面类型时，可以直接使用 MIT 的 `@quirekit/render-contract`。
官方 PDF/OFD 适配和精品模板另行授权，不包含在本包中。

## 安装 Install

当前是 alpha 开发者预览。仓库内运行 `pnpm render:preview`，会在
`outputs/quire-render-preview/` 生成实际安装包、独立示例、锁文件与可重建源码。
它会在仓库外安装并验证 Canvas/SVG 输出，不执行公开发布。

源码包自带独立 `tsconfig.json`；预览中的 `source` 目录可用 Node 22 和 pnpm 10 执行
`pnpm install --frozen-lockfile --ignore-scripts`、`pnpm run build` 和 `pnpm test`，无需 QuireKit 仓库。
对外发布后，可以通过包名安装：

```sh
pnpm add @quirekit/renderer
```

## 示例：把显示列表绘制到 Canvas

当你已经知道要绘制哪些底层命令时，可以直接使用 display list。`bounds` 表示绘制前要清理的区域。

```ts
import {
  renderCanvasDisplayList,
  type QuireDisplayList
} from "@quirekit/renderer";

const displayList: QuireDisplayList = {
  bounds: { x: 0, y: 0, width: 280, height: 96 },
  commands: [
    {
      id: "surface",
      kind: "fill-rect",
      rect: { x: 0, y: 0, width: 280, height: 96 },
      fillStyle: "#f8fafc"
    },
    {
      id: "title",
      kind: "text",
      rect: { x: 16, y: 18, width: 180, height: 24 },
      origin: { x: 16, y: 38 },
      text: "Hello renderer",
      font: "600 16px system-ui",
      fillStyle: "#172033"
    }
  ]
};

const canvas = document.querySelector("canvas");
const context = canvas?.getContext("2d");

if (context) {
  renderCanvasDisplayList({ displayList, target: context });
}
```

当 display list 中包含 `glyph-run` 命令时，Canvas 输出默认仍使用整段原生
`fillText` fallback。诊断时可以把 `createCanvasClusterGlyphRunPainter()` 作为
`glyphRunPainter` 传入，把源文本 cluster 绘制到 shaped offset 上。这只是验证 shaped
placement 的可选过渡桥，不是完整的 glyph-id 或 glyph-outline backend。

如果要做 exact paint 实验，可以传入 `createCanvasPathGlyphRunPainter(source)`。
`source` 会把 `{ glyphId, fontId?, fontFamily? }` 解析成 glyph-local CSS-pixel
path segments。这个 painter 只会接管 `glyphCoverage` 为 `"complete"` 的 run；coverage
partial、缺少 outline 或缺少 Canvas path API 时都会回落到原生 `fillText`，因此它可以先于
最终 font registry 和 glyph cache 接入。

QuireKit 已挂载编辑器的默认 Canvas 策略仍然是整段原生文本绘制。
`createCanvasClusterGlyphRunPainter()` 和 `createCanvasPathGlyphRunPainter()` 都是可选
adapter hook：cluster painter 仍然是在 source cluster 切片上调用 `fillText`，path painter
在 command 或 runtime 无法证明完整 glyph path coverage 时必须回到 native `fillText`。
playground 的 Canvas Text Paint Diff 会给每一行标注实际路径；HTML editor 输出不参与这个
Canvas diff，因为它走浏览器 DOM layout 与 paint，而不是 renderer display-list adapter。

## 示例：序列化或同步 SVG

Canvas 和 SVG 消费同一份 display-list 数据。序列化适合快照和导出；真实 DOM 同步适合浏览器中已挂载的视图。

```ts
import {
  serializeSvgDisplayListToSvg,
  syncSvgDisplayListToSvg,
  type QuireDisplayList
} from "@quirekit/renderer";

const displayList: QuireDisplayList = {
  bounds: { x: 0, y: 0, width: 180, height: 48 },
  commands: [
    {
      id: "label",
      kind: "text",
      rect: { x: 8, y: 8, width: 140, height: 24 },
      origin: { x: 8, y: 28 },
      text: "SVG output",
      font: "14px system-ui",
      fillStyle: "#172033"
    }
  ]
};

const markup = serializeSvgDisplayListToSvg({ displayList });
const host = document.querySelector("svg");

if (host) {
  syncSvgDisplayListToSvg({ host, displayList });
}
```

## 示例：用 qkView 构建 UI

`qkView` 是 raw commands 之上的声明式层。它适合编写 callout 外框、徽标、批注锚点，以及 extension 自己拥有的紧凑控件。

```ts
import {
  compileQuireViewNode,
  createQuireViewContextKey,
  createQuireViewScope,
  createQuireViewTargetIndex,
  createQuireViewWidgetIndex,
  qkView,
  renderCanvasDisplayList
} from "@quirekit/renderer";

const compiled = compileQuireViewNode({
  id: "callout",
  origin: { x: 0, y: 0 },
  constraints: {
    minWidth: 0,
    maxWidth: 360,
    minHeight: 0,
    maxHeight: 120
  },
  node: qkView.surface({
    width: 360,
    height: 88,
    padding: qkView.insets(12),
    style: {
      fill: "#f8fafc",
      stroke: { color: "#cbd5e1", width: 1 }
    },
    child: qkView.flex({
      direction: "row",
      gap: 12,
      children: [
        qkView.divider({
          axis: "vertical",
          height: 48,
          style: { color: "#0f8b8d", width: 4 }
        }),
        qkView.column({
          gap: 4,
          children: [
            qkView.text({
              text: "renderCanvas block",
              style: { font: "700 14px system-ui", color: "#172033" }
            }),
            qkView.paragraphPreview({
              text: "One tree can target Canvas and SVG, with controlled text overflow.",
              width: 180,
              maxLines: 1,
              overflow: "ellipsis",
              whiteSpace: "nowrap",
              style: { font: "13px system-ui", color: "#475569", lineHeight: 20 }
            })
          ]
        }),
        qkView.spacer({ flex: 1 }),
        qkView.domOverlay({
          width: 112,
          height: 32,
          html: "<button>DOM overlay</button>",
          ariaLabel: "Open callout actions"
        })
      ]
    })
  })
});

const context = document.querySelector("canvas")?.getContext("2d");

if (context) {
  renderCanvasDisplayList({ displayList: compiled.displayList, target: context });
}

// compiled.domOverlays 中包含调用方需要挂载的 DOM overlay 描述。
```

`compileQuireViewNode()` 还会返回 `targets`，也就是已解析的交互目标列表。已挂载的 Canvas/SVG/HTML
surface 可以命中这些 targets，然后让 scope 派发节点声明的事件绑定。

`event.host` 会暴露当前 scope 拥有的 host surface。Canvas mounted view 可以把自己的
`HTMLCanvasElement` 放进去，SVG/HTML mode 可以暴露各自的 root surface。Host object 不应放进
`QuireViewNode` spec，这样 node 才能保持可复用、可序列化。

对于编译 widget 时运行的 callbacks，可以把同一个 host 传给 `compileQuireViewNode({ host })`，然后在
`runtime.host` 中读取，例如 `qkView.customPaint({ paint(rect, id, runtime) { ... } })`。

```ts
declare const canvasElement: HTMLCanvasElement;

const OpenKey = createQuireViewContextKey<(id: string) => void>("open");
const scope = createQuireViewScope({
  host: {
    kind: "canvas",
    surface: canvasElement
  }
});

scope.provide(OpenKey, id => console.log("open", id));
scope.registerEventHandler("detail.open", event => {
  console.log("host", event.host?.kind);
  event.require(OpenKey)(event.target?.id ?? "");
});

const compiled = compileQuireViewNode({
  id: "button",
  origin: { x: 0, y: 0 },
  constraints: { minWidth: 0, maxWidth: 160, minHeight: 0, maxHeight: 48 },
  node: qkView.surface({
    id: "doc-1",
    role: "button",
    onClick: "detail.open",
    child: qkView.text({ text: "Open document" })
  })
});

// 已挂载 surface 拥有浏览器事件监听和 renderer-space 点位转换。
const targetIndex = createQuireViewTargetIndex(compiled.targets);
const hit = targetIndex.hitTest({ x: 12, y: 12 });

if (hit) {
  scope.dispatchViewEvent({
    type: "click",
    point: hit.point,
    target: hit.target,
    path: hit.path
  });
}
```

需要紧凑 hit-test records 并交给 scope 派发事件时，用 `createQuireViewTargetIndex()`。
如果应用代码想拿到更接近 DOM 的对象模型，例如稳定的 `parent`、`children`、`ancestors`、`host`
和几何 helper methods，则使用 `createQuireViewWidgetIndex()`：

```ts
const widgetIndex = createQuireViewWidgetIndex(compiled.targets, {
  getHost: () => scope.getHost()
});

const widget = widgetIndex.hitTest({ x: 12, y: 12 })?.widget;

if (widget?.role === "button") {
  console.log(widget.id, widget.parent?.id, widget.owner?.kind, widget.host?.kind);
  scope.dispatchViewEvent({
    type: "click",
    target: widget.target,
    path: widget.targetPath
  });
}
```

`QuireViewWidget` 是 renderer widget object，不是 ProseMirror widget decoration。
当一个 target 需要记住自己来自 document node、mark、decoration、extension 或独立 widget family 时，
使用可选 `owner` metadata。

传入 `path` 时，dispatch 会从最深 target 向外层 target 依次执行；`event.target` 始终保持为最初命中的 target，
`event.currentTarget` 会随当前 target 变化。

## 示例：文本省略与自动换行

在 custom UI 内部展示不可编辑文本时，使用 `qkView.paragraphPreview`。它不是可编辑文档段落渲染器，而是给
callout、card、comment、badge、inspector-like widget 使用的静态预览 primitive。

```ts
qkView.paragraphPreview({
  text: "Long callout body that should end with an ellipsis.",
  width: 180,
  maxLines: 1,
  overflow: "ellipsis",
  whiteSpace: "nowrap",
  style: { font: "13px system-ui", color: "#475569", lineHeight: 20 }
});

qkView.paragraphPreview({
  text: "Long callout body that should wrap across multiple visual lines.",
  width: 180,
  overflow: "visible",
  style: { font: "13px system-ui", color: "#475569", lineHeight: 20 }
});
```

## 我应该用哪个 API

- 已经有几何和绘制命令时，直接使用 raw `QuireDisplayList`。
- 想用稳定的书写方式构建紧凑自定义 UI 时，使用 `qkView.surface`、`qkView.flex`、`qkView.overlay` 等工厂。
- 在 widget chrome 内部展示需要自动换行或省略号的静态文本时，使用 `qkView.paragraphPreview`。
- 需要绘制到 `CanvasRenderingContext2D` 时，使用 Canvas helpers。
- 需要确定性 SVG 字符串或同步真实 `<svg>` 时，使用 SVG helpers。

## API 参考

公共 API 按核心数据、Canvas 输出、SVG 输出和 qkView 组件分组记录在
[API.zh-CN.md](./API.zh-CN.md)。

## 稳定性 Stability

这个包仍处于实验阶段。优先从 package root 导入：

```ts
import { qkView, renderCanvasDisplayList } from "@quirekit/renderer";
```

当前不承诺 subpath imports 的稳定性。QuireKit 会优先维护根导出的兼容性。
