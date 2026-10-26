# @quirekit/inkwash

[English](./README.md) | 简体中文

QuireKit 站点与产品共用的 3D 水墨背景：一条 WebGL2 管线，加上可替换的“题材”。

> **Alpha。** 以 `0.x` 预发布版本发布，1.0 之前 API 可能变化。按 MIT 许可开源。风格规则见 [TASTE.md](TASTE.md)。

## 安装

```bash
npm install @quirekit/inkwash
```

使用 `@quirekit/inkwash/vue` 时需另装 Vue 3.5 及以上版本。

## 它做什么

- **管线**（所有题材共用）：墨水流体模拟、指针洇墨与水波、留白区、远先近后的显影动画、纸纹、主题配色、拖动环转视角、静景模式、页面隐藏时暂停。
- **题材**：只回答“这一像素画什么”。目前有 `mountains`（山水）、`architecture`（界画宫城）、`clouds`（云海）、`waves`（海水江崖）、`bamboo`（竹）和 `plum`（梅）。

不支持 WebGL2 或浮点渲染目标时，`createInkWash` 会抛错，`<InkWash>` 组件则保持空白画布，由宿主的纸色兜底。

## 在 Vue 中使用

```vue
<script setup lang="ts">
import { mountains } from '@quirekit/inkwash'
import { InkWash } from '@quirekit/inkwash/vue'
</script>

<template>
  <InkWash :scene="mountains" orbit="drag" :clearing="{ center: [0.42, 0.36], radius: [0.5, 0.34] }" />
</template>

<style scoped>
/* 纸色取画布背景，墨色取文字颜色；首帧绘出后才出现，避免闪黑。 */
.ink-wash { width: 100%; height: 100%; background: var(--paper); color: var(--ink); opacity: 0; transition: opacity .6s; }
.ink-wash[data-ready] { opacity: 1; }
</style>
```

组件在客户端挂载（Nuxt 中放进 `.client.vue` 或 `<ClientOnly>`）。主题切换时，`themeAttributes` 列出的属性（默认 `data-qk-scheme`、`data-theme`、`class`）变化或系统明暗变化后，会重新读取配色。

| 属性 | 说明 |
| --- | --- |
| `scene` | 题材，必填 |
| `orbit` | `fixed` 固定视角；`drag` 在空白处按住拖动时环转 |
| `ambient` | 默认开启；关闭主体环境动画后复用题材缓存，仍响应拖动和指针墨迹 |
| `frozen` | Vue 属性：只画一帧完整静景，用于缩略图 |
| `still` | 静景：不响应指针，墨色洇开后停止渲染，适合页尾横幅 |
| `clearing` | 为标题等前景保留的留白区：中心（0–1 画面坐标）与半径（以画面高度为单位） |
| `eye` | 视点高度；抬高后画面主体下沉 |

## 不用框架

```ts
import { createInkWash, mountains, resolveCssColor } from '@quirekit/inkwash'

const style = getComputedStyle(canvas)
const controller = createInkWash(canvas, {
  scene: mountains,
  palette: { paper: resolveCssColor(style.backgroundColor), ink: resolveCssColor(style.color) },
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  orbit: 'fixed',
})
// 主题变化：controller.setPalette(...)；卸载：controller.destroy()
```

## 新增一个题材

题材实现 `InkScene`：

1. `glsl`：声明题材自己的 uniform，并实现
   `vec3 paintScene(vec2 uv, float aspect, float clearing, vec3 color)`。
   可以直接使用管线提供的 `uTime`、`uReveal`、`uPaper`、`uInk` 和 `valueNoise`、`fbm`。
   不要在这里重复声明管线的 uniform，也不要叠加流体墨迹或纸纹，它们由管线统一处理。
2. `create(gl)`：创建题材在一张画布上的 GPU 状态。可选 `prepare(gl, view, seconds)`
   在题材刷新前准备缓存纹理；管线随后恢复绘制目标与程序。`bind` 在每次题材绘制前调用，
   从传入的纹理单元开始绑定自己的纹理；`dispose` 释放资源。
3. `defaultEye` 与 `orbit`：默认视点高度和拖动环转的范围。

只需要视点的题材可以引入 `scenes/shared/view.ts` 的 `viewGlsl`（提供 `uAngle`、`uEye`、
`orbitView()`、`orbitFacing()`）和 `viewOnlyInstance()`，不必自己管理 GPU 状态。

需要远山作背景的题材引入 `scenes/shared/backdrop.ts`：在 `glsl` 中拼上 `backdropGlsl`，
`paintScene` 开头调用 `paintMountains(uv, aspect, clearing, color, nearest, ink)`
（`nearest` 以内的近山不画，`ink` 控制整体墨量），`create` 返回 `backdropInstance(gl, extra)`，
自己的 uniform 在 `extra` 里绑定。`scenes/shared/atmosphere.ts` 另提供远山淡影 `distantRidge()`
与流动雾带 `mistBand()`。

放在 `src/scenes/<名称>/`，从 `src/scenes/index.ts` 导出，并在 [TASTE.md](TASTE.md) 登记题材与对应的产品线。

## 性能与生命周期

- 拖动、环境动画和墨痕跟随浏览器刷新，不设置固定 FPS 上限。GPU 忙时不继续积压旧帧，
  下一次只消费最新指针位置。
- 题材缓存与墨迹分开合成；山水和远山复用每列的山脊、勾线与雾线结果。
  纸纹按输出尺寸生成一次，主题切换只更新配色。
- 题材像素量不超过 1280×720，最终合成不超过 1920×1080，最长边不超过 2560；
  不随 4K、高 DPR 或超宽屏无限增大。慢 GPU 可以自动降低题材采样精度，宿主 DOM 保持清晰。
- 流体网格与屏幕分辨率独立。没有墨迹时不模拟，充分消散后清空休眠。
  页面隐藏、画布离屏或零尺寸时不绘制；恢复时检查尺寸与 DPR。
- `fixed` 只固定镜头，默认仍有云雾和墨迹；`ambient=false` 关闭环境动画；
  `still` 在显影后停止并禁用指针；系统减少动态效果或 `frozen` 直接显示完整静景。
- Vue 仅观察画布和祖先的主题属性，不因页面其他组件的 class 变化重画背景。
  首次绘制成功才设置 `data-ready`；不支持 WebGL 或上下文丢失时由宿主纸色兜底。

## 许可

[MIT](./LICENSE.md)
