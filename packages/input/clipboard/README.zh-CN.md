# @quirekit/clipboard

QuireKit editor views 共用的 renderer-neutral 富文本 clipboard helpers。

[English](./README.md)

## 目标

`@quirekit/clipboard` 负责 editor/schema-aware 的 clipboard 转换逻辑，这套逻辑应被
Canvas、SVG、HTML 以及未来自定义 view 共享：

- QuireKit 私有 slice MIME 序列化；
- HTML 序列化与语义化 HTML 解析；
- pasted HTML sanitizer；
- 纯文本 fallback 解析；
- PM/Tiptap-compatible clipboard hooks，例如 `transformCopied`、
  `transformPastedHTML`、`clipboardTextSerializer` 和 `handlePaste`。

Mounted views 应该只把浏览器 clipboard events 适配给这个包，不应该在每种 renderer
里重新实现富文本 copy/paste 行为。

## 基础用法

```ts
import {
  pasteQuireClipboardSlice,
  readQuireClipboardSlice,
  writeQuireClipboardSelection
} from "@quirekit/clipboard";

function onCopy(editor, clipboardData) {
  const written = writeQuireClipboardSelection({ editor, clipboardData });

  return written;
}

function onPaste(editor, event) {
  const slice = readQuireClipboardSlice({
    editor,
    clipboardData: event.clipboardData
  });

  if (!slice) {
    return false;
  }

  return pasteQuireClipboardSlice(editor, slice, event);
}
```

## HTML Helpers

```ts
import {
  parseQuireClipboardHtml,
  serializeQuireClipboardHtml,
  sanitizeQuireClipboardHtml
} from "@quirekit/clipboard";
```

- `serializeQuireClipboardHtml()` 在有 DOM document 时使用 PM `DOMSerializer`，
  否则回退到确定性的字符串 serializer。
- `parseQuireClipboardHtml()` 会先运行 extension HTML transforms，再 sanitize
  payload，随后尝试 PM DOM parsing；在无 DOM runtime 下会回退到小型语义化 parser。
- `sanitizeQuireClipboardHtml()` 会在解析前移除 active content、不安全的 inline
  event handler 和 script URL。

## 结构化 Selection

自定义 ProseMirror selection 可以通过实现 `serializeClipboard()` 提供更丰富的 copy
formats。通用 writer 会先使用这份 payload，再回退到 `selection.content()`；这样
structural selections 可以保留内部 slice，同时提供更适合外部目标的 `text/plain` 与
`text/html` fallback。

```ts
class TableSelection extends Selection {
  serializeClipboard() {
    return {
      slice: tableSlice,
      plainText: "A\tB",
      html: "<table><tbody><tr><td>A</td><td>B</td></tr></tbody></table>"
    };
  }
}
```

## 包边界

这个包可以依赖 `@quirekit/core` 与 `@quirekit/pm`，因为 clipboard 语义需要 editor
schema、selection、slice 和 extension prop chain。它不能依赖 Canvas、SVG、DOM
overlay、IME 或 mounted view 内部实现。
