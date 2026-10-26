import { describe, it, expect } from "vitest";
import { parse } from "parse5";
import { prepareDocument } from "./prepare";
describe("inert preparation", () => {
  it("preserves author script order, document attributes and doctype", () => {
    const source = '<!doctype html><html lang="zh"><head><title>X</title><script>window.order=[1]</script></head><body class="demo"><script>order.push(2)</script></body></html>';
    const result = prepareDocument(source, 7);
    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('<html lang="zh">'); expect(result).toContain('<body class="demo">');
    expect(result.indexOf('Content-Security-Policy')).toBeLessThan(result.indexOf('window.order=[1]'));
    expect(result.indexOf('window.order=[1]')).toBeLessThan(result.indexOf('order.push(2)'));
  });
  it("never mistakes a foreign-namespace head for the document head", () => {
    const result = prepareDocument('<script>console.log(1)</script><svg><head></head></svg>', 1);
    const document = parse(result);
    const html = document.childNodes.find(node => 'tagName' in node && node.tagName === 'html') as any;
    expect(html.childNodes[0].childNodes[0].tagName).toBe('meta');
  });
  it("refuses declarative imports and navigation before mounting", () => {
    for (const html of ['<base href="https://a.invalid">', '<meta http-equiv="refresh" content="0;url=https://a.invalid">', '<script src="./index.js"></script>', '<iframe srcdoc="x"></iframe>', '<img src="https://a.invalid/a.png">']) expect(() => prepareDocument(html, 1)).toThrow();
  });
  it("keeps literal closing-script text out of the trusted bootstrap", () => {
    const source = '<p>&lt;/script&gt;</p><script>console.log("</scr"+"ipt>")</script>';
    expect(prepareDocument(source, 3)).toContain(source);
  });
});
