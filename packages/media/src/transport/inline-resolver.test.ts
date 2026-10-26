import { expect, it } from "vitest";
import { createQuireInlineImageResolver } from "./inline-resolver";
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=";
it("resolves explicit inline raster bytes and rejects network, SVG, and mismatched signatures", async () => {
  const resolver = createQuireInlineImageResolver(), reference = { kind: "external" as const, href: png };
  expect(await resolver.resolve(reference)).toMatchObject({ reference, kind: "image", mimeType: "image/png" });
  for (const href of ["https://example.com/a.png", "data:image/svg+xml;base64,AAAA", "data:image/png;base64,AAAA", png.replace("image/png", "image/jpeg")]) {
    expect(await resolver.resolve({ kind: "external", href })).toBeUndefined();
  }
  expect(await resolver.resolve({ kind: "asset", assetId: "host-image" })).toBeUndefined();
});
