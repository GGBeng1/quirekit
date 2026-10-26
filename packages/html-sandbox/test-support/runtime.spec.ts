import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => { await page.goto('/'); await page.waitForFunction(() => 'make' in window); });

test("manual execution, origin isolation, script order and guest interactions", async ({ page }) => {
  await page.evaluate(() => { document.cookie='fixture=host-secret'; document.body.dataset.secret='host-secret'; localStorage.setItem('fixture','host-secret'); });
  await page.evaluate(() => (window as any).make(`<!doctype html><html lang="zh"><head><script>window.order=[1]</script></head><body><button onclick="this.textContent=Number(this.textContent)+1">0</button><script>order.push(2);console.log(order.join(','));for(const get of [()=>parent.document.body.dataset.secret,()=>localStorage.getItem('fixture'),()=>document.cookie]){try{console.log(String(get()).includes('host-secret')?'ESCAPED':'ISOLATED')}catch{console.log('ISOLATED')}}</script></body></html>`));
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.evaluate(() => (window as any).handle.run());
  await expect.poll(() => page.evaluate(() => (window as any).handle.state.phase)).toBe('running');
  await expect(page.locator('iframe')).toHaveAttribute('sandbox', 'allow-scripts');
  const guest = page.frameLocator('iframe');
  await guest.getByRole('button').click(); await expect(guest.getByRole('button')).toHaveText('1');
  const logs = await page.evaluate(() => (window as any).events.filter((e: any) => e.type === 'diagnostic').map((e: any) => e.diagnostic.message));
  expect(logs).toContain('1,2'); expect(logs.filter((s: string) => s === 'ISOLATED')).toHaveLength(3); expect(logs).not.toContain('ESCAPED');
});

test("CSP blocks actual resource requests including script-generated resources", async ({ page }) => {
  await page.request.get('/reset');
  await page.evaluate(() => { (window as any).make(`<script>fetch('http://127.0.0.1:5194/egress/fetch').catch(()=>{});const img=new Image();img.src='http://127.0.0.1:5194/egress/image';document.documentElement.append(img);const script=document.createElement('script');script.src='http://127.0.0.1:5194/egress/script';document.head.append(script);try{new Worker('http://127.0.0.1:5194/egress/worker')}catch{};try{parent.document.body.textContent='bad'}catch{};</script>`); (window as any).handle.run(); });
  await expect.poll(() => page.evaluate(() => (window as any).handle.state.phase)).toBe('running');
  await expect.poll(() => page.evaluate(() => (window as any).events.filter((e: any) => e.diagnostic?.code === 'guest.policy').length)).toBeGreaterThan(0);
  expect(await (await page.request.get('/received')).json()).toEqual([]); await expect(page.getByRole('heading')).toHaveText('Host');
});

test("source updates are dirty, stop latches auto, and disposal prevents late work", async ({ page }) => {
  await page.evaluate(() => (window as any).make('<button>first</button>', { execution: 'on-complete' }, false));
  await page.evaluate(() => (window as any).handle.run()); await expect(page.locator('iframe')).toHaveCount(0);
  await page.evaluate(() => (window as any).handle.update({ html: '<button>first</button>', complete: true, identity: 'fixture' }));
  await expect.poll(() => page.evaluate(() => (window as any).handle.state.phase)).toBe('running');
  await page.evaluate(() => (window as any).handle.update({ html: '<button>second</button>', complete: true, identity: 'fixture' }));
  await expect(page.frameLocator('iframe').getByRole('button')).toHaveText('first');
  expect(await page.evaluate(() => (window as any).handle.state)).toMatchObject({ dirty: true, runId: 1 });
  await page.evaluate(() => { const h=(window as any).handle; h.stop(); h.update({ html:'x', complete:false, identity:'fixture' }); h.update({ html:'x', complete:true, identity:'fixture' }); });
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.evaluate(() => { const h=(window as any).handle;h.destroy();h.run();h.destroy(); });
  expect(await page.evaluate(() => (window as any).handle.state.phase)).toBe('disposed');
});

test("strict parent policy fails closed and untrusted messages cannot control parent", async ({ page }) => {
  await page.route('**/strict', route => route.fulfill({ contentType:'text/html', headers:{'Content-Security-Policy':"script-src 'self'"}, body:'<div id="mount"></div><script src="/strict.js" type="module"></script>' }));
  await page.route('**/strict.js', route => route.fulfill({contentType:'text/javascript',body:`import {createHtmlSandbox} from '/@fs/${process.cwd()}/src/browser/index.ts';window.handle=createHtmlSandbox({container:document.querySelector('#mount'),source:{html:'<script>parent.postMessage({type:"ready",version:1,runId:1},"*")<\/script>',complete:true,identity:'x'}});window.handle.run();`}));
  await page.goto('/strict');
  await expect.poll(() => page.evaluate(() => (window as any).handle?.state.phase), { timeout: 15_000 }).toBe('failed');
  await expect(page.locator('iframe')).toHaveCount(0);
});


test("invalid updates retire the guest and cannot run a stale policy or source", async ({ page }) => {
  await page.evaluate(() => { const w=window as any;w.make('<p>ok</p>');w.handle.run(); });
  await expect.poll(() => page.evaluate(() => (window as any).handle.state.phase)).toBe('running');
  expect(await page.evaluate(() => { const h=(window as any).handle;h.configure({sandbox:'allow-same-origin'});return h.run(); })).toBe(false);
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(await page.evaluate(() => { const h=(window as any).handle;h.configure({});h.update({html:3,complete:true,identity:'fixture'});return h.run(); })).toBe(false);
});

test("navigation retires the old run while documenting the residual request", async ({ page }) => {
  await page.request.get('/reset');
  await page.evaluate(() => { const w=window as any;w.make('<button onclick="location.href=\'http://127.0.0.1:5194/egress/navigation\'">navigate</button>');w.handle.run(); });
  await page.frameLocator('iframe').getByRole('button').click();
  await expect.poll(() => page.evaluate(() => (window as any).handle.state.phase)).toBe('failed');
  expect(await (await page.request.get('/received')).json()).toContain('/egress/navigation');
  await expect(page.locator('iframe')).toHaveCount(0);
});

test("a built hosted runner works under a strict parent and validates before source transfer", async ({ page }) => {
  const { readFile } = await import('node:fs/promises');
  const runner = await readFile(new URL('../dist/runner/runner.html', import.meta.url), 'utf8');
  const script = await readFile(new URL('../dist/runner/runner.iife.js', import.meta.url), 'utf8');
  const csp = "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; frame-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'; worker-src 'none'; frame-ancestors http://127.0.0.1:5194";
  await page.route('https://runner.sandbox.invalid/**', route => route.fulfill({ contentType:route.request().url().endsWith('.js')?'text/javascript':'text/html', headers:{'Content-Security-Policy':csp,'Referrer-Policy':'no-referrer'}, body:route.request().url().endsWith('.js')?script:runner }));
  await page.route('**/hosted-parent', route => route.fulfill({contentType:'text/html',headers:{'Content-Security-Policy':"default-src 'none'; script-src 'self'; frame-src https://runner.sandbox.invalid; style-src 'unsafe-inline'; connect-src 'self'"},body:'<div id="mount" style="height:320px"></div><script src="/hosted-parent.js" type="module"></script>'}));
  await page.route('**/hosted-parent.js', route => route.fulfill({contentType:'text/javascript',body:`import {createHtmlSandbox} from '/@fs/${process.cwd()}/src/browser/index.ts';window.make=(html,config)=>{window.handle=createHtmlSandbox({container:document.querySelector('#mount'),source:{html,complete:true,identity:'hosted'},config})}`}));
  await page.goto('/hosted-parent');await page.waitForFunction(()=>'make' in window);
  await page.evaluate(() => { const w=window as any;w.make('<button onclick="this.textContent=1">0</button>', {transport:{kind:'hosted',runnerUrl:'https://runner.sandbox.invalid/v1/runner.html'}});w.handle.run(); });
  await expect.poll(() => page.evaluate(() => (window as any).handle.state.phase), {timeout:15000}).toBe('running');
  await expect(page.locator('iframe')).toHaveAttribute('src','https://runner.sandbox.invalid/v1/runner.html');
  const guest = page.frameLocator('iframe').frameLocator('iframe');
  await guest.getByRole('button').click(); await expect(guest.getByRole('button')).toHaveText('1');
  await page.evaluate(() => (window as any).handle.stop()); await expect(page.locator('iframe')).toHaveCount(0);
});

test("incompatible runner never receives source and cannot trigger a fallback", async ({ page }) => {
  const captures:string[]=[]; page.on('console', msg=>{if(msg.text().startsWith('probe:')) captures.push(msg.text());});
  await page.route('https://runner.sandbox.invalid/**', route=>route.fulfill({contentType:'text/html',body:`<script>onmessage=e=>{console.log('probe:'+JSON.stringify(e.data));e.ports[0].postMessage({type:'accept',version:99,runId:e.data.runId,resources:'embedded'})}</script>`}));
  await page.evaluate(() => {const w=window as any;w.make('source-must-stay-host-side',{transport:{kind:'hosted',runnerUrl:'https://runner.sandbox.invalid/runner.html'}});w.handle.run();});
  await expect.poll(() => page.evaluate(() => (window as any).handle.state.phase)).toBe('failed');
  expect(captures).toHaveLength(1);expect(captures[0]).not.toContain('source-must-stay-host-side');
  await expect(page.locator('iframe')).toHaveCount(0);
});
