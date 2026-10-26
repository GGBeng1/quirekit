// @vitest-environment happy-dom
import { expect, it } from "vitest";
import { preparePdfDecorations } from "./decorations";
import { readPdfSvg } from "./read";
it("keeps positioned glyphs and links while splitting underline and strike into independent painted layers", () => {
  const root = readPdfSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80"><text><a href="https://example.com"><tspan x="12" y="30" text-decoration="underline line-through" font-family="face">中文 Vector</tspan></a></text></svg>', document);
  preparePdfDecorations(root);
  const span = root.querySelector("a > tspan")!;
  expect(span.getAttribute("x")).toBe("12"); expect(span.getAttribute("y")).toBe("30"); expect(span.getAttribute("text-decoration")).toBe("underline");
  expect(span.firstElementChild?.getAttribute("text-decoration")).toBe("line-through"); expect(span.textContent).toBe("中文 Vector"); expect(root.querySelector("a")?.getAttribute("href")).toBe("https://example.com");
});
