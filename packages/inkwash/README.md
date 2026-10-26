# @quirekit/inkwash

English | [简体中文](./README.zh-CN.md)

A 3D ink-wash background shared by QuireKit sites and products. A single WebGL2 renderer supports interchangeable scenes.

> **Alpha.** Published as `0.x` prereleases; the API may change before 1.0. MIT licensed. See [TASTE.md](TASTE.md) for visual guidelines.

## Installation

```bash
npm install @quirekit/inkwash
```

Install Vue 3.5 or newer when using `@quirekit/inkwash/vue`.

## What it does

- The shared renderer handles ink simulation, pointer ink and ripples, a clear area for foreground text, distant-to-near reveals, paper texture, theme colors, drag-to-orbit, still scenes and pausing when the page is hidden.
- Each scene decides what to draw: `mountains`, `architecture`, `clouds`, `waves`, `bamboo` and `plum`.

Without WebGL2 or floating-point render targets, `createInkWash` throws. The `<InkWash>` component leaves a blank canvas so the application's paper background remains visible.

## Vue

```vue
<script setup lang="ts">
import { mountains } from '@quirekit/inkwash'
import { InkWash } from '@quirekit/inkwash/vue'
</script>

<template>
  <InkWash :scene="mountains" orbit="drag" :clearing="{ center: [0.42, 0.36], radius: [0.5, 0.34] }" />
</template>

<style scoped>
/* Paper uses the background color; ink uses the text color. Reveal after the first frame to avoid a black flash. */
.ink-wash { width: 100%; height: 100%; background: var(--paper); color: var(--ink); opacity: 0; transition: opacity .6s; }
.ink-wash[data-ready] { opacity: 1; }
</style>
```

Mount on the client; in Nuxt, use `.client.vue` or `<ClientOnly>`. Colors are reread when system appearance changes or an attribute listed by `themeAttributes` changes. The default attributes are `data-qk-scheme`, `data-theme` and `class`.

| Property | Meaning |
| --- | --- |
| `scene` | Required scene |
| `orbit` | `fixed` keeps the camera still; `drag` lets users rotate it by dragging empty space |
| `ambient` | On by default; disabling scene animation reuses cached artwork while drag and pointer ink still work |
| `frozen` | Vue property: renders one fully revealed still frame, suitable for thumbnails |
| `still` | Disables pointer interaction and stops after the ink reveal, suitable for footer banners |
| `clearing` | Space for foreground content: center in 0–1 canvas coordinates and radii relative to canvas height |
| `eye` | Camera height; increasing it lowers the subject in the image |

## Without a framework

The application supplies the `canvas` element and its colors.

```ts
import { createInkWash, mountains, resolveCssColor } from '@quirekit/inkwash'

const style = getComputedStyle(canvas)
const controller = createInkWash(canvas, {
  scene: mountains,
  palette: { paper: resolveCssColor(style.backgroundColor), ink: resolveCssColor(style.color) },
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  orbit: 'fixed',
})
// Theme changes: controller.setPalette(...); unmount: controller.destroy()
```

## Adding a scene

Implement `InkScene`:

1. `glsl` declares scene-specific uniforms and implements `vec3 paintScene(vec2 uv, float aspect, float clearing, vec3 color)`. Use the renderer's `uTime`, `uReveal`, `uPaper`, `uInk`, `valueNoise` and `fbm`. Do not redeclare these uniforms or add a second fluid ink or paper-texture pass.
2. `create(gl)` owns GPU state for one canvas. Optional `prepare(gl, view, seconds)` updates cached textures before a scene refresh; the renderer then restores its target and program. `bind` runs before each scene draw and binds textures starting at the supplied unit. `dispose` releases resources.
3. `defaultEye` and `orbit` set the initial camera height and permitted rotation.

Scenes that only need a camera can reuse `viewGlsl` and `viewOnlyInstance()` from `scenes/shared/view.ts`. They provide `uAngle`, `uEye`, `orbitView()` and `orbitFacing()`.

For distant mountains, include `backdropGlsl` from `scenes/shared/backdrop.ts`. Call `paintMountains(uv, aspect, clearing, color, nearest, ink)` at the start of `paintScene`; `nearest` excludes closer mountains and `ink` controls ink density. Return `backdropInstance(gl, extra)` from `create`, binding scene-specific uniforms in `extra`. `scenes/shared/atmosphere.ts` also provides `distantRidge()` and `mistBand()`.

Place the scene in `src/scenes/<name>/`, export it from `src/scenes/index.ts` and record its product use in [TASTE.md](TASTE.md).

## Performance and cleanup

- Dragging, animation and pointer ink follow browser refresh without a fixed FPS cap. When the GPU is busy, old frames are not queued; the next frame uses the latest pointer position.
- Scene caches and ink are composed separately. Mountains reuse ridge, outline and mist data for each column. Paper texture is created at output size once; theme changes only update colors.
- Scene rendering is limited to 1280×720, final composition to 1920×1080, and the longest edge to 2560. Work does not grow without limit on 4K, high-DPR or ultrawide screens. Slow GPUs can reduce scene sampling while application DOM remains sharp.
- The fluid grid is independent of screen size. It sleeps after ink dissipates. Hidden, offscreen or zero-sized canvases do not draw; resuming checks size and DPR.
- `fixed` only fixes the camera. `ambient=false` disables scene animation. `still` stops after reveal and disables the pointer. Reduced-motion preferences and `frozen` show the complete still scene immediately.
- Vue watches theme attributes on the canvas and its ancestors, not unrelated components' class changes.
- `data-ready` is set after the first successful frame. Unsupported WebGL or a lost context leaves the application's paper color visible.

## License

[MIT](./LICENSE.md)
