# @quirekit/math

[English](./README.md) | 简体中文

独立的 headless 公式编辑工具。核心提供精确 LaTeX、结构光标与选择、147 个模板、
双语搜索、局部历史和宿主提交生命周期；无需 Vue 或 QuireKit 文档编辑器。

```ts
import { createMathEditor } from '@quirekit/math'

const editor = createMathEditor({ latex: '' })
const stop = editor.subscribe(snapshot => console.log(snapshot.draft))
editor.chooseCommand('fraction')
editor.insertText('a')
editor.move('next')
editor.insertText('b')
stop()
editor.destroy()
```

`getSnapshot()` / `subscribe()` 可接入任意框架的状态容器。`@quirekit/math/browser`
提供可选的原生 IME、指针和数值 overlay 绑定；`@quirekit/math-mathjax` 是可替换的
SVG 排版后端，`@quirekit/math-ui` 是 Vue 界面实现。应用拥有自己的控件、外观和持久化。

完整接入说明见 QuireKit Design 的 `/components/math-editor` 页面，仓库源文档为
[`apps/design/docs/components/math-editor/index.zh-CN.md`](../../apps/design/docs/components/math-editor/index.zh-CN.md)。

## 许可

[MIT](./LICENSE.md)
