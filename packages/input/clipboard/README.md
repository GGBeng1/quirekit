# @quirekit/clipboard

Renderer-neutral rich clipboard helpers for QuireKit editor views.

[简体中文](./README.zh-CN.md)

## Purpose

`@quirekit/clipboard` owns editor/schema-aware clipboard conversion that should
be shared by Canvas, SVG, HTML, and future custom views:

- private QuireKit slice MIME serialization;
- HTML serialization and semantic HTML parsing;
- sanitizer for pasted HTML;
- plain-text fallback parsing;
- PM/Tiptap-compatible clipboard hooks such as `transformCopied`,
  `transformPastedHTML`, `clipboardTextSerializer`, and `handlePaste`.

Mounted views should adapt browser clipboard events to this package. They should
not reimplement rich copy/paste behavior per renderer.

## Basic Usage

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

- `serializeQuireClipboardHtml()` uses PM `DOMSerializer` when a DOM document
  is available, and falls back to a deterministic string serializer otherwise.
- `parseQuireClipboardHtml()` runs extension HTML transforms, sanitizes the
  payload, tries PM DOM parsing, and falls back to a small semantic parser for
  non-DOM runtimes.
- `sanitizeQuireClipboardHtml()` removes active content and unsafe inline
  event/script URLs before parsing.

## Structural Selections

Custom ProseMirror selections can provide richer copy formats by implementing
`serializeClipboard()`. The generic writer uses that payload before falling back
to `selection.content()`, which lets structural selections keep their internal
slice while supplying purpose-built `text/plain` and `text/html` fallbacks.

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

## Package Boundary

This package may depend on `@quirekit/core` and `@quirekit/pm` because clipboard
semantics require the editor schema, selection, slice, and extension prop chain.
It must not depend on Canvas, SVG, DOM overlay, IME, or mounted view internals.
