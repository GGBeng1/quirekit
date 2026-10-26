# @quirekit/view-engine

[English](./README.md) | 简体中文

保存文档排版后的位置信息，用来查找鼠标指向的内容、定位光标和计算选区。 **这是内部实现包，接口可能随版本变化。**

## 使用方式

正常接入请使用 `@quirekit/view` 或 Classic。该包单独发布是为了让这些公开包可以正常安装；维护底层实现时再直接使用。

## 使用时注意

- 排版和字体设置应通过所属产品的配置入口传入，避免应用依赖内部结构。

## 相关说明

- [文档视图](../view/README.zh-CN.md)
- [Classic 编辑器](../classic-editor/README.zh-CN.md)

## 许可

[AGPL-3.0-only](./LICENSE.md)；第三方声明见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
