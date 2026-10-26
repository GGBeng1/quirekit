import { describe, expect, it } from "vitest";
import { serializeSvgDisplayListToSvg } from "../svg";
import { compileQuireViewNode } from "./compiler";
import { qkView } from "./qk-view";

describe("Quire view widget compiler", () => {
  it("compiles composed widgets into a display list and SVG-compatible commands", () => {
    const view = qkView.surface({
      id: "callout",
      width: 240,
      height: 64,
      style: {
        fill: "#f8fafc",
        stroke: { color: "#94a3b8", width: 1 }
      },
      padding: qkView.insets({ top: 12, right: 12, bottom: 12, left: 12 }),
      child: qkView.flex({
        id: "callout-content",
        direction: "row",
        gap: 8,
        children: [
          qkView.box({
            id: "marker",
            width: 12,
            height: 12,
            style: { fill: "#fbbf24" }
          }),
          qkView.text({
            id: "title",
            text: "retained view block",
            style: {
              font: "700 16px sans-serif",
              color: "#111827"
            }
          })
        ]
      })
    });
    const result = compileQuireViewNode({
      id: "widget",
      node: view,
      origin: { x: 20, y: 30 },
      constraints: {
        minWidth: 0,
        maxWidth: 400,
        minHeight: 0,
        maxHeight: 200
      },
      measureText: (text) => ({
        width: text.length * 9,
        height: 20
      })
    });

    expect(result.rect).toEqual({
      x: 20,
      y: 30,
      width: 240,
      height: 64
    });
    expect(result.displayList.commands.map((command) => command.kind)).toEqual([
      "fill-rect",
      "path",
      "fill-rect",
      "text"
    ]);
    expect(result.displayList.commands.at(-1)).toMatchObject({
      id: "title:text",
      kind: "text",
      origin: { x: 52, y: 58 }
    });
    expect(serializeSvgDisplayListToSvg({ displayList: result.displayList })).toContain(
      "retained view block"
    );
  });

  it("compiles clamped rounded box geometry as renderer-neutral paths", () => {
    const result = compileQuireViewNode({
      id: "rounded-widget",
      node: qkView.box({
        id: "round-handle",
        width: 8,
        height: 8,
        style: {
          fill: "#2563eb",
          borderRadius: 20
        }
      }),
      origin: { x: 10, y: 20 },
      constraints: {
        minWidth: 0,
        maxWidth: 40,
        minHeight: 0,
        maxHeight: 40
      }
    });

    expect(result.displayList.commands).toEqual([
      expect.objectContaining({
        id: "round-handle:fill",
        kind: "path",
        rect: { x: 10, y: 20, width: 8, height: 8 },
        fillStyle: "#2563eb",
        segments: expect.arrayContaining([
          expect.objectContaining({
            kind: "quadratic-curve-to",
            control: { x: 18, y: 20 },
            point: { x: 18, y: 24 }
          })
        ])
      })
    ]);
    expect(serializeSvgDisplayListToSvg({ displayList: result.displayList }))
      .toContain("Q 18 20 18 24");
  });

  it("carries widget stroke dashes through rectangular and rounded paths", () => {
    const compile = (borderRadius?: number) => compileQuireViewNode({
      id: "dashed-widget",
      node: qkView.box({
        id: borderRadius === undefined ? "square" : "rounded",
        width: 80,
        height: 40,
        style: {
          ...(borderRadius === undefined ? {} : { borderRadius }),
          stroke: {
            color: "#2563eb",
            width: 2,
            lineDash: [8, 4]
          }
        }
      }),
      origin: { x: 10, y: 20 },
      constraints: {
        minWidth: 0,
        maxWidth: 100,
        minHeight: 0,
        maxHeight: 60
      }
    });

    for (const result of [compile(), compile(6)]) {
      expect(result.displayList.commands).toEqual([
        expect.objectContaining({
          kind: "path",
          lineDash: [8, 4]
        })
      ]);
      expect(serializeSvgDisplayListToSvg({ displayList: result.displayList }))
        .toContain('stroke-dasharray="8 4"');
    }
  });

  it("emits interaction targets for semantic and eventful widgets", () => {
    const result = compileQuireViewNode({
      id: "widget",
      node: qkView.surface({
        id: "callout",
        role: "button",
        part: "root",
        owner: {
          kind: "document-node",
          id: "callout-1",
          name: "callout"
        },
        width: 120,
        height: 32,
        onClick: { handler: "callout.open" },
        interaction: {
          cursor: "pointer",
          captureCursor: "none"
        },
        child: qkView.text({
          id: "label",
          text: "Open"
        })
      }),
      origin: { x: 10, y: 20 },
      constraints: {
        minWidth: 0,
        maxWidth: 200,
        minHeight: 0,
        maxHeight: 80
      },
      measureText: (text) => ({
        width: text.length * 8,
        height: 16
      })
    });

    expect(result.targets).toEqual([
      expect.objectContaining({
        id: "callout",
        nodePath: "0",
        rect: { x: 10, y: 20, width: 120, height: 32 },
        role: "button",
        part: "root",
        owner: {
          kind: "document-node",
          id: "callout-1",
          name: "callout"
        },
        cursor: "pointer",
        captureCursor: "none",
        pointerEvents: "auto",
        events: {
          click: { handler: "callout.open" }
        }
      })
    ]);
  });

  it("emits owner-only targets without default pointer participation", () => {
    const result = compileQuireViewNode({
      id: "widget",
      node: qkView.surface({
        id: "owned-preview",
        owner: {
          kind: "decoration",
          id: "comment-1",
          metadata: {
            source: "comment"
          }
        },
        width: 120,
        height: 32,
        child: qkView.text({
          id: "label",
          text: "Comment"
        })
      }),
      origin: { x: 10, y: 20 },
      constraints: {
        minWidth: 0,
        maxWidth: 200,
        minHeight: 0,
        maxHeight: 80
      },
      measureText: (text) => ({
        width: text.length * 8,
        height: 16
      })
    });

    expect(result.targets).toEqual([
      expect.objectContaining({
        id: "owned-preview",
        owner: {
          kind: "decoration",
          id: "comment-1",
          metadata: {
            source: "comment"
          }
        },
        pointerEvents: "none",
        events: {}
      })
    ]);
  });

  it("lays out surface chrome, flex spacers, and dividers", () => {
    const result = compileQuireViewNode({
      id: "surface-root",
      node: qkView.surface({
        id: "panel",
        width: 260,
        height: 72,
        style: {
          fill: "#ffffff",
          stroke: { color: "#cbd5e1", width: 1 }
        },
        padding: qkView.insets(12),
        child: qkView.flex({
          direction: "row",
          gap: 8,
          children: [
            qkView.box({
              id: "marker",
              width: 12,
              height: 12,
              style: { fill: "#fbbf24" }
            }),
            qkView.text({
              id: "label",
              text: "Title",
              width: 50,
              height: 20
            }),
            qkView.spacer({ id: "push", flex: 1 }),
            qkView.divider({
              id: "divider",
              axis: "vertical",
              height: 32,
              style: { color: "#cbd5e1", width: 2 }
            })
          ]
        })
      }),
      origin: { x: 20, y: 30 },
      constraints: {
        minWidth: 0,
        maxWidth: 300,
        minHeight: 0,
        maxHeight: 120
      }
    });

    expect(result.rect).toEqual({ x: 20, y: 30, width: 260, height: 72 });
    expect(result.displayList.commands).toEqual([
      expect.objectContaining({
        id: "panel:fill",
        kind: "fill-rect",
        rect: { x: 20, y: 30, width: 260, height: 72 }
      }),
      expect.objectContaining({
        id: "panel:stroke",
        kind: "path",
        rect: { x: 20, y: 30, width: 260, height: 72 }
      }),
      expect.objectContaining({
        id: "marker:fill",
        kind: "fill-rect",
        rect: { x: 32, y: 42, width: 12, height: 12 }
      }),
      expect.objectContaining({
        id: "label:text",
        kind: "text",
        rect: { x: 52, y: 42, width: 50, height: 20 }
      }),
      expect.objectContaining({
        id: "divider:line",
        kind: "line",
        from: { x: 267, y: 42 },
        to: { x: 267, y: 74 },
        lineWidth: 2
      })
    ]);
  });

  it("ellipsizes a single-line paragraph preview", () => {
    const result = compileQuireViewNode({
      id: "paragraph-root",
      node: qkView.paragraphPreview({
        id: "body",
        text: "Alpha beta gamma",
        width: 64,
        maxLines: 1,
        overflow: "ellipsis",
        whiteSpace: "nowrap",
        style: {
          font: "16px sans-serif",
          lineHeight: 20,
          baselineOffset: 15
        }
      }),
      origin: { x: 4, y: 8 },
      constraints: {
        minWidth: 0,
        maxWidth: 100,
        minHeight: 0,
        maxHeight: 80
      },
      measureText: (text) => ({
        width: text.length * 8,
        height: 20
      })
    });

    expect(result.rect).toEqual({ x: 4, y: 8, width: 64, height: 20 });
    expect(result.displayList.commands).toEqual([
      expect.objectContaining({
        id: "body:line-0",
        kind: "text",
        text: "Alpha b…",
        rect: { x: 4, y: 8, width: 64, height: 20 },
        origin: { x: 4, y: 23 }
      })
    ]);
  });

  it("wraps paragraph preview text across multiple lines", () => {
    const result = compileQuireViewNode({
      id: "paragraph-root",
      node: qkView.paragraphPreview({
        id: "body",
        text: "Alpha beta gamma",
        width: 48,
        overflow: "visible",
        style: {
          font: "16px sans-serif",
          lineHeight: 20,
          baselineOffset: 15
        }
      }),
      origin: { x: 4, y: 8 },
      constraints: {
        minWidth: 0,
        maxWidth: 100,
        minHeight: 0,
        maxHeight: 80
      },
      measureText: (text) => ({
        width: text.length * 8,
        height: 20
      })
    });

    expect(result.rect).toEqual({ x: 4, y: 8, width: 48, height: 60 });
    expect(result.displayList.commands).toEqual([
      expect.objectContaining({
        id: "body:line-0",
        kind: "text",
        text: "Alpha",
        rect: { x: 4, y: 8, width: 48, height: 20 }
      }),
      expect.objectContaining({
        id: "body:line-1",
        kind: "text",
        text: "beta",
        rect: { x: 4, y: 28, width: 48, height: 20 }
      }),
      expect.objectContaining({
        id: "body:line-2",
        kind: "text",
        text: "gamma",
        rect: { x: 4, y: 48, width: 48, height: 20 }
      })
    ]);
  });

  it("wraps child commands in clip commands", () => {
    const result = compileQuireViewNode({
      id: "clip-root",
      node: qkView.clip({
        width: 80,
        height: 24,
        child: qkView.text({ text: "clipped text" })
      }),
      origin: { x: 0, y: 0 },
      constraints: {
        minWidth: 0,
        maxWidth: 100,
        minHeight: 0,
        maxHeight: 40
      }
    });

    expect(result.displayList.commands).toEqual([
      expect.objectContaining({
        id: "clip-root:0:clip",
        kind: "clip",
        rect: { x: 0, y: 0, width: 80, height: 24 },
        commands: [
          expect.objectContaining({
            kind: "text",
            text: "clipped text"
          })
        ]
      })
    ]);
  });

  it("emits DOM overlay descriptors with resolved geometry", () => {
    const result = compileQuireViewNode({
      id: "overlay-root",
      node: qkView.domOverlay({
        id: "button",
        width: 96,
        height: 32,
        html: "<button>Open</button>",
        role: "button",
        ariaLabel: "Open panel"
      }),
      origin: { x: 10, y: 20 },
      range: { from: 1, to: 2 },
      constraints: {
        minWidth: 0,
        maxWidth: 200,
        minHeight: 0,
        maxHeight: 100
      }
    });

    expect(result.displayList.commands).toEqual([]);
    expect(result.domOverlays).toEqual([
      {
        id: "button",
        range: { from: 1, to: 2 },
        rect: { x: 10, y: 20, width: 96, height: 32 },
        html: "<button>Open</button>",
        role: "button",
        pointerEvents: "auto",
        ariaLabel: "Open panel"
      }
    ]);
  });

  it("emits an explicit pass-through policy for visual-only DOM overlays", () => {
    const result = compileQuireViewNode({
      id: "visual-overlay-root",
      node: qkView.domOverlay({
        width: 48,
        height: 20,
        html: "<span>Label</span>"
      }),
      origin: { x: 4, y: 8 },
      constraints: {
        minWidth: 0,
        maxWidth: 100,
        minHeight: 0,
        maxHeight: 40
      }
    });

    expect(result.domOverlays).toEqual([
      expect.objectContaining({
        pointerEvents: "none"
      })
    ]);
  });

  it("passes runtime host metadata to custom paint widgets", () => {
    const hostSurface = { tagName: "canvas" };
    const hostKinds: string[] = [];
    const result = compileQuireViewNode({
      id: "custom-root",
      host: {
        kind: "canvas",
        surface: hostSurface
      },
      node: qkView.customPaint({
        id: "custom",
        width: 24,
        height: 12,
        paint: (rect, id, runtime) => {
          hostKinds.push(runtime.host?.kind ?? "none");

          return [{
            id,
            kind: "fill-rect",
            rect,
            fillStyle: runtime.host?.surface === hostSurface ? "#10b981" : "#ef4444"
          }];
        }
      }),
      origin: { x: 2, y: 4 },
      constraints: {
        minWidth: 0,
        maxWidth: 100,
        minHeight: 0,
        maxHeight: 40
      }
    });

    expect(hostKinds).toEqual(["canvas"]);
    expect(result.displayList.commands).toEqual([
      expect.objectContaining({
        id: "custom",
        kind: "fill-rect",
        fillStyle: "#10b981"
      })
    ]);
  });
});
