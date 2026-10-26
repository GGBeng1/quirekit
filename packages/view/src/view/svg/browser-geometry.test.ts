import type { QuireLayoutQueryProductOwner } from "@quirekit/layout/products";
import type { QuireViewRenderResult } from "../types";
import type { QuireGlyphRunCommand, QuireRect } from "@quirekit/renderer";
import type {
  QuireClientPoint,
  QuireClientRect,
  QuireHitTestResult,
  QuireSelectionGeometry
} from "@quirekit/view-engine";
import type { QuireViewCoordsAtPosResult } from "../shared";
import type { QuireHitTarget } from "@quirekit/view-engine";
import type { QuireLayoutSnapshot } from "@quirekit/view-engine";
import { describe, expect, it } from "vitest";
import {
  createSvgGeometryProvider,
  createSvgBrowserMeasuredRenderResult,
  resolveSvgBrowserMeasurementHitContext
} from "./browser-geometry";
import type { QuireSelectionGeometryContext } from "@quirekit/view-engine";
import { resolveQuireViewCoordsAtPosWithProvenance } from "../shared";

describe("SVG browser-measured geometry", () => {
  it.each(["text", "glyph-run"] as const)("preserves layout-owned trailing spacing for %s interaction", (kind) => {
    const renderResult = createRenderResult({
      text: "中文",
      selection: { from: 24, to: 26, empty: false },
      shapedSelectionRect: { x: 88, y: 160, width: 25, height: 24 }
    });
    const command = {
      ...renderResult.contentDisplayList.commands[0] as QuireGlyphRunCommand,
      kind, trailingSpacing: 5, rect: { x: 88, y: 160, width: 25, height: 24 }
    };
    const provider = createSvgGeometryProvider({
      renderResult: {
        ...renderResult,
        contentDisplayList: { ...renderResult.contentDisplayList, commands: [command] }
      },
      textRoots: [createFakeSvgTextRoot(new FakeSvgTextElement({
        commandId: command.id, text: command.text,
        starts: new Map([[0, 88], [1, 98], [2, 108]])
      }))]
    });
    expect(provider.resolveSelectionGeometry()).toEqual(renderResult.selectionGeometry);
    const surfaceClientRect = { left: 0, top: 0, width: 800, height: 400 };
    const retained = {
      source: "viewport-fallback" as const,
      rect: { x: 113, y: 160, width: 1, height: 24 }
    };
    expect(provider.refineCoordsAtPos({
      pos: 26, retainedRectAtPosition: retained, surfaceClientRect
    })).toEqual({ left: 113, right: 114, top: 160, bottom: 184 });
    const hit = {
      kind: "position" as const, position: { pos: 26, bias: -1 as const },
      inside: 24, rect: command.rect
    };
    expect(provider.hitTest({
      clientPoint: { clientX: 103, clientY: 170 },
      retainedDocumentPoint: { x: 103, y: 170 },
      retainedHitTestResult: hit, surfaceClientRect
    })).toEqual(hit);
  });

  it.each(["text", "glyph-run"] as const)("excludes decorative %s passes from every geometry read", (kind) => {
    const renderResult = createRenderResult({
      text: "abc",
      selection: { from: 25, to: 27, empty: false },
      shapedSelectionRect: { x: 98, y: 160, width: 20, height: 24 }
    });
    const base = renderResult.contentDisplayList.commands[0] as QuireGlyphRunCommand;
    // A stroked foreground remains authoritative; its translated duplicate does not.
    const content = { ...base, kind, id: "content", paintMode: "stroke" as const };
    const decoration = {
      ...content,
      id: "decoration",
      geometryRole: "decoration" as const,
      rect: { ...content.rect, x: content.rect.x - 1 },
      origin: { ...content.origin, x: content.origin.x - 1 }
    };
    const elements = [decoration, content].map(command => new FakeSvgTextElement({
      commandId: command.id,
      text: command.text,
      starts: new Map([0, 1, 2, 3].map(index => [index, command.origin.x + index * 10]))
    }));
    const provider = createSvgGeometryProvider({
      renderResult: {
        ...renderResult,
        contentDisplayList: { ...renderResult.contentDisplayList, commands: [decoration, content] }
      },
      textRoots: [createFakeSvgTextRoot(elements)]
    });
    expect(provider.measurements.map(measurement => measurement.command.id)).toEqual(["content"]);
    expect(provider.resolveSelectionGeometry().ranges[0]?.rect).toEqual({ x: 98, y: 160, width: 20, height: 24 });
    const surfaceClientRect = { left: 0, top: 0, width: 800, height: 400 };
    const retained = resolveQuireViewCoordsAtPosWithProvenance({
      geometrySnapshot: renderResult.interactionSnapshot, pos: 26, surfaceClientRect
    });
    expect(provider.refineCoordsAtPos({
      pos: 26, retainedRectAtPosition: retained.rectAtPosition, surfaceClientRect
    })).toEqual({ left: 108, right: 109, top: 160, bottom: 184 });
    const hit = resolveSvgBrowserMeasurementHitContext({
      geometrySnapshot: renderResult.interactionSnapshot,
      clientPoint: { clientX: 113, clientY: 170 }, surfaceClientRect
    });
    expect(provider.hitTest({
      clientPoint: hit.clientPoint, retainedDocumentPoint: hit.documentPoint,
      retainedHitTestResult: hit.hitTestResult, surfaceClientRect
    })).toMatchObject({ kind: "position", position: { pos: 27, bias: -1 } });
    expect(provider.runWidthProbe().textNodeCount).toBe(1);
    expect(elements[0]?.computedTextLengthCalls).toBe(0);
    expect(elements[0]?.subStringLengthCalls).toBe(0);
  });

  it("rebuilds selection rectangles from rendered SVG text positions", () => {
    const text = "One document, rendered three ways. The same editor state drives the ";
    const nativeStarts = new Map<number, number>([
      [44, 475.8671875],
      [45, 483.71484375],
      [46, 491.5625],
      [47, 499.41015625],
      [48, 507.2578125],
      [49, 515.10546875],
      [50, 522.953125]
    ]);
    const result = createSvgBrowserMeasuredRenderResult({
      renderResult: createRenderResult({
        text,
        selection: { from: 68, to: 74, empty: false },
        shapedSelectionRect: {
          x: 477.94130363397545,
          y: 160,
          width: 46.99292633537658,
          height: 24
        }
      }),
      textRoots: [
        createFakeSvgTextRoot(
          new FakeSvgTextElement({
            commandId: "paragraph-1:text",
            text,
            starts: nativeStarts
          })
        )
      ]
    });

    expect(result.selectionGeometry.ranges[0]?.rect).toEqual({
      x: 475.8671875,
      y: 160,
      width: 47.0859375,
      height: 24
    });
    expect(
      result.overlayDisplayList.commands.find(
        (command) => command.id === "selection-range-0"
      )
    ).toMatchObject({
      rect: {
        x: 475.8671875,
        width: 47.0859375
      }
    });
  });

  it("preserves exact structured range boxes instead of refining their glyphs", () => {
    const result = createSvgBrowserMeasuredRenderResult({
      renderResult: createRenderResultFromTextCommands({
        selection: { from: 20, to: 40, empty: false },
        shapedSelectionRect: {
          x: 80,
          y: 200,
          width: 420,
          height: 48
        },
        selectionGeometry: {
          carets: [],
          ranges: [{
            range: { from: 20, to: 40 },
            rect: { x: 80, y: 200, width: 420, height: 48 },
            measurementPolicy: "preserve"
          }]
        },
        commands: [{
          id: "table-row-1:text",
          text: "row text",
          range: { from: 24, to: 32 },
          rect: { x: 92, y: 210, width: 80, height: 24 },
          origin: { x: 92, y: 227 }
        }]
      }),
      textRoots: [
        createFakeSvgTextRoot(
          new FakeSvgTextElement({
            commandId: "table-row-1:text",
            text: "row text",
            starts: new Map([
              [0, 92],
              [8, 172]
            ])
          })
        )
      ]
    });

    expect(result.selectionGeometry.ranges).toEqual([{
      range: { from: 20, to: 40 },
      rect: { x: 80, y: 200, width: 420, height: 48 },
      measurementPolicy: "preserve"
    }]);
  });

  it("measures only retained selection instances and preserves query owner", () => {
    const activeOwner = createSvgBrowserGeometryQueryOwner("cell#p5");
    const result = createSvgBrowserMeasuredRenderResult({
      renderResult: createRenderResultFromTextCommands({
        selection: { from: 24, to: 27, empty: false },
        shapedSelectionRect: {
          x: 88,
          y: 260,
          width: 30,
          height: 24
        },
        selectionGeometry: {
          carets: [],
          ranges: [
            {
              range: { from: 24, to: 27 },
              rect: { x: 88, y: 260, width: 30, height: 24 },
              queryOwner: activeOwner
            }
          ]
        },
        commands: [
          {
            id: "paragraph-page-3:text",
            text: "abc",
            range: { from: 24, to: 27 },
            rect: { x: 88, y: 160, width: 30, height: 24 },
            origin: { x: 88, y: 177 }
          },
          {
            id: "paragraph-page-5:text",
            text: "abc",
            range: { from: 24, to: 27 },
            rect: { x: 88, y: 260, width: 30, height: 24 },
            origin: { x: 88, y: 277 }
          }
        ]
      }),
      textRoots: [
        createFakeSvgTextRoot([
          new FakeSvgTextElement({
            commandId: "paragraph-page-3:text",
            text: "abc",
            starts: new Map([
              [0, 88],
              [1, 98],
              [2, 108],
              [3, 118]
            ])
          }),
          new FakeSvgTextElement({
            commandId: "paragraph-page-5:text",
            text: "abc",
            starts: new Map([
              [0, 88],
              [1, 98],
              [2, 108],
              [3, 118]
            ])
          })
        ])
      ]
    });

    expect(result.selectionGeometry.ranges).toEqual([
      {
        range: { from: 24, to: 27 },
        rect: { x: 88, y: 260, width: 30, height: 24 },
        queryOwner: activeOwner
      }
    ]);
  });

  it("drops page-local chunks when browser measurements rebuild the overlay", () => {
    const renderResult = createRenderResult({
      text: "abc",
      selection: { from: 24, to: 27, empty: false },
      shapedSelectionRect: {
        x: 88,
        y: 160,
        width: 60,
        height: 24
      }
    });
    const chunk = {
      retainedRecord: {
        key: "page:0",
        kind: "page-local" as const,
        rect: { x: 0, y: 0, width: 800, height: 400 },
        pageIndex: 0,
        pageRect: { x: 0, y: 0, width: 800, height: 400 }
      },
      sourceOwnerKeys: ["layout-node:paragraph-1"],
      pageIndex: 0,
      pageRect: { x: 0, y: 0, width: 800, height: 400 },
      contentDirtyBounds: { x: 0, y: 0, width: 800, height: 400 },
      overlayDirtyBounds: { x: 0, y: 0, width: 800, height: 400 },
      contentDisplayList: renderResult.contentDisplayList,
      overlayDisplayList: {
        bounds: { x: 0, y: 0, width: 800, height: 400 },
        commands: [
          {
            id: "selection-range-stale",
            kind: "fill-rect",
            rect: { x: 1, y: 1, width: 1, height: 1 },
            fillStyle: "rgba(250, 204, 21, 0.34)"
          }
        ]
      }
    };
    const chunkIndex = {
      bounds: { x: 0, y: 0, width: 800, height: 400 },
      chunks: [chunk],
      chunksByPageIndex: {
        0: chunk
      }
    };
    const result = createSvgBrowserMeasuredRenderResult({
      renderResult: {
        ...renderResult,
        pageDisplayListChunks: chunkIndex
      } as QuireViewRenderResult,
      textRoots: [
        createFakeSvgTextRoot(
          new FakeSvgTextElement({
            commandId: "paragraph-1:text",
            text: "abc",
            starts: new Map([
              [0, 88],
              [1, 98],
              [2, 108],
              [3, 118]
            ])
          })
        )
      ]
    });

    expect(result.overlayDisplayList.commands).toEqual([]);
    expect(result.pageDisplayListChunks?.chunks[0]?.overlayDisplayList.commands)
      .toContainEqual(expect.objectContaining({ id: "selection-range-0" }));
    expect(result.pageDisplayListChunks?.chunks[0]?.overlayDisplayList.commands)
      .not.toContainEqual(expect.objectContaining({ id: "selection-range-stale" }));
  });

  it("keeps selection continuous across zero-width SVG ligature components", () => {
    const text = "flowing";
    const result = createSvgBrowserMeasuredRenderResult({
      renderResult: createRenderResult({
        text,
        selection: { from: 24, to: 31, empty: false },
        shapedSelectionRect: {
          x: 88,
          y: 160,
          width: 80,
          height: 24
        }
      }),
      textRoots: [
        createFakeSvgTextRoot(
          new FakeSvgTextElement({
            commandId: "paragraph-1:text",
            text,
            starts: new Map([
              [0, 88],
              [1, 98],
              [2, 118],
              [3, 128],
              [4, 138],
              [5, 148],
              [6, 158],
              [7, 168]
            ]),
            // Some browsers report the `l` in an `fl` ligature as a collapsed
            // character box. The overlay selection must still cover its visual
            // share of the ligature instead of leaving a white vertical gap.
            ends: new Map([[1, 98]])
          })
        )
      ]
    });

    expect(result.selectionGeometry.ranges.map((range) => range.rect)).toEqual([
      { x: 88, y: 160, width: 80, height: 24 }
    ]);
  });

  it("rebuilds collapsed carets from rendered SVG text positions", () => {
    const text = "abc";
    const result = createSvgBrowserMeasuredRenderResult({
      renderResult: createRenderResult({
        text,
        selection: { from: 26, to: 26, empty: true },
        shapedSelectionRect: {
          x: 24,
          y: 160,
          width: 1,
          height: 24
        }
      }),
      textRoots: [
        createFakeSvgTextRoot(
          new FakeSvgTextElement({
            commandId: "paragraph-1:text",
            text,
            starts: new Map([[2, 19.5]])
          })
        )
      ]
    });

    expect(result.selectionGeometry.carets[0]?.rect).toEqual({
      x: 19.5,
      y: 160,
      width: 1,
      height: 24
    });
  });

  it("preserves IME preedit caret geometry instead of remeasuring it as a plain selection", () => {
    const result = createSvgBrowserMeasuredRenderResult({
      renderResult: createRenderResultFromTextCommands({
        selection: { from: 24, to: 24, empty: true },
        shapedSelectionRect: {
          x: 118,
          y: 160,
          width: 1,
          height: 24
        },
        commands: [
          {
            id: "paragraph-1:text",
            text: "ni",
            range: { from: 24, to: 24 },
            rect: { x: 88, y: 160, width: 30, height: 24 },
            origin: { x: 88, y: 177 }
          }
        ]
      }),
      textRoots: [
        createFakeSvgTextRoot(
          new FakeSvgTextElement({
            commandId: "paragraph-1:text",
            text: "ni",
            starts: new Map([
              [0, 88],
              [2, 118]
            ])
          })
        )
      ],
      preserveSelectionGeometry: true
    });

    expect(result.selectionGeometry.carets[0]?.rect).toEqual({
      x: 118,
      y: 160,
      width: 1,
      height: 24
    });
  });

  it("reports a browser width probe when explicitly enabled", () => {
    const textElement = new FakeSvgTextElement({
      commandId: "paragraph-1:text",
      text: "abc",
      starts: new Map([[0, 88]])
    });
    const phases: string[] = [];

    createSvgBrowserMeasuredRenderResult({
      renderResult: createRenderResult({
        text: "abc",
        selection: { from: 24, to: 24, empty: true },
        shapedSelectionRect: {
          x: 88,
          y: 160,
          width: 1,
          height: 24
        }
      }),
      textRoots: [createFakeSvgTextRoot(textElement)],
      browserMeasureProbe: true,
      trace: (phase) => {
        phases.push(phase.name);
      }
    });

    expect(phases).toEqual(
      expect.arrayContaining(["svg-browser-measure:width-probe"])
    );
    expect(textElement.computedTextLengthCalls).toBe(1);
    expect(textElement.subStringLengthCalls).toBe(1);
  });

  it("routes SVG geometry reads through one provider seam", () => {
    const text = "abc";
    const textElement = new FakeSvgTextElement({
      commandId: "paragraph-1:text",
      text,
      starts: new Map([
        [0, 88],
        [1, 98],
        [2, 108],
        [3, 118]
      ])
    });
    const renderResult = createRenderResult({
      text,
      selection: { from: 25, to: 27, empty: false },
      shapedSelectionRect: {
        x: 98,
        y: 160,
        width: 20,
        height: 24
      }
    });
    const surfaceClientRect = { left: 0, top: 0, width: 800, height: 400 };
    const retainedCoords = resolveQuireViewCoordsAtPosWithProvenance({
      geometrySnapshot: renderResult.interactionSnapshot,
      pos: 26,
      surfaceClientRect
    });
    const retainedHit = resolveSvgBrowserMeasurementHitContext({
      geometrySnapshot: renderResult.interactionSnapshot,
      clientPoint: { clientX: 113, clientY: 170 },
      surfaceClientRect
    });
    const provider = createSvgGeometryProvider({
      renderResult,
      textRoots: [createFakeSvgTextRoot(textElement)]
    });

    expect(provider.resolveSelectionGeometry().ranges[0]?.rect).toEqual({
      x: 98,
      y: 160,
      width: 20,
      height: 24
    });
    expect(provider.refineCoordsAtPos({
      pos: 26,
      retainedRectAtPosition: retainedCoords.rectAtPosition,
      surfaceClientRect
    })).toEqual({ left: 108, right: 109, top: 160, bottom: 184 });
    expect(provider.hitTest({
      clientPoint: retainedHit.clientPoint,
      retainedDocumentPoint: retainedHit.documentPoint,
      retainedHitTestResult: retainedHit.hitTestResult,
      surfaceClientRect
    })).toMatchObject({
      kind: "position",
      position: { pos: 27, bias: -1 }
    });

    expect(provider.runWidthProbe()).toEqual({
      textNodeCount: 1,
      characterCount: 3,
      textLengthReads: 1,
      subStringLengthReads: 1
    });

    expect(textElement.computedTextLengthCalls).toBe(1);
    expect(textElement.subStringLengthCalls).toBe(1);
  });

  it("keeps both caret positions at mixed-direction text boundaries", () => {
    const result = createSvgBrowserMeasuredRenderResult({
      renderResult: createRenderResultFromTextCommands({
        selection: { from: 30, to: 30, empty: true },
        shapedSelectionRect: {
          x: 332,
          y: 160,
          width: 1,
          height: 24
        },
        commands: [
          {
            id: "paragraph-1:text-0",
            text: "Hello ",
            range: { from: 24, to: 30 },
            rect: { x: 88, y: 160, width: 244, height: 24 },
            origin: { x: 88, y: 177 },
            direction: "ltr"
          },
          {
            id: "paragraph-1:text-1",
            text: "אבג",
            range: { from: 30, to: 33 },
            rect: { x: 332, y: 160, width: 38, height: 24 },
            origin: { x: 370, y: 177 },
            direction: "rtl"
          }
        ]
      }),
      textRoots: [
        createFakeSvgTextRoot([
          new FakeSvgTextElement({
            commandId: "paragraph-1:text-0",
            text: "Hello ",
            starts: new Map([[0, 88]]),
            ends: new Map([[5, 332]])
          }),
          new FakeSvgTextElement({
            commandId: "paragraph-1:text-1",
            text: "אבג",
            starts: new Map([[0, 370]]),
            ends: new Map([[2, 332]])
          })
        ])
      ]
    });

    expect(result.selectionGeometry.carets.map((caret) => caret.rect.x)).toEqual([
      332,
      370
    ]);
  });

  it("resolves coordsAtPos from SVG text boundaries by side", () => {
    const renderResult = createRenderResultFromTextCommands({
      selection: { from: 30, to: 30, empty: true },
      shapedSelectionRect: {
        x: 332,
        y: 160,
        width: 1,
        height: 24
      },
      commands: [
        {
          id: "paragraph-1:text-0",
          text: "Hello ",
          range: { from: 24, to: 30 },
          rect: { x: 88, y: 160, width: 244, height: 24 },
          origin: { x: 88, y: 177 },
          direction: "ltr"
        },
        {
          id: "paragraph-1:text-1",
          text: "אבג",
          range: { from: 30, to: 33 },
          rect: { x: 332, y: 160, width: 38, height: 24 },
          origin: { x: 370, y: 177 },
          direction: "rtl"
        }
      ]
    });
    const textRoots = [
      createFakeSvgTextRoot([
        new FakeSvgTextElement({
          commandId: "paragraph-1:text-0",
          text: "Hello ",
          starts: new Map([[0, 88]]),
          ends: new Map([[5, 332]])
        }),
        new FakeSvgTextElement({
          commandId: "paragraph-1:text-1",
          text: "אבג",
          starts: new Map([[0, 370]]),
          ends: new Map([[2, 332]])
        })
      ])
    ];

    const before = refineSvgBrowserCoordsAtPosWithRetainedContext({
      renderResult,
      textRoots,
      pos: 30,
      side: -1,
      surfaceClientRect: { left: 0, top: 0, width: 800, height: 400 }
    });
    const after = refineSvgBrowserCoordsAtPosWithRetainedContext({
      renderResult,
      textRoots,
      pos: 30,
      side: 1,
      surfaceClientRect: { left: 0, top: 0, width: 800, height: 400 }
    });

    expect(before).toEqual({ left: 332, right: 333, top: 160, bottom: 184 });
    expect(after).toEqual({ left: 370, right: 371, top: 160, bottom: 184 });
  });

  it("refines caret x without replacing retained run-relative vertical geometry", () => {
    const renderResult = createRenderResultFromTextCommands({
      selection: { from: 25, to: 25, empty: true },
      shapedSelectionRect: {
        x: 98,
        y: 168,
        width: 1,
        height: 18
      },
      commands: [{
        id: "paragraph-1:text-0",
        text: "small",
        range: { from: 24, to: 29 },
        rect: { x: 88, y: 160, width: 50, height: 34 },
        origin: { x: 88, y: 186 },
        direction: "ltr"
      }]
    });
    const textRoots = [
      createFakeSvgTextRoot([
        new FakeSvgTextElement({
          commandId: "paragraph-1:text-0",
          text: "small",
          starts: new Map([[1, 99]])
        })
      ])
    ];

    expect(createSvgGeometryProvider({ renderResult, textRoots }).refineCoordsAtPos({
      pos: 25,
      retainedRectAtPosition: {
        source: "layout-caret",
        rect: { x: 98, y: 168, width: 1, height: 18 }
      },
      surfaceClientRect: { left: 0, top: 0, width: 800, height: 400 }
    })).toEqual({
      left: 99,
      right: 100,
      top: 168,
      bottom: 186
    });
  });

  it("keeps a collapsed generated marker from overriding the retained body caret", () => {
    const renderResult = createRenderResultFromTextCommands({
      selection: { from: 8, to: 8, empty: true },
      shapedSelectionRect: {
        x: 288,
        y: 160,
        width: 1,
        height: 24
      },
      commands: [
        {
          id: "paragraph-0:word-marker",
          text: "•",
          range: { from: 8, to: 8 },
          rect: { x: 264, y: 160, width: 10, height: 24 },
          origin: { x: 264, y: 177 }
        },
        {
          id: "paragraph-0:text",
          text: "body",
          range: { from: 8, to: 12 },
          rect: { x: 288, y: 160, width: 40, height: 24 },
          origin: { x: 288, y: 177 }
        }
      ]
    });
    const textRoots = [
      createFakeSvgTextRoot([
        new FakeSvgTextElement({
          commandId: "paragraph-0:word-marker",
          text: "•",
          starts: new Map([[0, 264]])
        }),
        new FakeSvgTextElement({
          commandId: "paragraph-0:text",
          text: "body",
          starts: new Map([[0, 288]])
        })
      ])
    ];

    expect(createSvgGeometryProvider({ renderResult, textRoots }).refineCoordsAtPos({
      pos: 8,
      side: 1,
      retainedRectAtPosition: {
        source: "layout-caret",
        rect: { x: 288, y: 160, width: 1, height: 24 }
      },
      surfaceClientRect: { left: 0, top: 0, width: 800, height: 400 }
    })).toEqual({ left: 288, right: 289, top: 160, bottom: 184 });
  });

  it("filters browser coordsAtPos measurements through retained context", () => {
    const lowerOwner = createSvgBrowserGeometryQueryOwner("cell#p5");
    const renderResult = createRenderResultFromTextCommands({
      selection: { from: 5720, to: 5720, empty: true },
      shapedSelectionRect: {
        x: 88,
        y: 260,
        width: 1,
        height: 24
      },
      selectionGeometry: {
        carets: [
          {
            position: { pos: 5720, bias: 1 },
            rect: { x: 88, y: 260, width: 1, height: 24 },
            queryOwner: lowerOwner
          }
        ],
        ranges: []
      },
      interactionRootChildren: [
        createSvgBrowserRepeatedCaretNode(
          "wordTable-69:layout#p3",
          160,
          createSvgBrowserGeometryQueryOwner("cell#p3")
        ),
        createSvgBrowserRepeatedCaretNode(
          "wordTable-69:layout#p5",
          260,
          lowerOwner
        )
      ],
      commands: [
        {
          id: "paragraph-page-3:text",
          text: "abc",
          range: { from: 5720, to: 5723 },
          rect: { x: 88, y: 160, width: 30, height: 24 },
          origin: { x: 88, y: 177 }
        },
        {
          id: "paragraph-page-5:text",
          text: "abc",
          range: { from: 5720, to: 5723 },
          rect: { x: 88, y: 260, width: 30, height: 24 },
          origin: { x: 88, y: 277 }
        }
      ]
    });
    const textRoots = [
      createFakeSvgTextRoot([
        new FakeSvgTextElement({
          commandId: "paragraph-page-3:text",
          text: "abc",
          starts: new Map([
            [0, 88],
            [1, 98],
            [2, 108],
            [3, 118]
          ])
        }),
        new FakeSvgTextElement({
          commandId: "paragraph-page-5:text",
          text: "abc",
          starts: new Map([
            [0, 88],
            [1, 98],
            [2, 108],
            [3, 118]
          ])
        })
      ])
    ];

    expect(
      refineSvgBrowserCoordsAtPosWithRetainedContext({
        renderResult,
        textRoots,
        pos: 5720,
        side: 1,
        selectionContext: {
          queryOwner: lowerOwner,
          referenceRect: { x: 88, y: 260, width: 1, height: 24 }
        },
        surfaceClientRect: { left: 0, top: 0, width: 800, height: 400 }
      })
    ).toEqual({ left: 88, right: 89, top: 260, bottom: 284 });
  });

  it("splits non-monotonic browser text ranges into visual rectangles", () => {
    const text = "abאבcd";
    const result = createSvgBrowserMeasuredRenderResult({
      renderResult: createRenderResult({
        text,
        selection: { from: 24, to: 28, empty: false },
        shapedSelectionRect: {
          x: 88,
          y: 160,
          width: 60,
          height: 24
        }
      }),
      textRoots: [
        createFakeSvgTextRoot(
          new FakeSvgTextElement({
            commandId: "paragraph-1:text",
            text,
            starts: new Map([
              [0, 88],
              [1, 98],
              [2, 148],
              [3, 138],
              [4, 108],
              [5, 118]
            ]),
            ends: new Map([
              [0, 98],
              [1, 108],
              [2, 138],
              [3, 128],
              [4, 118],
              [5, 128]
            ])
          })
        )
      ]
    });

    expect(result.selectionGeometry.ranges.map((range) => range.rect)).toEqual([
      { x: 88, y: 160, width: 20, height: 24 },
      { x: 128, y: 160, width: 20, height: 24 }
    ]);
    expect(
      result.overlayDisplayList.commands
        .flatMap((command) =>
          command.kind === "fill-rect" && command.id.startsWith("selection-range-")
            ? [command.rect]
            : []
        )
    ).toEqual([
      { x: 88, y: 160, width: 20, height: 24 },
      { x: 128, y: 160, width: 20, height: 24 }
    ]);
  });

  it("hit-tests LTR text from browser character positions", () => {
    const text = "abc";
    const result = hitTestSvgBrowserTextWithRetainedContext({
      renderResult: createRenderResult({
        text,
        selection: { from: 24, to: 24, empty: true },
        shapedSelectionRect: {
          x: 88,
          y: 160,
          width: 1,
          height: 24
        }
      }),
      textRoots: [
        createFakeSvgTextRoot(
          new FakeSvgTextElement({
            commandId: "paragraph-1:text",
            text,
            starts: new Map([
              [0, 88],
              [1, 98],
              [2, 108],
              [3, 118]
            ])
          })
        )
      ],
      clientPoint: { clientX: 113, clientY: 170 },
      surfaceClientRect: { left: 0, top: 0, width: 800, height: 400 }
    });

    expect(result).toMatchObject({
      kind: "position",
      position: { pos: 27, bias: -1 },
      rect: { x: 88, y: 160, width: 570, height: 24 }
    });
    expect(result.diagnostics?.coordinatePath).toEqual(expect.objectContaining({
      spaces: ["client", "document"],
      documentPoint: { x: 113, y: 170 }
    }));
    expect(result.diagnostics?.migrationFallbacks).toContainEqual(
      expect.objectContaining({ kind: "svg-browser-measurement-refinement" })
    );
  });

  it("preserves retained table-cell identity through browser character refinement", () => {
    const tableCell = {
      tableId: "table-1",
      tablePos: 1,
      semanticCellId: "r0:c0",
      originCellPos: 2,
      range: { from: 3, to: 7 },
      rect: { x: 88, y: 160, width: 30, height: 24 }
    } as const;
    const result = hitTestSvgBrowserTextWithRetainedContext({
      renderResult: createRenderResult({
        text: "abc",
        selection: { from: 24, to: 24, empty: true },
        shapedSelectionRect: { x: 88, y: 160, width: 1, height: 24 }
      }),
      textRoots: [
        createFakeSvgTextRoot(
          new FakeSvgTextElement({
            commandId: "paragraph-1:text",
            text: "abc",
            starts: new Map([
              [0, 88],
              [1, 98],
              [2, 108],
              [3, 118]
            ])
          })
        )
      ],
      clientPoint: { clientX: 113, clientY: 170 },
      surfaceClientRect: { left: 0, top: 0, width: 800, height: 400 },
      retainedHitTestResult: {
        kind: "position",
        position: { pos: 26, bias: 1 },
        inside: 24,
        rect: { x: 88, y: 160, width: 570, height: 24 },
        tableCell
      }
    });

    if (result.kind !== "position") {
      throw new Error("Expected SVG browser refinement to retain a position hit.");
    }
    expect(result.tableCell).toBe(tableCell);
  });

  it("preserves retained query owner when browser character hits refine retained hits", () => {
    const text = "abc";
    const retainedOwner = createSvgBrowserGeometryQueryOwner("cell#p5");
    const retainedRegion = retainedOwner.region;
    const retainedSource = {
      sourceId: "cell:semantic:r0:c0",
      range: { from: 24, to: 27 }
    } as const;
    const retainedCapabilities = {
      editable: true,
      selectable: true,
      focusable: true,
      copyable: true,
      commandable: true,
      accessible: true
    } as const;

    if (retainedRegion === undefined) {
      throw new Error("Expected retained SVG browser geometry owner to carry a view region.");
    }

    const result = hitTestSvgBrowserTextWithRetainedContext({
      renderResult: createRenderResultFromTextCommands({
        selection: { from: 24, to: 24, empty: true },
        shapedSelectionRect: {
          x: 88,
          y: 160,
          width: 1,
          height: 24
        },
        interactionHitTargets: [
          {
            id: "retained-cell-text",
            range: { from: 24, to: 27 },
            rect: { x: 88, y: 160, width: 30, height: 24 },
            viewRegion: retainedRegion,
            queryOwner: retainedOwner,
            interactionHit: {
              kind: "text",
              region: retainedRegion,
              source: retainedSource,
              capabilities: retainedCapabilities,
              anchor: {
                rootId: retainedRegion.rootId,
                regionId: retainedRegion.regionId,
                position: { pos: 24, bias: 1 },
                affinity: "after"
              }
            }
          }
        ],
        commands: [
          {
            id: "paragraph-1:text",
            text,
            range: { from: 24, to: 27 },
            rect: { x: 88, y: 160, width: 30, height: 24 },
            origin: { x: 88, y: 177 }
          }
        ]
      }),
      textRoots: [
        createFakeSvgTextRoot(
          new FakeSvgTextElement({
            commandId: "paragraph-1:text",
            text,
            starts: new Map([
              [0, 88],
              [1, 98],
              [2, 108],
              [3, 118]
            ])
          })
        )
      ],
      clientPoint: { clientX: 113, clientY: 170 },
      surfaceClientRect: { left: 0, top: 0, width: 800, height: 400 }
    });

    if (result.kind !== "position") {
      throw new Error("Expected browser-measured SVG hit to resolve a document position.");
    }

    expect(result.position).toEqual({ pos: 27, bias: -1 });
    expect(result.queryOwner).toBe(retainedOwner);
    expect(result.viewRegion).toBe(retainedRegion);
    expect(result.interactionHit?.source).toBe(retainedSource);
    expect(result.interactionHit?.capabilities).toBe(retainedCapabilities);
  });

  it("keeps browser character hits scoped to the retained range", () => {
    const retainedOwner = createSvgBrowserGeometryQueryOwner("cell#p5");
    const retainedRegion = retainedOwner.region;

    if (retainedRegion === undefined) {
      throw new Error("Expected retained SVG browser geometry owner to carry a view region.");
    }

    const result = hitTestSvgBrowserTextWithRetainedContext({
      renderResult: createRenderResultFromTextCommands({
        selection: { from: 5720, to: 5720, empty: true },
        shapedSelectionRect: {
          x: 88,
          y: 260,
          width: 1,
          height: 24
        },
        interactionHitTargets: [
          {
            id: "retained-cell-text",
            range: { from: 5720, to: 5723 },
            rect: { x: 88, y: 260, width: 30, height: 24 },
            viewRegion: retainedRegion,
            queryOwner: retainedOwner,
            interactionHit: {
              kind: "text",
              region: retainedRegion,
              anchor: {
                rootId: retainedRegion.rootId,
                regionId: retainedRegion.regionId,
                position: { pos: 5720, bias: 1 },
                affinity: "after"
              }
            }
          }
        ],
        commands: [
          {
            id: "retained-page:text",
            text: "abc",
            range: { from: 5720, to: 5723 },
            rect: { x: 88, y: 260, width: 30, height: 24 },
            origin: { x: 88, y: 277 }
          },
          {
            id: "foreign-page:text",
            text: "abc",
            range: { from: 8800, to: 8803 },
            rect: { x: 108, y: 260, width: 30, height: 24 },
            origin: { x: 108, y: 277 }
          }
        ]
      }),
      textRoots: [
        createFakeSvgTextRoot([
          new FakeSvgTextElement({
            commandId: "retained-page:text",
            text: "abc",
            starts: new Map([
              [0, 88],
              [1, 98],
              [2, 108],
              [3, 118]
            ])
          }),
          new FakeSvgTextElement({
            commandId: "foreign-page:text",
            text: "abc",
            starts: new Map([
              [0, 110],
              [1, 120],
              [2, 130],
              [3, 140]
            ])
          })
        ])
      ],
      clientPoint: { clientX: 113, clientY: 270 },
      surfaceClientRect: { left: 0, top: 0, width: 800, height: 400 }
    });

    if (result.kind !== "position") {
      throw new Error("Expected browser-measured SVG hit to resolve a document position.");
    }

    expect(result.position).toEqual({ pos: 5723, bias: -1 });
    expect(result.queryOwner).toBe(retainedOwner);
    expect(result.viewRegion).toBe(retainedRegion);
  });

  it("hit-tests RTL text by nearest browser character boundary", () => {
    const text = "אבג";
    const result = hitTestSvgBrowserTextWithRetainedContext({
      renderResult: createRenderResult({
        text,
        selection: { from: 24, to: 24, empty: true },
        shapedSelectionRect: {
          x: 88,
          y: 160,
          width: 1,
          height: 24
        },
        direction: "rtl"
      }),
      textRoots: [
        createFakeSvgTextRoot(
          new FakeSvgTextElement({
            commandId: "paragraph-1:text",
            text,
            starts: new Map([
              [0, 118],
              [1, 108],
              [2, 98],
              [3, 88]
            ])
          })
        )
      ],
      clientPoint: { clientX: 93, clientY: 170 },
      surfaceClientRect: { left: 0, top: 0, width: 800, height: 400 }
    });

    expect(result).toMatchObject({
      kind: "position",
      position: { pos: 27, bias: -1 },
      rect: { x: 88, y: 160, width: 570, height: 24 }
    });
  });
});

/** Test input for SVG coordsAtPos refinement with shared retained facts. */
interface SvgCoordsAtPosWithRetainedContextTestOptions {
  /** Render result whose interaction snapshot owns retained identity. */
  readonly renderResult: QuireViewRenderResult;
  /** Rendered SVG roots containing text measurement nodes. */
  readonly textRoots: readonly SVGSVGElement[];
  /** Document position to map into client coordinates. */
  readonly pos: number;
  /** Side preference when the position sits between text nodes. */
  readonly side?: number | undefined;
  /** Optional retained context used to disambiguate repeated visual instances. */
  readonly selectionContext?: QuireSelectionGeometryContext | undefined;
  /** Client rectangle of the SVG coordinate surface. */
  readonly surfaceClientRect: QuireClientRect;
  /** Document-space bounds represented by the coordinate surface. */
  readonly surfaceBounds?: QuireRect | undefined;
}

/**
 * Refines SVG coordsAtPos through browser measurement after shared retained geometry.
 *
 * @param options - Render result, text roots, position, and surface projection.
 * @returns Browser-measured client rect scoped by shared retained identity.
 */
function refineSvgBrowserCoordsAtPosWithRetainedContext(
  options: SvgCoordsAtPosWithRetainedContextTestOptions
): QuireViewCoordsAtPosResult {
  const retained = resolveQuireViewCoordsAtPosWithProvenance({
    geometrySnapshot: options.renderResult.interactionSnapshot,
    pos: options.pos,
    side: options.side,
    selectionContext: options.selectionContext,
    surfaceClientRect: options.surfaceClientRect,
    ...(options.surfaceBounds === undefined ? {} : { surfaceBounds: options.surfaceBounds })
  });

  return createSvgGeometryProvider(options).refineCoordsAtPos({
    ...options,
    retainedRectAtPosition: retained.rectAtPosition
  });
}

/** Test input for SVG hit-test refinement with shared retained facts. */
interface SvgHitTestWithRetainedContextTestOptions {
  /** Render result whose interaction snapshot owns retained identity. */
  readonly renderResult: QuireViewRenderResult;
  /** Rendered SVG roots containing text measurement nodes. */
  readonly textRoots: readonly SVGSVGElement[];
  /** Browser client point being tested. */
  readonly clientPoint: QuireClientPoint;
  /** Client rectangle of the SVG coordinate surface. */
  readonly surfaceClientRect: QuireClientRect;
  /** Document-space bounds represented by the coordinate surface. */
  readonly surfaceBounds?: QuireRect | undefined;
  /** Optional retained hit override used to verify refinement sidecars. */
  readonly retainedHitTestResult?: QuireHitTestResult | undefined;
}

/**
 * Hit-tests SVG browser text after shared retained hit resolution.
 *
 * @param options - Render result, text roots, pointer point, and surface projection.
 * @returns Browser-measured hit scoped by the shared retained hit.
 */
function hitTestSvgBrowserTextWithRetainedContext(
  options: SvgHitTestWithRetainedContextTestOptions
): QuireHitTestResult {
  const retained = resolveSvgBrowserMeasurementHitContext({
    geometrySnapshot: options.renderResult.interactionSnapshot,
    clientPoint: options.clientPoint,
    surfaceClientRect: options.surfaceClientRect,
    ...(options.surfaceBounds === undefined ? {} : { surfaceBounds: options.surfaceBounds })
  });

  return createSvgGeometryProvider(options).hitTest({
    ...options,
    clientPoint: retained.clientPoint,
    retainedDocumentPoint: retained.documentPoint,
    retainedHitTestResult:
      options.retainedHitTestResult ?? retained.hitTestResult
  });
}

/** Input used to create a render result fixture. */
interface CreateRenderResultInput {
  /** Text command content. */
  readonly text: string;
  /** Selection to expose through the snapshot state. */
  readonly selection: { readonly from: number; readonly to: number; readonly empty: boolean };
  /** Existing shaped selection or caret rectangle. */
  readonly shapedSelectionRect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  /** Optional visual direction applied to the text command. */
  readonly direction?: "ltr" | "rtl" | undefined;
}

/**
 * Creates a minimal render result accepted by the SVG browser geometry adapter.
 *
 * @param input - Text, selection, and shaped retained geometry.
 * @returns Render result fixture.
 */
function createRenderResult(input: CreateRenderResultInput): QuireViewRenderResult {
  return createRenderResultFromTextCommands({
    selection: input.selection,
    shapedSelectionRect: input.shapedSelectionRect,
    commands: [
      {
        id: "paragraph-1:text",
        text: input.text,
        range: { from: 24, to: 24 + input.text.length },
        rect: { x: 88, y: 160, width: 570, height: 24 },
        origin: { x: 88, y: 177 },
        direction: input.direction
      }
    ]
  });
}

/** Text command fixture used by render result tests. */
interface TextCommandFixture {
  /** Display command id. */
  readonly id: string;
  /** Text command content. */
  readonly text: string;
  /** Document range covered by the command. */
  readonly range: { readonly from: number; readonly to: number };
  /** Command rectangle in document coordinates. */
  readonly rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  /** Glyph baseline origin in document coordinates. */
  readonly origin: { readonly x: number; readonly y: number };
  /** Optional visual direction applied to the text command. */
  readonly direction?: "ltr" | "rtl" | undefined;
}

/** Input used to create a multi-command render result fixture. */
interface CreateRenderResultFromTextCommandsInput {
  /** Selection to expose through the snapshot state. */
  readonly selection: { readonly from: number; readonly to: number; readonly empty: boolean };
  /** Existing shaped selection or caret rectangle. */
  readonly shapedSelectionRect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  /** Optional explicit retained selection geometry with retained provenance. */
  readonly selectionGeometry?: QuireSelectionGeometry | undefined;
  /** Optional retained hit targets exposed through the interaction snapshot. */
  readonly interactionHitTargets?: readonly QuireHitTarget[] | undefined;
  /** Optional retained layout children exposed through the interaction snapshot. */
  readonly interactionRootChildren?: QuireLayoutSnapshot["root"]["children"] | undefined;
  /** Text commands to expose in the content display list. */
  readonly commands: readonly TextCommandFixture[];
}

/**
 * Creates a minimal render result with configurable text commands.
 *
 * @param input - Selection, retained geometry, and text commands.
 * @returns Render result fixture.
 */
function createRenderResultFromTextCommands(
  input: CreateRenderResultFromTextCommandsInput
): QuireViewRenderResult {
  const layoutSnapshot = {
    state: {
      pm: {
        selection: input.selection
      }
    },
    documentRect: { x: 0, y: 0, width: 800, height: 400 },
    viewportRect: { x: 0, y: 0, width: 800, height: 400 },
    domOverlays: [],
    hitTargets: input.interactionHitTargets ?? [],
    root: {
      children: input.interactionRootChildren ?? []
    }
  } as unknown as QuireViewRenderResult["layoutSnapshot"];

  return {
    layoutSnapshot,
    interactionSnapshot: layoutSnapshot,
    selectionGeometry: input.selectionGeometry ?? (
      input.selection.empty
        ? {
            carets: [
              {
                position: { pos: input.selection.from, bias: 1 },
                rect: input.shapedSelectionRect
              }
            ],
            ranges: []
          }
        : {
            carets: [],
            ranges: [
              {
                range: { from: input.selection.from, to: input.selection.to },
                rect: input.shapedSelectionRect
              }
            ]
          }
    ),
    decorationLane: {
      interactionTargets: [],
      backgrounds: [],
      nodes: [],
      textStyles: [],
      widgets: []
    },
    displayList: { bounds: { x: 0, y: 0, width: 800, height: 400 }, commands: [] },
    contentDisplayList: {
      bounds: { x: 0, y: 0, width: 800, height: 400 },
      commands: input.commands.map((command) => ({
        id: command.id,
        kind: "glyph-run",
        range: command.range,
        rect: command.rect,
        text: command.text,
        origin: command.origin,
        font: "24px sans-serif",
        fillStyle: "#111827",
        glyphCoverage: "complete",
        glyphs: [],
        ...(command.direction === undefined ? {} : { direction: command.direction })
      }))
    },
    overlayDisplayList: {
      bounds: { x: 0, y: 0, width: 800, height: 400 },
      commands: []
    },
    domOverlays: [],
    viewTargets: []
  } as unknown as QuireViewRenderResult;
}

/**
 * Creates retained query-owner identity for SVG browser geometry fixtures.
 *
 * @param visualInstanceId - Visual instance represented by the owner.
 * @returns Query-product owner carried by retained geometry.
 */
function createSvgBrowserGeometryQueryOwner(
  visualInstanceId: string
): QuireLayoutQueryProductOwner {
  return {
    sourceRootId: "table-cell:semantic:r0:c0:g0:1",
    sourceFragmentId: `${visualInstanceId}:line`,
    coordinateSpace: "document",
    sourceCoordinateSpace: "table-cell-local",
    region: {
      rootId: { value: "root:table-cell:semantic:r0:c0:g0:1" },
      regionId: { value: "region:table-cell:semantic:r0:c0:g0:1" },
      kind: "table-cell",
      visualInstanceId
    }
  };
}

/**
 * Creates a repeated sub-layout node with one retained caret stop.
 *
 * @param id - Stable layout node id for the visual fragment.
 * @param y - Document-space y coordinate of the caret stop.
 * @param queryOwner - Query-product owner carried by the caret stop.
 * @returns Layout node fixture with one retained sub-layout caret stop.
 */
function createSvgBrowserRepeatedCaretNode(
  id: string,
  y: number,
  queryOwner: QuireLayoutQueryProductOwner
): NonNullable<QuireLayoutSnapshot["root"]["children"]>[number] {
  return {
    id,
    kind: "block",
    range: { from: 7159, to: 7186 },
    rect: { x: 168, y, width: 553, height: 101 },
    subLayoutQueryProducts: {
      selectionRects: [],
      caretStops: [
        {
          textFragmentId: "caret-line-y",
          position: { pos: 5720, bias: 1 },
          rect: { x: 88, y, width: 1, height: 24 },
          queryOwner
        }
      ],
      hitTargets: [],
      inputAnchors: []
    },
    children: []
  };
}

/**
 * Creates a fake SVG root exposing one rendered text element.
 *
 * @param elements - Text elements returned from querySelectorAll.
 * @returns SVG root fixture.
 */
function createFakeSvgTextRoot(
  elements: FakeSvgTextElement | readonly FakeSvgTextElement[]
): SVGSVGElement {
  const textElements = Array.isArray(elements) ? elements : [elements];

  return {
    querySelectorAll() {
      return textElements;
    },
    createSVGPoint() {
      return {
        x: 0,
        y: 0,
        matrixTransform() {
          return { x: this.x, y: this.y };
        }
      };
    },
    getScreenCTM() {
      return {
        inverse() {
          return {};
        }
      };
    }
  } as unknown as SVGSVGElement;
}

/** Fake SVG text element with deterministic character positions. */
class FakeSvgTextElement {
  /** Text content reported by the rendered element. */
  readonly textContent: string;
  /** Number of fake full-width measurements read from this element. */
  computedTextLengthCalls = 0;
  /** Number of fake substring-width measurements read from this element. */
  subStringLengthCalls = 0;
  private readonly commandId: string;
  private readonly starts: ReadonlyMap<number, number>;
  private readonly ends: ReadonlyMap<number, number>;

  /**
   * Creates a fake text element.
   *
   * @param options - Command id, text, and character starts.
   */
  constructor(options: {
    readonly commandId: string;
    readonly text: string;
    readonly starts: ReadonlyMap<number, number>;
    readonly ends?: ReadonlyMap<number, number> | undefined;
  }) {
    this.commandId = options.commandId;
    this.textContent = options.text;
    this.starts = options.starts;
    this.ends = options.ends ?? new Map();
  }

  /**
   * Reads fake attributes used by the geometry adapter.
   *
   * @param name - Attribute name.
   * @returns Attribute value, or null.
   */
  getAttribute(name: string): string | null {
    return name === "data-quirekit-command-id" ? this.commandId : null;
  }

  /**
   * Reports how many characters can be measured.
   *
   * @returns Text length in UTF-16 code units.
   */
  getNumberOfChars(): number {
    return this.textContent.length;
  }

  /**
   * Reads a deterministic character start point.
   *
   * @param index - Character index.
   * @returns SVG point-like value.
   */
  getStartPositionOfChar(index: number): DOMPoint {
    return { x: this.starts.get(index) ?? index * 10, y: 0 } as DOMPoint;
  }

  /**
   * Reads a deterministic character end point.
   *
   * @param index - Character index.
   * @returns SVG point-like value.
   */
  getEndPositionOfChar(index: number): DOMPoint {
    return {
      x: this.ends.get(index) ?? this.starts.get(index + 1) ?? (index + 1) * 10,
      y: 0
    } as DOMPoint;
  }

  /**
   * Reads a deterministic full text width.
   *
   * @returns Full text width.
   */
  getComputedTextLength(): number {
    this.computedTextLengthCalls += 1;
    return this.textContent.length * 10;
  }

  /**
   * Reads a deterministic substring width.
   *
   * @param offset - First character offset.
   * @param length - Number of characters to measure.
   * @returns Substring width.
   */
  getSubStringLength(offset: number, length: number): number {
    this.subStringLengthCalls += 1;
    void offset;
    return length * 10;
  }

  /**
   * Finds the nearest fake character for a point.
   *
   * @param point - Point in SVG document coordinates.
   * @returns Character index nearest to the point.
   */
  getCharNumAtPosition(point: DOMPoint): number {
    const count = this.getNumberOfChars();
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < count; index += 1) {
      const start = this.getStartPositionOfChar(index).x;
      const end = this.getEndPositionOfChar(index).x;
      const midpoint = (start + end) / 2;
      const distance = Math.abs(point.x - midpoint);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }

    return nearestIndex;
  }
}
