import { expect, test } from "./browser";
import type {} from "./types";

test("SVG snapshots keep visible artwork and natural bounds in scrolled and scaled hosts", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await page.waitForFunction(() => Boolean(window.mindMapHarness));
  const result = await page.evaluate(async () => {
    // A fixed editor models a modal opened over a long, scrolled document.
    document.body.style.minHeight = "3200px";
    const host = document.getElementById("first")!;
    Object.assign(host.style, { position: "fixed", left: "80px", top: "100px", width: "900px", height: "540px" });
    const h = window.mindMapHarness;
    const index = await h.mount(21);
    const editor = h.editors[index]!;
    const before = await editor.getDocument();
    const notifications = h.notifications[index];
    const baseline = await editor.exportSvg();
    const transform = host.querySelector(".smm-container")!.getAttribute("transform");

    // Decode the exported file, not a screenshot of the correctly painted editor.
    const samples = [];
    for (const scale of [1, 0.75]) {
      window.scrollTo(0, 1400);
      host.style.transform = `scale(${scale})`;
      const snapshot = await editor.exportSvg();
      const url = URL.createObjectURL(new Blob([snapshot.svg], { type: "image/svg+xml" }));
      try {
        const image = new Image(); image.src = url; await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(snapshot.width); canvas.height = Math.ceil(snapshot.height);
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let painted = 0;
        for (let offset = 3; offset < pixels.length; offset += 4) if (pixels[offset]! > 0) painted++;
        samples.push({ width: snapshot.width, height: snapshot.height, painted,
          area: canvas.width * canvas.height, transform: host.querySelector(".smm-container")!.getAttribute("transform") });
      } finally { URL.revokeObjectURL(url); }
    }
    const after = await editor.getDocument();
    await editor.destroy();
    return { before, after, notifications, finalNotifications: h.notifications[index], baseline,
      transform, samples, scroll: window.scrollY };
  });
  expect(result.scroll).toBeGreaterThan(1000);
  expect(result.after).toEqual(result.before);
  expect(result.finalNotifications).toBe(result.notifications);
  for (const sample of result.samples) {
    expect(sample.width).toBeCloseTo(result.baseline.width, 1);
    expect(sample.height).toBeCloseTo(result.baseline.height, 1);
    expect(sample.painted / sample.area).toBeGreaterThan(0.01);
    expect(sample.transform).toBe(result.transform);
  }
  expect(errors).toEqual([]);
});
