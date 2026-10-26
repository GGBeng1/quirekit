# @quirekit/math

English | [简体中文](./README.zh-CN.md)

Formula editing without a UI dependency. Keeps exact LaTeX source, a cursor and selection within the formula, 147 templates, bilingual search and local undo history. It also lets an application accept or cancel an edit. No Vue or QuireKit document editor is required.

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

Connect `getSnapshot()` / `subscribe()` to any framework's state management. `@quirekit/math/browser` optionally connects browser input methods, pointer interaction and numeric overlays. `@quirekit/math-mathjax` provides a replaceable SVG layout backend, and `@quirekit/math-ui` provides a Vue interface. Your application owns controls, appearance and persistence.

The complete integration guide is on QuireKit Design at `/components/math-editor`. The Chinese source is [`apps/design/docs/components/math-editor/index.zh-CN.md`](../../apps/design/docs/components/math-editor/index.zh-CN.md).

## License

[MIT](./LICENSE.md)
