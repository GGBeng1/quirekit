# @quirekit/ofd

[English](./README.md) | 简体中文

独立的 OFD 文件生成工具，可在浏览器和 Node.js 中使用。它负责写出文件，不依赖 QuireKit 编辑器、渲染器、DOM、文件系统或网络。

## 创建文件

下面创建一张 A4 页面并写入文字。调用方先提供 `fontBytes`，它是覆盖这些字符的字体文件字节。

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

`save()` 返回 `Uint8Array`。你可以在 Node 中保存到磁盘，在浏览器中转为 `Blob` 下载，也可以上传或交给其他工具。

## 坐标、字体和文件结构

- 坐标和页面尺寸使用毫米。
- 文字需要明确的位置。一个 `TextCode` 包含多个字符时需要 `DeltaX` 或 `DeltaY`，避免阅读器把字符画在同一处。
- 未提供 `codes` 时，`drawText()` 用 `fontkit` 从字体字节计算字符间距。连字、从右向左文字、竖排等复杂情况可以使用 `createOFDTextCode()` 和明确的文字布局。
- 字体和图片字节由调用方提供；本包不会扫描系统字体或抓取 URL。
- `fflate` 负责 ZIP，`@noble/hashes` 生成资源的 SHA-256 标识，`fontkit` 提供字体度量。
- XML、包路径、ID 和引用顺序由本包按 OFD 格式要求生成。
- 签名、时间戳和加密通过可替换接口接入，私钥和远程服务由应用管理。

把已经排好版的 QuireKit 文档导出为 OFD，请使用 [`@quirekit/ofd-renderer`](../ofd-renderer/README.zh-CN.md)。

## 许可

[MIT](./LICENSE.md)
