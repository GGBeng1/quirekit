import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => { await page.goto('/'); await page.waitForFunction(() => 'make' in window); });

test('connection, stylesheet, font and nested frame requests are blocked', async ({ page }) => {
  await page.request.get('/reset');
  const sockets: unknown[] = []; page.on('websocket', socket => sockets.push(socket));
  await page.evaluate(() => {
    const w = window as any;
    w.make(`<p>Font request text</p><script>
      const base='http://127.0.0.1:5194/egress/';
      try{const xhr=new XMLHttpRequest();xhr.open('GET',base+'xhr');xhr.send()}catch{}
      try{new WebSocket('ws://127.0.0.1:5194/egress/socket')}catch{}
      try{navigator.sendBeacon(base+'beacon','x')}catch{}
      const css=document.createElement('style');css.textContent="@import url('"+base+"style');@font-face{font-family:Denied;src:url('"+base+"font')}body{font-family:Denied}";document.head.append(css);
      const frame=document.createElement('iframe');frame.src=base+'frame';document.body.append(frame);
      console.log('attempted');
    </script>`); w.handle.run();
  });
  await expect.poll(() => page.evaluate(() => (window as any).events.filter((event: any) => event.diagnostic?.code === 'guest.policy').length)).toBeGreaterThanOrEqual(6);
  expect(await (await page.request.get('/received')).json()).toEqual([]);
  expect(sockets).toHaveLength(0);
});

test('forged port traffic cannot exceed the bounded host message budget', async ({ page }) => {
  await page.evaluate(() => {
    const w = window as any;
    w.make(`<button onclick="for(let i=0;i<500;i++)authorPort.postMessage({version:1,runId:1,type:'resize',height:999999999})">flood</button><script>addEventListener('message',e=>{if(e.ports[0])window.authorPort=e.ports[0]})</script>`);
    w.handle.run();
  });
  await expect.poll(() => page.evaluate(() => (window as any).handle.state.phase)).toBe('running');
  await page.frameLocator('iframe').getByRole('button').click();
  await expect.poll(() => page.evaluate(() => (window as any).handle.state.phase)).toBe('failed');
  const reports = await page.evaluate(() => (window as any).events.filter((event: any) => event.type === 'diagnostic'));
  expect(reports.at(-1).diagnostic.code).toBe('sandbox.message-budget');
  await expect(page.locator('iframe')).toHaveCount(0);
});
