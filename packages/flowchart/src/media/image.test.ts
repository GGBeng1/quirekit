import { describe, expect, it } from "vitest";
import { createFlowchart, instantiateFlowchart, parseFlowchart, readFlowchart, serializeFlowchart } from "../index";
import { createFlowchartImageNode, readFlowchartImage, flowchartSvgImage } from "./image";
import { updateFlowchartImage } from "./operations";

const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=";
const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 2h20v20H2z" fill="#2563eb"/></svg>';
describe("portable image nodes", () => {
  it("updates one image atomically and rejects stale or locked targets", () => {
    const node=createFlowchartImageNode("image",flowchartSvgImage(svg),{x:0,y:0}), document=readFlowchart({...createFlowchart(),nodes:[node]});
    const next=updateFlowchartImage(document,node.id,{...node.image!,alt:"new"},node);
    expect(next.nodes[0]!.image!.alt).toBe("new"); expect(next.nodes[0]!.width).toBe(node.width);
    expect(() => updateFlowchartImage(next,node.id,node.image!,node)).toThrow(/更新/);
    expect(() => updateFlowchartImage(readFlowchart({...document,nodes:[{...node,locked:true}]}),node.id,node.image!)).toThrow(/锁定/);
  });
  it("round-trips self-contained raster and vector images and remaps copied nodes", () => {
    const image = readFlowchartImage({ dataUrl: png, width: 1, height: 1, alt: "图标" });
    const vector = flowchartSvgImage(svg, "Logo");
    const source = readFlowchart({ ...createFlowchart(), nodes: [createFlowchartImageNode("png", image, { x: -50, y: 20 }), createFlowchartImageNode("svg", vector, { x: 80, y: 20 })] });
    expect(parseFlowchart(serializeFlowchart(source))).toEqual(source);
    expect(instantiateFlowchart(source, "copy").nodes.map(n => n.image)).toEqual(source.nodes.map(n => n.image));
    expect(Object.isFrozen(source.nodes[0]!.image)).toBe(true);
    expect(source.nodes[0]!.width).toBe(96);
  });
  it("rejects external images, forged dimensions, getters and decoded pixel excess", () => {
    for (const dataUrl of ["https://example.com/a.png", "data:image/png;base64,YmFk", "blob:local"]) expect(() => readFlowchartImage({ dataUrl, width: 1, height: 1, alt: "" })).toThrow();
    expect(() => readFlowchartImage({ dataUrl: png, width: 2, height: 1, alt: "" })).toThrow();
    expect(() => readFlowchartImage({ get dataUrl() { throw Error("getter"); }, width: 1, height: 1, alt: "" })).toThrow(/unsupported/);
    const large = png.replace("AAAAEAAAAB", "AAD6AAABA");
    expect(() => readFlowchartImage({ dataUrl: large, width: 4000, height: 4096, alt: "" })).toThrow();
  });
  it("requires images only on image nodes and enforces aggregate resource budget", () => {
    const node = createFlowchartImageNode("image", flowchartSvgImage(svg), { x: 0, y: 0 });
    expect(() => readFlowchart({ ...createFlowchart(), nodes: [{ ...node, image: undefined }] })).toThrow();
    expect(() => readFlowchart({ ...createFlowchart(), nodes: [{ ...node, shape: "rectangle" }] })).toThrow();
    const huge = '<svg viewBox="0 0 24 24"><path d="' + "M0 0 ".repeat(65000) + '"/></svg>';
    const image = flowchartSvgImage(huge);
    expect(() => readFlowchart({ ...createFlowchart(), nodes: Array.from({ length: 6 }, (_, i) => createFlowchartImageNode(`n${i}`, image, { x: i * 100, y: 0 })) })).toThrow(/budget/);
  });
});

describe("bounded static SVG admission", () => {
  it("preserves paths, groups, gradients and local clipping without external dependencies", () => {
    const input = '<svg width="100" height="80"><defs><linearGradient id="g"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#000000"/></linearGradient><clipPath id="c"><rect width="100" height="80"/></clipPath></defs><g clip-path="url(#c)" transform="translate(1 2)"><rect width="98" height="78" fill="url(#g)"/></g></svg>';
    const image = flowchartSvgImage(input);
    expect(image.width).toBe(100); expect(image.height).toBe(80);
    expect(decodeURIComponent(image.dataUrl.split(",")[1]!)).toContain('fill="url(#g)"');
    expect(readFlowchartImage(image)).toEqual(image);
  });
  it("rejects script, external references, active content, CSS, DTD and cyclic use", () => {
    for (const body of ['<script>alert(1)</script>', '<image href="https://example.com/a.png"/>', '<foreignObject/>', '<path onload="alert(1)"/>', '<style>path{fill:red}</style>', '<use href="#a"/>', '<animate attributeName="x"/>', '<path fill="url(https://example.com/p)"/>', '<path fill="url(#missing)"/>']) {
      expect(() => flowchartSvgImage(`<svg viewBox="0 0 24 24">${body}</svg>`)).toThrow();
    }
    expect(() => flowchartSvgImage('<!DOCTYPE svg [<!ENTITY a "x">]>' + svg)).toThrow();
    expect(() => flowchartSvgImage('<svg viewBox="0 0 24 24"><g></svg>')).toThrow();
    expect(() => flowchartSvgImage('<svg viewBox="0 0 24 24">' + '<g>'.repeat(34) + '<path/>' + '</g>'.repeat(34) + '</svg>')).toThrow();
  });
});
