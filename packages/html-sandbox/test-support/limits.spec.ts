import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => { await page.goto('/'); await page.waitForFunction(() => 'make' in window); });

test('document admission budget releases slots without hidden automatic retries', async ({ page }) => {
  const admitted = await page.evaluate(() => {
    const w = window as any;
    w.instances = Array.from({ length: 9 }, (_, index) => w.createSandbox({
      container: document.body.appendChild(document.createElement('div')),
      source: { html: `<p>${index}</p>`, complete: true, identity: String(index) },
    }));
    return w.instances.map((handle: any) => handle.run());
  });
  expect(admitted).toEqual([...Array(8).fill(true), false]);
  await expect(page.locator('iframe')).toHaveCount(8);
  const retried = await page.evaluate(() => {
    const instances = (window as any).instances;
    instances[0].destroy(); instances[0].destroy();
    return instances[8].run();
  });
  expect(retried).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as any).instances[8].state.phase)).toBe('running');
  await page.evaluate(() => (window as any).instances.forEach((handle: any) => handle.destroy()));
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('a starting callback cannot change the admitted source snapshot', async ({ page }) => {
  await page.evaluate(() => {
    const w = window as any;
    const source = { html: '<button>first</button>', complete: true, identity: 'atomic' };
    w.handle = w.createSandbox({ container: document.querySelector('#mount'), source,
      onEvent: (event: any) => {
        if (event.type === 'state' && event.state.phase === 'starting' && !event.state.dirty)
          w.handle.update({ ...source, html: '<button>second</button>' });
      },
    });
    w.handle.run();
  });
  await expect(page.frameLocator('iframe').getByRole('button')).toHaveText('first');
  expect(await page.evaluate(() => (window as any).handle.state.dirty)).toBe(true);
});

test('content geometry can shrink and module scripts run after parsing', async ({ page }) => {
  await page.evaluate(() => {
    const w = window as any;
    w.make(`<!doctype html><html lang="zh"><body data-marker="kept"><div style="height:480px" id="box"><button onclick="box.style.height='120px'">shrink</button></div><script type="module">console.log(document.documentElement.lang,document.body.dataset.marker,document.readyState)</script></body></html>`);
    w.handle.run();
  });
  await expect.poll(() => page.evaluate(() => (window as any).events.filter((event: any) => event.type === 'resize').at(-1)?.height)).toBe(496);
  await page.frameLocator('iframe').getByRole('button').click();
  await expect.poll(() => page.evaluate(() => (window as any).events.filter((event: any) => event.type === 'resize').at(-1)?.height)).toBe(136);
  const logs = await page.evaluate(() => (window as any).events.filter((event: any) => event.type === 'diagnostic').map((event: any) => event.diagnostic.message));
  expect(logs.some((message: string) => /^zh kept (interactive|complete)$/.test(message))).toBe(true);
});

test('sandbox denies top navigation, popups, downloads and forms', async ({ page }) => {
  const popups: unknown[] = [], downloads: unknown[] = [];
  page.on('popup', value => popups.push(value)); page.on('download', value => downloads.push(value));
  await page.request.get('/reset');
  await page.evaluate(() => {
    const w = window as any;
    w.make(`<form action="http://127.0.0.1:5194/egress/form"><button>submit</button></form><button id="attempt" onclick="try{top.location='http://127.0.0.1:5194/egress/top'}catch{};try{window.open('http://127.0.0.1:5194/egress/popup')}catch{};try{document.querySelector('a').click()}catch{};console.log('attempted')">attempt</button><a download="test.txt" href="data:text/plain,hello">download</a>`);
    w.handle.run();
  });
  const guest = page.frameLocator('iframe');
  await guest.getByRole('button', { name: 'submit' }).click();
  await guest.getByRole('button', { name: 'attempt', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).events.some((event: any) => event.diagnostic?.message === 'attempted'))).toBe(true);
  await expect(page.getByRole('heading')).toHaveText('Host');
  expect(popups).toHaveLength(0); expect(downloads).toHaveLength(0);
  expect(await (await page.request.get('/received')).json()).toEqual([]);
});

test('Trusted Types rejection leaves no iframe or permissive policy', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Trusted Types admission is verified on Chromium.');
  await page.route('**/trusted-parent', route => route.fulfill({ contentType: 'text/html', headers: { 'Content-Security-Policy': "require-trusted-types-for 'script'; trusted-types 'none'" }, body: '<div id="mount"></div><script type="module" src="/trusted-parent.js"></script>' }));
  await page.route('**/trusted-parent.js', route => route.fulfill({ contentType: 'text/javascript', body: `import {createHtmlSandbox} from '/@fs/${process.cwd()}/src/browser/index.ts';window.handle=createHtmlSandbox({container:document.querySelector('#mount'),source:{html:'<button>test</button>',complete:true,identity:'tt'}});window.handle.run();` }));
  await page.goto('/trusted-parent');
  await expect.poll(() => page.evaluate(() => (window as any).handle?.state.phase)).toBe('failed');
  await expect(page.locator('iframe')).toHaveCount(0);
});
