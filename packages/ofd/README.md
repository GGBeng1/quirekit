# `@quirekit/ofd`

English | [简体中文](./README.zh-CN.md)

A standalone, write-first OFD authoring library for browsers and Node.js. It
does not depend on QuireKit's editor, renderer, DOM, filesystem, or network
runtime.

The application supplies `fontBytes`, containing a font that covers the text below.

```ts
import { OFDDocument } from "@quirekit/ofd";

const document = OFDDocument.create({
  metadata: {
    title: "Example",
    creator: "My application"
  }
});
const font = document.embedFont(fontBytes, {
  fontName: "Noto Sans CJK SC"
});
const page = document.addPage({ width: 210, height: 297 });

page.drawText("你好 OFD", {
  boundary: { x: 20, y: 20, width: 80, height: 8 },
  font,
  size: 5,
  origin: { x: 0, y: 5 }
});

const ofdBytes = await document.save();
```

The writer returns a `Uint8Array`, so the same API can be saved with Node.js,
downloaded as a browser `Blob`, uploaded, or passed to another package.

## Design

- OFD coordinates and page dimensions use millimetres.
- Text placement is explicit. Multi-codepoint `TextCode` values require
  `DeltaX` or `DeltaY` so native readers do not collapse glyphs.
- `drawText()` uses `fontkit` to derive varied code-point advances from
  embedded font bytes when `codes` are omitted. `createOFDTextCode()` and
  explicit shaped placement remain available for ligatures, RTL, vertical
  text, and other complex runs.
- Font and image bytes are supplied by the caller. The package never scans
  installed fonts or fetches URLs.
- ZIP assembly uses `fflate`; stable SHA-256 resource identities use
  `@noble/hashes`; embedded-font metrics use `fontkit`.
- XML, package paths, IDs, and OFD reference ordering remain writer-owned
  because they are standard invariants rather than generic utility work.
- Optional signing, timestamp, and encryption operations are represented by
  provider contracts so private keys and remote services stay application-owned.

QuireKit display-list export lives separately in `@quirekit/ofd-renderer`.

## License

[MIT](./LICENSE.md)
