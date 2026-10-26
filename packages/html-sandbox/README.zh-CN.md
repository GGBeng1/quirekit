# @quirekit/html-sandbox

[English](./README.md) | 简体中文

在浏览器的隔离 iframe 中运行 HTML 示例，不依赖 Vue、React 或编辑器。包已在仓库中实现；这不代表它已经发布到公开 npm。

## 开始使用

先准备一个有明确高度的 `#preview` 容器。下面的按钮会在隔离预览中执行自己的脚本。

```ts
import { createHtmlSandbox } from '@quirekit/html-sandbox/browser'

const sandbox = createHtmlSandbox({
  container: document.querySelector('#preview')!,
  source: { html: '<button onclick="this.textContent=1">Count</button>', complete: true, identity: 'document/block' },
  onEvent: event => console.log(event),
})
sandbox.run()
// 替换源码：sandbox.update({ html, complete, identity })
// 卸载：sandbox.destroy()
```

容器决定预览高度，运行器只管理自己的 iframe。`update()` 会把正在运行的内容标记为已修改；`run()` 用最新源码重新运行；`stop()` 销毁当前运行，并等待下一次手动 `run()`。`configure()` 的有效规则变化时也会结束旧运行。`destroy()` 可重复调用。

默认手动运行，也可以设置 `execution: 'on-complete'`。源码未完成或禁止执行时不能运行。Vue 界面可使用 `@quirekit/ui/vue/html-sandbox` 的 `QuireHtmlSandbox`，它带运行控件、源码、日志和高度控制。MSFE、Incremark 和 Block 的接入在各自的扩展包中。

## 隔离规则和限制

预览使用 `sandbox="allow-scripts"`，不开放同源访问。允许内联 JS/CSS、data 图片和字体；禁止远程脚本、fetch、eval、worker 和相对资源导入。输入最多 1 MiB UTF-8；每个已加载的运行器模块在同一页面最多运行 8 个实例，名额释放后可以手动重试。

日志最多保留 200 条，每条最多 4 KiB；每秒端口消息超过 300 条时结束该次运行。**这些是应用层限制，不能当作严格的 CPU、内存或网络隔离。** iframe 自行导航仍可能发出请求；运行器检测到导航后会终止它。不要向预览传入凭证、密钥或无关文档内容。

读取本地文件时，由应用执行 `const html = await file.text()` 并传入字符串，无需上传或为每份文档创建 URL。预览不会反写源码。`@quirekit/html-sandbox/markdown` 处理 `html-preview` 代码块：分隔用的换行不算正文，用户原有的结尾换行会保留。

父页面的 CSP 仍然有效，可能禁止内联脚本；Trusted Types 也可能拒绝赋值。运行器会报告失败，不会降低父页面限制或创建宽松的默认策略。

## 自行部署运行页面

构建生成 `dist/runner/runner.html`、脚本、第三方许可和 `_headers.template`。将它们一起部署到独立注册域名的 HTTPS 站点，不携带业务 cookie。把模板中的应用来源替换成实际的完整 origin，并在服务器上配置这些响应头。内层预览继承运行页面的 CSP；不要增加 `allow-same-origin` 或移除 sandbox。

```ts
import { defineHtmlSandboxConfig } from '@quirekit/html-sandbox'
const config = defineHtmlSandboxConfig({
  transport: { kind: 'hosted', runnerUrl: 'https://preview.example-sandbox.net/v1/runner.html' },
  execution: 'manual',
})
```

该 URL 是固定版本的静态资源，不是上传文档的地址。双方先检查版本和资源，再通过只服务本次运行的 MessageChannel 传送源码。运行页面不可用或不兼容时直接报错，不自动改用其他运行方式。部署和响应头需要在实际站点验证。

## 许可

[MIT](./LICENSE.md)
