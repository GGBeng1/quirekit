import { Node } from "@quirekit/core";
import { describe, expect, it } from "vitest";
import { createQuireLayoutProviderRegistration, type QuireLayoutProvider } from "../../layout-provider";
import { createQuireViewEngineRuntime } from "../../frame/runtime";
import { baseOptions, createFixtureEditor, selectionPatch, setSelection } from "../../../test-support/frame-layout-reuse";

describe("canonical provider text materialization", () => {
  it("reuses measured fragment-only provider text outside the previous snapshot window", () => {
    let providerCalls = 0;
    const provider = createFragmentProvider(() => { providerCalls += 1; });
    const editor = createFixtureEditor(1, [Node.create({
      name: "fragmentContainer", group: "block", content: "paragraph+",
      addLayoutProviders: () => [{
        ...createQuireLayoutProviderRegistration(provider),
        layoutDependency: { kind: "document" }
      }]
    })]);
    editor.commands.insertContentAt(editor.state.doc.content.size, {
      type: "fragmentContainer",
      content: Array.from({ length: 12 }, (_, index) => ({
        type: "paragraph", content: [{ type: "text", text: `nested ${index}` }]
      }))
    });
    let target = -1;
    editor.state.doc.descendants((node, position) => {
      if (node.isText && node.text === "nested 11") target = position;
    });
    expect(target).toBeGreaterThan(0);
    setSelection(editor, 1);
    const runtime = createQuireViewEngineRuntime({ editor });
    const pageGeometry = {
      pageRect: { x: 0, y: 0, width: 320, height: 100 },
      bodyRect: { x: 20, y: 10, width: 280, height: 80 },
      pageGap: 12
    };
    const options = { ...baseOptions, pageGeometry };
    const complete = runtime.buildFrame(options);
    const pages = complete.layoutSnapshot.pages!;
    const targetPage = pages.find((page) => target >= page.range.from && target < page.range.to)!;
    expect(targetPage.pageIndex).toBeGreaterThan(0);
    runtime.buildFrame({
      ...options, layoutSnapshotClipRects: [pages[0]!.pageRect], updatePatch: selectionPatch()
    });

    // Canonical provider fragments retain real text even though the accepted
    // adapter omitted the target page. Selection must reproject, never reshape.
    setSelection(editor, target);
    const current = { ...options, layoutSnapshotClipRects: [targetPage.pageRect], updatePatch: selectionPatch() };
    const frame = runtime.buildFrame(current);
    expect(frame.cacheCounters!.layoutProduct).toMatchObject({ rebuilt: 1, reused: 2, fallbackReason: null });
    expect(providerCalls).toBe(1);
    const full = createQuireViewEngineRuntime({ editor }).buildFrame(current);
    expect(frame.contentDisplayList).toEqual(full.contentDisplayList);
    expect(frame.overlayDisplayList).toEqual(full.overlayDisplayList);
    expect(frame.selectionGeometry).toEqual(full.selectionGeometry);
    expect(frame.viewTargets).toEqual(full.viewTargets);
    editor.destroy();
  });
});

/**
 * Creates a public provider exposing measured children only through accepted fragments.
 *
 * @param observe - Records provider execution independently from projection.
 * @returns Provider using the framework's collection, layout, and child-flow services.
 */
function createFragmentProvider(observe: () => void): QuireLayoutProvider {
  return {
    id: "fragment-only-container",
    nodeTypes: ["fragmentContainer"],
    capabilities: ["child-flow", "fragmentation"],
    regionContract: {
      rootKind: "block-container", regionKind: "block-container",
      capabilities: { editable: true, selectable: true, focusable: true,
        copyable: true, commandable: true, accessible: true },
      selectionPolicy: "delegate-to-text"
    },
    layout(context) {
      observe();
      const range = context.source.range!;
      const children = context.services.collectBlockInputs({
        node: context.sourceNode, contentStart: context.sourceContentStart,
        path: context.sourcePath, inlineSize: context.constraints.inlineSize
      });
      const source = context.services.layoutBlockContainer({
        id: "fragment-source", range,
        rect: { x: 0, y: 0, width: context.constraints.inlineSize, height: 0 },
        blockHeight: context.constraints.blockHeight, blockGap: context.constraints.blockGap,
        children
      });
      const rect = { ...source.rect, ...context.constraints.origin };
      const owner = { root: context.root, region: context.region };
      const flow = context.services.flowBlockChildren({
        id: "fragment-flow", owner, source,
        tracks: [{ id: "fragment-track", rect, coordinateSpace: "document",
          region: context.region, source: context.source, capabilities: context.root.capabilities }],
        dependencySignature: "fragment-source:v1"
      });
      return {
        providerId: context.providerId, snapshotVersion: context.snapshotVersion,
        source: context.source, fragments: flow.fragments, continuation: null,
        layout: context.services.createContribution({
          id: context.source.sourceId, range, rect, owner,
          fragments: flow.fragments
        }),
        declarations: [context.services.declarePrimaryRegion(rect)]
      };
    }
  };
}
