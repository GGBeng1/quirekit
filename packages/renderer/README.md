# Quire Render · @quirekit/renderer

English | [简体中文](./README.zh-CN.md)

**Quire Render** is QuireKit's unified rendering engine, with its core in
`@quirekit/renderer`. It implements geometry algorithms, component compilation,
and Canvas 2D/SVG backends. Neutral types come from the MIT
`@quirekit/render-contract` package and remain re-exported for compatibility.
It does not depend on ProseMirror, `@quirekit/core`,
editor state, IME, or clipboard code.

Use it when you want to describe visual output once and paint it through Canvas
2D or SVG. QuireKit's editor views depend on this package, but the package can
also render standalone UI.

## Terminology and Output Layers

- **`qkView`**: the entry point for declarative component composition and local layout.
- **Quire Display List**: the drawing protocol, still exposed as `QuireDisplayList`.
- **Render Backend**: an implementation that consumes drawing commands; this package provides Canvas 2D and SVG.

The optional `@quirekit/pdf` and `@quirekit/ofd-renderer` packages consume the
same drawing protocol with their respective page export plans. Callers provide
fonts, images, and format-specific semantics explicitly. Document pagination
belongs to Layout/View Engine, while DOCX uses semantic conversion and OOXML
compilation. Interactive `qkView` controls and DOM overlays do not automatically
appear in files. Each backend's support and loss policies are verified separately.
See the [Quire Render architecture](../../docs/architecture/quire-render.zh-CN.md)
for the full layering contract (Chinese authority).

## What It Owns

```text
@quirekit/renderer
  core    geometry/range/display-list algorithms, paint dispatch, contract re-exports
  canvas  Canvas 2D painting backend
  svg     SVG serialization and live-DOM sync backend
  widget  qkView declarative UI factories and compiler
```

The package does not own document layout, hit testing, selection mapping,
mounted editor lifecycles, keyboard input, IME, clipboard, or transactions.
Those editor concerns belong to `@quirekit/view` and `@quirekit/core`.

## License

This package uses the standard [AGPL-3.0-only](./LICENSE.md), with a separate
commercial licensing option. AGPL-compliant use includes commercial use. Closed-source
products and hosted services can instead use it under the QuireKit commercial license
with a paid agreement (section 7 of the QuireKit commercial license). No commercial restriction is added to the AGPL text.
Third-party code retains its [upstream notices](./THIRD_PARTY_NOTICES.md), and
this change does not revoke previously granted MIT rights.

For geometry, drawing, font, or surface types alone, use the MIT
`@quirekit/render-contract`. Official PDF/OFD adapters and premium templates
are licensed separately and are not included here.

## Install

This is a alpha developer preview. Run `pnpm render:preview` in the repository
to produce packages, an independent example, lockfiles, and rebuildable source
under `outputs/quire-render-preview/`. The command installs and verifies Canvas/SVG
output outside the repository without publishing anything.

A standalone `tsconfig.json` is included. With Node 22 and pnpm 10, run
`pnpm install --frozen-lockfile --ignore-scripts`, `pnpm run build`, and `pnpm test`
in the preview’s `source` directory; no QuireKit
checkout is needed. Once published, installation will use the package name:

```sh
pnpm add @quirekit/renderer
```

## Example: Paint A Display List To Canvas

Use raw display lists when you already know the exact commands you want to
paint. `bounds` is the area cleared before painting.

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

When a display list contains `glyph-run` commands, Canvas output uses whole-run
native `fillText` fallback by default. For diagnostics, you can pass
`createCanvasClusterGlyphRunPainter()` as `glyphRunPainter` to draw source text
clusters at shaped offsets. This is an opt-in bridge for validating shaped
placement; it is not a full glyph-id or glyph-outline backend.

For exact paint experiments, pass `createCanvasPathGlyphRunPainter(source)`.
The `source` resolves `{ glyphId, fontId?, fontFamily? }` to glyph-local
CSS-pixel path segments. The painter only takes over runs whose
`glyphCoverage` is `"complete"`; partial coverage, missing outlines, or missing
Canvas path APIs return to the native `fillText` fallback, so this can be wired
before the final font registry and glyph cache are complete.

QuireKit's mounted editor keeps native whole-run text paint as the default
Canvas strategy. `createCanvasClusterGlyphRunPainter()` and
`createCanvasPathGlyphRunPainter()` are opt-in adapter hooks: the cluster painter
still uses `fillText` on source-cluster slices, and the path painter must return
to native `fillText` whenever the command or runtime cannot prove complete glyph
path coverage. The playground Canvas Text Paint Diff labels each row with the
actual route; HTML editor output is not part of that Canvas diff because it uses
browser DOM layout and paint rather than renderer display-list adapters.

## Example: Serialize Or Sync SVG

Canvas and SVG consume the same display-list data. Serialization is useful for
snapshots or exports; live sync is useful for mounted browser views.

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

## Example: Build UI With qkView

`qkView` is the declarative layer above raw commands. It is the recommended
authoring shape for small renderer-neutral UI such as callout chrome, badges,
comment anchors, and extension-owned controls.

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

// compiled.domOverlays contains DOM overlay descriptors for the caller to mount.
```

`compileQuireViewNode()` also returns `targets`, a list of resolved interaction
targets. A mounted Canvas/SVG/HTML surface can hit-test those targets and ask a
scope to dispatch the declared event binding. When `path` is passed, dispatch
runs from the deepest target to outer targets; `event.target` stays fixed and
`event.currentTarget` changes per target.

`event.host` exposes the host surface owned by the current scope. Canvas mounted
views can put their `HTMLCanvasElement` there, while SVG/HTML modes can expose
their own root surface. Keep host objects out of `QuireViewNode` specs so nodes
stay reusable and serializable.

For callbacks that run while compiling widgets, pass the same host to
`compileQuireViewNode({ host })` and read it from `runtime.host`, for example in
`qkView.customPaint({ paint(rect, id, runtime) { ... } })`.

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

// A mounted surface owns browser events and renderer-space point conversion.
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

Use `createQuireViewTargetIndex()` when you need compact hit-test records for
event dispatch. Use `createQuireViewWidgetIndex()` when application code wants a
DOM-like object model with stable `parent`, `children`, `ancestors`, `host`, and
geometry helper methods:

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

`QuireViewWidget` is a renderer widget object, not a ProseMirror widget
decoration. Use optional `owner` metadata when a target should remember that it
was produced by a document node, mark, decoration, extension, or standalone
widget family.

## Example: Text Overflow And Wrapping

Use `qkView.paragraphPreview` for non-editable text inside custom UI. It is not
the editable document paragraph renderer; it is a static preview primitive for
callouts, cards, comments, badges, and inspector-like widgets.

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

## Which API Should I Use?

- Use raw `QuireDisplayList` commands when another system already resolved
  geometry and paint commands.
- Use `qkView.surface`, `qkView.flex`, `qkView.overlay`, and related factories
  when you want a stable authoring API for compact custom UI.
- Use `qkView.paragraphPreview` for wrapped or ellipsized static text inside
  widget chrome.
- Use Canvas helpers to paint to `CanvasRenderingContext2D`.
- Use SVG helpers to produce deterministic markup or update a live `<svg>`.

## API Reference

See [API.md](./API.md) for the public API grouped by core data, Canvas output,
SVG output, and qkView widgets.

## Stability

This package is still experimental. Prefer imports from the package root:

```ts
import { qkView, renderCanvasDisplayList } from "@quirekit/renderer";
```

Subpath imports are not public yet. The root exports are the compatibility
surface QuireKit will preserve first.
