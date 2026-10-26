import { describe, expect, it } from "vitest";
import type { QuireImePreedit } from "@quirekit/view-engine";
import { FakeSvgMountDocument, FakeSvgMountElement } from "@quirekit/view/test-support/svg-mount";
import { syncHtmlMountedInputProxy } from "./input-proxy";

describe("HTML mounted input proxy", () => {
  it("anchors the native candidate host below visible in-flow preedit", () => {
    const ownerDocument = new FakeSvgMountDocument();
    const inputProxy = ownerDocument.createElement("textarea") as unknown as
      FakeSvgMountElement;
    const positioningRoot = ownerDocument.createElement("div") as unknown as
      FakeSvgMountElement;
    positioningRoot.appendChild(inputProxy);
    const imePreedit: QuireImePreedit = {
      range: { from: 4, to: 4 },
      text: "nihao"
    };

    syncHtmlMountedInputProxy({
      inputProxy: inputProxy as unknown as HTMLTextAreaElement,
      anchor: {
        left: 40,
        right: 40,
        top: 60,
        bottom: 80,
        descriptorId: "composition",
        source: { sourceId: "document" },
        rootId: "root",
        regionId: "body"
      },
      imePreedit
    });

    expect(inputProxy.style.left).toBe("40px");
    expect(inputProxy.style.top).toBe("80px");
    expect(inputProxy.style.width).toBe("150px");
  });

  it("keeps the proxy inside its positioning root near the end of a line", () => {
    const ownerDocument = new FakeSvgMountDocument();
    const inputProxy = ownerDocument.createElement("textarea") as unknown as FakeSvgMountElement;
    const positioningRoot = ownerDocument.createElement("div") as unknown as FakeSvgMountElement;
    positioningRoot.appendChild(inputProxy);
    Object.defineProperty(positioningRoot, "offsetWidth", { value: 600 });
    Object.defineProperty(positioningRoot, "getBoundingClientRect", { value: () => ({ left: 0, top: 0, right: 600, bottom: 400, width: 600, height: 400 }) });

    syncHtmlMountedInputProxy({
      inputProxy: inputProxy as unknown as HTMLTextAreaElement,
      anchor: { left: 560, right: 560, top: 60, bottom: 80, descriptorId: "caret", source: { sourceId: "document" }, rootId: "root", regionId: "body" }
    });

    expect(inputProxy.style.left).toBe("450px");
    expect(inputProxy.style.width).toBe("150px");
  });
});
