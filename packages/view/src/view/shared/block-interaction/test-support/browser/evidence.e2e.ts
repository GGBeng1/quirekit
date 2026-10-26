import { expect, test } from "@playwright/test";

test("keeps Canvas/SVG block targets and browser drag lifecycle equivalent", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      errors.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));

  await page.goto("/");
  await page.waitForFunction(() =>
    typeof window.runBlockGeometryFixture === "function"
    && typeof window.runDragLifecycleFixture === "function"
  );
  const geometry = await page.evaluate(() => window.runBlockGeometryFixture());
  expect(geometry.canvas).toEqual(geometry.svg);
  expect(geometry.canvas).toMatchObject({
    status: "ready",
    snapshotVersion: 7,
    identity: { rootId: "body", nodeId: "target" },
    indicator: {
      coordinateSpace: "document",
      rect: { x: 40, y: 100, width: 200, height: 0 }
    }
  });
  expect(geometry.canvasScroll).toEqual(geometry.svgScroll);
  expect(geometry.canvasScroll).toMatchObject({
    kind: "scroll",
    deltaY: 20,
    edges: ["block-end"]
  });

  const lifecycle = await page.evaluate(() => window.runDragLifecycleFixture());
  expect(lifecycle).toEqual({
    committedPhase: "committed",
    intentCount: 1,
    escapeReason: "escape"
  });
  expect(errors).toEqual([]);
});
