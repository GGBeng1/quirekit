import { describe, expect, it } from "vitest";
import {
  createSvgSvgDrawSurface,
  serializeSvgDisplayListToSvg,
  syncSvgContentDisplayListToSvg,
  syncSvgDisplayListToSvg,
  type QuireDisplayList,
  type SvgGlyphRunRenderer
} from "../index";

describe("SVG display-list serializer", () => {
  it("serializes current display commands in paint order", () => {
    const displayList: QuireDisplayList = {
      bounds: { x: 10, y: 20, width: 100, height: 40 },
      commands: [
        {
          id: "background",
          kind: "fill-rect",
          rect: { x: 10, y: 20, width: 100, height: 40 },
          fillStyle: "#ffffff"
        },
        {
          id: "text",
          kind: "text",
          rect: { x: 14, y: 22, width: 30, height: 20 },
          text: "A&B",
          origin: { x: 14, y: 38 },
          font: "16px sans-serif",
          fillStyle: "#111827"
        },
        {
          id: "caret",
          kind: "caret",
          rect: { x: 20, y: 22, width: 1, height: 20 },
          fillStyle: "#0f172a"
        }
      ]
    };

    expect(serializeSvgDisplayListToSvg({ displayList })).toMatchInlineSnapshot(`
      "<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 20 100 40" width="100" height="40" preserveAspectRatio="none">
        <rect x="10" y="20" width="100" height="40" fill="#ffffff" />
        <text x="14" y="38" fill="#111827" style="font: 16px sans-serif; white-space: pre; user-select: none; -webkit-user-select: none" xml:space="preserve">A&amp;B</text>
        <rect x="20" y="22" width="1" height="20" fill="#0f172a" />
      </svg>"
    `);
  });

  it.each(["ltr", "rtl"] as const)("shares scaled %s origins and independent tracking across mounted and serialized SVG", direction => {
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 120, height: 80 },
      commands: [{ id: "scale", kind: "text", text: "AB", font: "16px Fixture", fillStyle: "#000",
        origin: { x: 20, y: 46 }, rect: { x: 20, y: 30, width: 44, height: 20 },
        horizontalScale: 2, letterSpacing: 2, direction }]
    };
    const document = new FakeSvgDocument();
    const host = document.createElementNS("http://www.w3.org/2000/svg", "svg") as unknown as SVGSVGElement;
    syncSvgDisplayListToSvg({ host, displayList });
    for (const output of [serializeSvgDisplayListToSvg({ displayList }), (host as unknown as FakeSvgElement).toMarkup()]) {
      expect(output).toContain('transform="matrix(2 0 0 1 -20 0)"');
      expect(output).toContain("letter-spacing: 1px");
      expect(output).toContain(direction === "ltr" ? 'x="20"' : 'x="42"');
      expect(output).toContain('y="46"');
    }
  });

  it("preserves transient opacity in serialized and mounted SVG output", () => {
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 120, height: 40 },
      commands: [{
        id: "inactive-story",
        kind: "text",
        opacity: 0.55,
        rect: { x: 8, y: 8, width: 60, height: 24 },
        text: "Header",
        origin: { x: 8, y: 28 },
        font: "16px sans-serif",
        fillStyle: "#111827"
      }]
    };
    const document = new FakeSvgDocument();
    const host = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    ) as unknown as SVGSVGElement;

    syncSvgDisplayListToSvg({ host, displayList });

    expect(serializeSvgDisplayListToSvg({ displayList }))
      .toContain('opacity="0.55"');
    expect((host as unknown as FakeSvgElement).toMarkup())
      .toContain('opacity="0.55"');
  });

  it("serializes signed character spacing for native SVG text", () => {
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 80, height: 30 },
      commands: [{
        id: "spaced",
        kind: "text",
        rect: { x: 4, y: 4, width: 40, height: 20 },
        text: "AB",
        origin: { x: 4, y: 20 },
        font: "16px sans-serif",
        letterSpacing: -0.5,
        fillStyle: "#111827"
      }]
    };

    expect(serializeSvgDisplayListToSvg({ displayList }))
      .toContain("letter-spacing: -0.5px");
  });

  it("shares stroke-only text paint across serialized and mounted SVG", () => {
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 80, height: 30 },
      commands: [{
        id: "outlined",
        kind: "text",
        rect: { x: 4, y: 4, width: 40, height: 20 },
        text: "AB",
        origin: { x: 4, y: 20 },
        font: "16px sans-serif",
        fillStyle: "#123456",
        paintMode: "stroke",
        strokeStyle: "#654321",
        lineWidth: 1.25
      }]
    };
    const document = new FakeSvgDocument();
    const host = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    ) as unknown as SVGSVGElement;

    syncSvgDisplayListToSvg({ host, displayList });
    const serialized = serializeSvgDisplayListToSvg({ displayList });
    const mounted = (host as unknown as FakeSvgElement).toMarkup();

    for (const output of [serialized, mounted]) {
      expect(output).toContain('fill="none"');
      expect(output).toContain('stroke="#654321"');
      expect(output).toContain('stroke-width="1.25"');
      expect(output).toContain('paint-order="stroke fill"');
    }
  });

  it("shares one center transform across serialized and mounted cropped images", () => {
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 80, height: 80 },
      commands: [{
        id: "transformed-picture",
        kind: "image",
        rect: { x: 10, y: 20, width: 40, height: 20 },
        href: "blob:asymmetric",
        sourceSize: { width: 80, height: 40 },
        sourceRect: { x: 8, y: 4, width: 64, height: 32 },
        transform: {
          rotation: 90,
          flipHorizontal: true,
          flipVertical: false
        }
      }]
    };
    const document = new FakeSvgDocument();
    const host = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    ) as unknown as SVGSVGElement;

    syncSvgDisplayListToSvg({ host, displayList });

    const matrix = 'transform="matrix(0 -1 -1 0 60 60)"';
    expect(serializeSvgDisplayListToSvg({ displayList })).toContain(matrix);
    expect((host as unknown as FakeSvgElement).toMarkup()).toContain(matrix);
    expect(serializeSvgDisplayListToSvg({ displayList }))
      .toContain('viewBox="8 4 64 32"');
    expect((host as unknown as FakeSvgElement).toMarkup())
      .toContain('viewBox="8 4 64 32"');
  });

  it("serializes glyph-run commands with fallback text and glyph metadata", () => {
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 120, height: 40 },
      commands: [
        {
          id: "glyph-run",
          kind: "glyph-run",
          rect: { x: 8, y: 8, width: 50, height: 24 },
          text: "AB",
          origin: { x: 8, y: 28 },
          font: "16px serif",
          fillStyle: "#111827",
          glyphCoverage: "complete",
          glyphs: [
            {
              glyphId: 36,
              sourceCluster: 0,
              x: 0,
              y: 0,
              xAdvance: 12,
              yAdvance: 0,
              xOffset: 0,
              yOffset: 0,
              fontId: "serif-regular",
              fontFamily: "Fixture Serif"
            }
          ]
        }
      ]
    };

    expect(serializeSvgDisplayListToSvg({ displayList })).toMatchInlineSnapshot(`
      "<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" width="120" height="40" preserveAspectRatio="none">
        <text x="8" y="28" fill="#111827" style="font: 16px serif; white-space: pre; user-select: none; -webkit-user-select: none" xml:space="preserve" data-quirekit-glyph-run="true" data-quirekit-glyph-count="1" data-quirekit-glyph-coverage="complete" data-quirekit-glyphs="36:0:0:0:12:0:0:0:serif-regular:Fixture Serif">AB</text>
      </svg>"
    `);
  });

  it("serializes text as visually inert to native browser selection", () => {
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 80, height: 32 },
      commands: [
        {
          id: "label",
          kind: "text",
          rect: { x: 8, y: 6, width: 40, height: 20 },
          text: "Text",
          origin: { x: 8, y: 22 },
          font: "16px sans-serif",
          fillStyle: "#111827"
        }
      ]
    };

    const svg = serializeSvgDisplayListToSvg({ displayList });

    expect(svg).toContain("user-select: none");
    expect(svg).toContain("-webkit-user-select: none");
  });

  it("serializes RTL text using the visual right edge as the SVG text anchor", () => {
    const displayList = {
      bounds: { x: 0, y: 0, width: 120, height: 40 },
      commands: [
        {
          id: "rtl",
          kind: "text",
          rect: { x: 8, y: 8, width: 50, height: 24 },
          text: "שלום.",
          origin: { x: 8, y: 28 },
          font: "16px sans-serif",
          fillStyle: "#111827",
          direction: "rtl"
        }
      ]
    } as unknown as QuireDisplayList;

    expect(serializeSvgDisplayListToSvg({ displayList })).toContain(
      "<text x=\"58\" y=\"28\" fill=\"#111827\" style=\"font: 16px sans-serif; white-space: pre; user-select: none; -webkit-user-select: none; direction: rtl; unicode-bidi: embed\" direction=\"rtl\" xml:space=\"preserve\">שלום.</text>"
    );
  });

  it("serializes line, path, image, and clipped commands", () => {
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 120, height: 96 },
      commands: [
        {
          id: "line",
          kind: "line",
          from: { x: 8, y: 12 },
          to: { x: 48, y: 12 },
          strokeStyle: "#1f7a8c",
          lineWidth: 2,
          lineDash: [6, 4],
          lineCap: "square"
        },
        {
          id: "path",
          kind: "path",
          rect: { x: 8, y: 20, width: 32, height: 24 },
          segments: [
            { kind: "move-to", point: { x: 8, y: 20 } },
            { kind: "line-to", point: { x: 40, y: 20 } },
            { kind: "line-to", point: { x: 24, y: 44 } },
            { kind: "close-path" }
          ],
          fillStyle: "#eef6ff",
          strokeStyle: "#1f7a8c",
          lineWidth: 1,
          lineDash: [3, 2]
        },
        {
          id: "image",
          kind: "image",
          rect: { x: 56, y: 20, width: 40, height: 30 },
          href: "asset://diagram",
          sourceSize: { width: 120, height: 90 },
          sourceRect: { x: 12, y: 9, width: 96, height: 72 }
        },
        {
          id: "clip",
          kind: "clip",
          rect: { x: 0, y: 60, width: 80, height: 32 },
          commands: [
            {
              id: "clipped-fill",
              kind: "fill-rect",
              rect: { x: 0, y: 60, width: 120, height: 32 },
              fillStyle: "#fef3c7"
            }
          ]
        }
      ]
    };

    expect(serializeSvgDisplayListToSvg({ displayList })).toMatchInlineSnapshot(`
      "<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 96" width="120" height="96" preserveAspectRatio="none">
        <line x1="8" y1="12" x2="48" y2="12" stroke="#1f7a8c" stroke-width="2" stroke-dasharray="6 4" stroke-linecap="square" />
        <path d="M 8 20 L 40 20 L 24 44 Z" fill="#eef6ff" stroke="#1f7a8c" stroke-width="1" stroke-dasharray="3 2" />
        <svg x="56" y="20" width="40" height="30" viewBox="12 9 96 72" preserveAspectRatio="none"><image x="0" y="0" width="120" height="90" href="asset://diagram" /></svg>
        <clipPath id="clip-clip"><rect x="0" y="60" width="80" height="32" /></clipPath>
        <g clip-path="url(#clip-clip)">
          <rect x="0" y="60" width="120" height="32" fill="#fef3c7" />
        </g>
      </svg>"
    `);
  });

  it("serializes one affine around a transformed clip and its children", () => {
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 120, height: 120 },
      commands: [{
        id: "rotated-story-clip",
        kind: "clip",
        rect: { x: 20, y: 40, width: 80, height: 24 },
        transform: { a: 0, b: 1, c: -1, d: 0, e: 112, f: -16 },
        visualBounds: { x: 48, y: 8, width: 24, height: 80 },
        commands: [{
          id: "watermark-text",
          kind: "text",
          rect: { x: 32, y: 42, width: 56, height: 20 },
          text: "机密",
          origin: { x: 32, y: 60 },
          font: "20px sans-serif",
          fillStyle: "#c8c8c8"
        }]
      }]
    };

    const markup = serializeSvgDisplayListToSvg({ displayList });

    expect(markup).toContain(
      '<g clip-path="url(#clip-rotated-story-clip)" transform="matrix(0 1 -1 0 112 -16)">'
    );
    expect(markup).toContain(">机密</text>");
  });

  it("syncs display commands and DOM overlays into a layered SVG host", () => {
    const document = new FakeSvgDocument();
    const host = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    ) as unknown as SVGSVGElement;
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 120, height: 80 },
      commands: [
        {
          id: "background",
          kind: "fill-rect",
          rect: { x: 0, y: 0, width: 120, height: 80 },
          fillStyle: "#fff"
        },
        {
          id: "label",
          kind: "text",
          rect: { x: 12, y: 10, width: 42, height: 20 },
          text: "SVG",
          origin: { x: 12, y: 28 },
          font: "16px sans-serif",
          fillStyle: "#111"
        },
        {
          id: "caret",
          kind: "caret",
          layer: "overlay",
          rect: { x: 54, y: 10, width: 1, height: 20 },
          fillStyle: "#111"
        }
      ]
    };

    syncSvgDisplayListToSvg({
      host,
      displayList,
      domOverlays: [
        {
          id: "node-view",
          range: { from: 1, to: 2 },
          rect: { x: 70, y: 12, width: 40, height: 20 },
          html: "<button>Open</button>",
          role: "button",
          pointerEvents: "auto",
          ariaLabel: "Node view"
        }
      ]
    });

    expect((host as unknown as FakeSvgElement).toMarkup()).toMatchInlineSnapshot(`
      "<svg height="80" preserveAspectRatio="none" viewBox="0 0 120 80" width="120" xmlns="http://www.w3.org/2000/svg">
        <defs></defs>
        <g data-quirekit-svg-layer="content">
          <rect data-quirekit-command-id="background" fill="#fff" height="80" width="120" x="0" y="0"></rect>
          <text data-quirekit-command-id="label" fill="#111" style="font: 16px sans-serif; white-space: pre; user-select: none; -webkit-user-select: none" x="12" xml:space="preserve" y="28">SVG</text>
        </g>
        <g data-quirekit-svg-layer="overlay">
          <rect data-quirekit-command-id="caret" fill="#111" height="20" width="1" x="54" y="10"></rect>
        </g>
        <g data-quirekit-svg-layer="dom-overlays">
          <foreignObject aria-label="Node view" height="20" pointer-events="auto" role="button" width="40" x="70" y="12">
            <div data-quirekit-overlay-id="node-view" data-quirekit-range-from="1" data-quirekit-range-to="2"><button>Open</button></div>
          </foreignObject>
        </g>
      </svg>"
    `);
  });

  it("serializes explicit pass-through policy for visual DOM overlays", () => {
    const svg = serializeSvgDisplayListToSvg({
      displayList: {
        bounds: { x: 0, y: 0, width: 80, height: 40 },
        commands: []
      },
      domOverlays: [{
        id: "visual-label",
        rect: { x: 4, y: 6, width: 40, height: 16 },
        html: "<span>Label</span>",
        pointerEvents: "none"
      }]
    });

    expect(svg).toContain('pointer-events="none"');
  });

  it("lets a live SVG glyph-run renderer take over shaped glyph nodes", () => {
    const document = new FakeSvgDocument();
    const host = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    ) as unknown as SVGSVGElement;
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 120, height: 40 },
      commands: [
        {
          id: "glyph-run",
          kind: "glyph-run",
          rect: { x: 8, y: 8, width: 50, height: 24 },
          text: "AB",
          origin: { x: 8, y: 28 },
          font: "16px serif",
          fillStyle: "#111827",
          glyphCoverage: "complete",
          glyphs: [
            {
              glyphId: 36,
              sourceCluster: 0,
              x: 0,
              y: 0,
              xAdvance: 12,
              yAdvance: 0,
              xOffset: 0,
              yOffset: 0
            }
          ]
        }
      ]
    };

    syncSvgDisplayListToSvg({
      host,
      displayList,
      glyphRunRenderer: new FakeSvgGlyphRunRenderer()
    });

    expect((host as unknown as FakeSvgElement).toMarkup()).toMatchInlineSnapshot(`
      "<svg height="40" preserveAspectRatio="none" viewBox="0 0 120 40" width="120" xmlns="http://www.w3.org/2000/svg">
        <defs></defs>
        <g data-quirekit-svg-layer="content">
          <g data-custom-glyph-count="1" data-custom-glyph-run="glyph-run"></g>
        </g>
        <g data-quirekit-svg-layer="overlay"></g>
        <g data-quirekit-svg-layer="dom-overlays"></g>
      </svg>"
    `);
  });

  it("filters SVG runtime output to a viewport rectangle", () => {
    const document = new FakeSvgDocument();
    const host = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    ) as unknown as SVGSVGElement;

    syncSvgDisplayListToSvg({
      host,
      viewportRect: { x: 0, y: 0, width: 60, height: 40 },
      displayList: {
        bounds: { x: 0, y: 0, width: 120, height: 80 },
        commands: [
          {
            id: "inside",
            kind: "fill-rect",
            rect: { x: 10, y: 10, width: 20, height: 20 },
            fillStyle: "#fff"
          },
          {
            id: "outside",
            kind: "fill-rect",
            rect: { x: 80, y: 10, width: 20, height: 20 },
            fillStyle: "#111"
          }
        ]
      },
      domOverlays: [
        {
          id: "outside-overlay",
          range: { from: 1, to: 2 },
          rect: { x: 90, y: 10, width: 20, height: 20 },
          html: "<span>Hidden</span>"
        }
      ]
    });

    expect((host as unknown as FakeSvgElement).toMarkup()).toContain("inside");
    expect((host as unknown as FakeSvgElement).toMarkup()).not.toContain("outside");
    expect((host as unknown as FakeSvgElement).toMarkup()).not.toContain("Hidden");
  });

  it("trusts pre-scoped SVG runtime display lists while still filtering DOM overlays", () => {
    const document = new FakeSvgDocument();
    const host = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    ) as unknown as SVGSVGElement;

    syncSvgDisplayListToSvg({
      host,
      viewportRect: { x: 0, y: 0, width: 60, height: 40 },
      displayListIsViewportScoped: true,
      displayList: {
        bounds: { x: 0, y: 0, width: 120, height: 80 },
        commands: [
          {
            id: "already-scoped",
            kind: "fill-rect",
            rect: { x: 80, y: 10, width: 20, height: 20 },
            fillStyle: "#111"
          }
        ]
      },
      domOverlays: [
        {
          id: "outside-overlay",
          range: { from: 1, to: 2 },
          rect: { x: 90, y: 10, width: 20, height: 20 },
          html: "<span>Hidden</span>"
        }
      ]
    });

    expect((host as unknown as FakeSvgElement).toMarkup()).toContain("already-scoped");
    expect((host as unknown as FakeSvgElement).toMarkup()).not.toContain("Hidden");
  });

  it("syncs content-only SVG output without empty overlay layers", () => {
    const document = new FakeSvgDocument();
    const host = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    ) as unknown as SVGSVGElement;

    syncSvgContentDisplayListToSvg({
      host,
      displayList: {
        bounds: { x: 0, y: 0, width: 120, height: 80 },
        commands: [
          {
            id: "label",
            kind: "text",
            rect: { x: 12, y: 10, width: 42, height: 20 },
            text: "SVG",
            origin: { x: 12, y: 28 },
            font: "16px sans-serif",
            fillStyle: "#111"
          }
        ]
      }
    });
    const markup = (host as unknown as FakeSvgElement).toMarkup();

    expect(markup).toContain("data-quirekit-svg-layer=\"content\"");
    expect(markup).toContain("SVG");
    expect(markup).not.toContain("data-quirekit-svg-layer=\"overlay\"");
    expect(markup).not.toContain("data-quirekit-svg-layer=\"dom-overlays\"");
  });

  it("creates an SVG draw surface for renderer-neutral commands", () => {
    const document = new FakeSvgDocument();
    const parent = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const surface = createSvgSvgDrawSurface({
      parent: parent as unknown as SVGElement,
      defs: defs as unknown as SVGElement
    });

    surface.fillText({
      id: "title",
      kind: "text",
      rect: { x: 0, y: 0, width: 40, height: 20 },
      text: "Draw",
      origin: { x: 0, y: 16 },
      font: "16px sans-serif",
      fillStyle: "#111"
    });
    surface.drawImage({
      id: "cropped-image",
      kind: "image",
      rect: { x: 48, y: 0, width: 40, height: 30 },
      href: "blob:picture",
      sourceSize: { width: 200, height: 100 },
      sourceRect: { x: 20, y: 10, width: 160, height: 80 }
    });
    surface.withClip(
      {
        id: "clip",
        kind: "clip",
        rect: { x: 0, y: 20, width: 40, height: 20 },
        transform: { a: 0, b: 1, c: -1, d: 0, e: 60, f: 0 },
        visualBounds: { x: 20, y: 0, width: 20, height: 40 },
        commands: []
      },
      () => {
        surface.fillRect({
          id: "inside",
          kind: "fill-rect",
          rect: { x: 0, y: 20, width: 80, height: 20 },
          fillStyle: "#bfdbfe"
        });
      }
    );

    expect(parent.toMarkup()).toMatchInlineSnapshot(`
      "<g>
        <text data-quirekit-command-id="title" fill="#111" style="font: 16px sans-serif; white-space: pre; user-select: none; -webkit-user-select: none" x="0" xml:space="preserve" y="16">Draw</text>
        <svg data-quirekit-command-id="cropped-image" height="30" preserveAspectRatio="none" viewBox="20 10 160 80" width="40" x="48" y="0">
          <image height="100" href="blob:picture" width="200" x="0" y="0"></image>
        </svg>
        <g clip-path="url(#clip-clip)" data-quirekit-command-id="clip" transform="matrix(0 1 -1 0 60 0)">
          <rect data-quirekit-command-id="inside" fill="#bfdbfe" height="20" width="80" x="0" y="20"></rect>
        </g>
      </g>"
    `);
    expect(defs.toMarkup()).toContain("clipPath");
  });
});

/** Fake SVG document used by runtime synchronization tests. */
class FakeSvgDocument {
  /**
   * Creates a fake namespaced element.
   *
   * @param namespace - Element namespace URI.
   * @param tagName - Element tag name.
   * @returns Fake SVG element.
   */
  createElementNS(namespace: string, tagName: string): FakeSvgElement {
    return new FakeSvgElement(this, namespace, tagName);
  }
}

/** Fake glyph-run renderer used by live SVG sync tests. */
class FakeSvgGlyphRunRenderer implements SvgGlyphRunRenderer {
  /**
   * Creates a custom SVG group for one glyph-run command.
   *
   * @param command - Glyph-run command being rendered.
   * @param context - Live SVG rendering context.
   * @returns Custom SVG group that replaces fallback text output.
   */
  renderGlyphRun(
    command: Parameters<SvgGlyphRunRenderer["renderGlyphRun"]>[0],
    context: Parameters<SvgGlyphRunRenderer["renderGlyphRun"]>[1]
  ): SVGElement {
    const group = context.document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g"
    ) as SVGElement;

    group.setAttribute("data-custom-glyph-run", command.id);
    group.setAttribute("data-custom-glyph-count", String(command.glyphs.length));

    return group;
  }
}

/** Fake SVG element used by runtime synchronization tests. */
class FakeSvgElement {
  /** Child nodes appended to this element. */
  readonly children: FakeSvgElement[] = [];

  /** Attribute values assigned to this element. */
  readonly attributes = new Map<string, string>();

  /** Text content assigned to this element. */
  textContent = "";

  /** Raw HTML assigned to this element. */
  innerHTML = "";

  /**
   * Creates a fake SVG element.
   *
   * @param ownerDocument - Fake owner document.
   * @param namespace - Element namespace URI.
   * @param tagName - Element tag name.
   */
  constructor(
    readonly ownerDocument: FakeSvgDocument,
    readonly namespace: string,
    readonly tagName: string
  ) {}

  /**
   * Assigns one attribute.
   *
   * @param name - Attribute name.
   * @param value - Attribute value.
   */
  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  /**
   * Appends child nodes.
   *
   * @param children - Children to append.
   */
  append(...children: FakeSvgElement[]): void {
    this.children.push(...children);
  }

  /**
   * Replaces all child nodes.
   *
   * @param children - New children.
   */
  replaceChildren(...children: FakeSvgElement[]): void {
    this.children.length = 0;
    this.children.push(...children);
  }

  /**
   * Serializes this fake element for assertions.
   *
   * @param indent - Current indentation width.
   * @returns Deterministic markup string.
   */
  toMarkup(indent = 0): string {
    const prefix = " ".repeat(indent);
    const attributes = [...this.attributes.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, value]) => `${name}="${escapeTestAttribute(value)}"`)
      .join(" ");
    const open = attributes.length === 0
      ? `<${this.tagName}>`
      : `<${this.tagName} ${attributes}>`;

    if (this.children.length === 0) {
      return `${prefix}${open}${escapeTestText(this.textContent)}${this.innerHTML}</${this.tagName}>`;
    }

    return [
      `${prefix}${open}`,
      ...this.children.map((child) => child.toMarkup(indent + 2)),
      `${prefix}</${this.tagName}>`
    ].join("\n");
  }
}

/**
 * Escapes fake markup attribute text.
 *
 * @param value - Attribute value.
 * @returns Escaped value.
 */
function escapeTestAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 * Escapes fake markup text content.
 *
 * @param value - Text content.
 * @returns Escaped text content.
 */
function escapeTestText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
