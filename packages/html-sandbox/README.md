# @quirekit/html-sandbox

English | [简体中文](./README.zh-CN.md)

Framework-neutral HTML execution in a sandboxed browser iframe. No Vue, React, editor or UI dependency. This package is implemented in the workspace; public npm availability is not implied.

```ts
import { createHtmlSandbox } from '@quirekit/html-sandbox/browser'

const sandbox = createHtmlSandbox({
  container: document.querySelector('#preview')!,
  source: { html: '<button onclick="this.textContent=1">Count</button>', complete: true, identity: 'document/block' },
  onEvent: event => console.log(event),
})
sandbox.run()
// On source replacement: sandbox.update({ html, complete, identity })
// On unmount: sandbox.destroy()
```

The container supplies the desired viewport height. The runtime manages only its own iframe. `update` marks running content dirty; `run` starts a fresh instance; `stop` destroys it and suppresses automatic execution until explicit `run`. `configure` retires the current run when effective policy changes. `destroy` is idempotent. Manual execution is the default; `execution: 'on-complete'` is optional. Incomplete source and disabled execution cannot run.

`@quirekit/ui/vue/html-sandbox` provides `QuireHtmlSandbox` for Vue, including controls, source, bounded logs and height. Optional MSFE/Incremark and Block extensions live in their own adapter packages.

## Boundaries

The guest has `sandbox="allow-scripts"`, never same-origin access. Its policy permits inline JS/CSS and data images/fonts, with no remote scripts or fetch, eval, workers or relative resource imports. Input is limited to 1 MiB UTF-8. Each loaded runtime admits at most eight active instances per host document; an explicit run can retry after a slot is released. Logs retain at most 200 entries, each up to 4 KiB, and the host retires a run above 300 port messages per second. **These are application budgets, not hard CPU/memory isolation or an absolute network-egress boundary.** Self-navigation is a residual request channel; the runtime retires a navigated frame after detection. Do not provide credentials, secrets, or unrelated document data.

Read a selected file with `const html = await file.text()` in the host and pass that string as source. No upload or per-document URL is needed. Source is never written back from the guest. `@quirekit/html-sandbox/markdown` exposes the explicit `html-preview` fence codec; its separator newline is excluded from the HTML body, while author-owned trailing newlines survive round trips.

Parent CSP also applies to srcdoc. A strict parent policy may prevent inline execution; Trusted Types can also reject assignment. The runtime reports failure and never creates a permissive default policy or weakens the host policy.

## Self-hosted runner

Build produces `dist/runner/runner.html`, its script, third-party licenses and `_headers.template`. Deploy these static files together to HTTPS on a separate registrable domain with no business cookies. Replace the template's host origin with the exact embedding application's origin and configure those HTTP headers on your server. The inner guest inherits runner CSP. Do not add `allow-same-origin` or remove the inner sandbox.

```ts
import { defineHtmlSandboxConfig } from '@quirekit/html-sandbox'
const config = defineHtmlSandboxConfig({
  transport: { kind: 'hosted', runnerUrl: 'https://preview.example-sandbox.net/v1/runner.html' },
  execution: 'manual',
})
```

The URL is a fixed versioned asset, not a per-document upload. A version/resource handshake precedes sending source over a one-run MessageChannel. An unavailable or incompatible runner fails without fallback. Deployment and response headers must be verified on the actual host.

## License

[MIT](./LICENSE.md)
