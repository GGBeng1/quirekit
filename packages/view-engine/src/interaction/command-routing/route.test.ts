import { createEditor } from "@quirekit/core";
import { AllSelection, TextSelection } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import {
  resolveQuireGenericEditCommandRoute,
  resolveQuireSelectionCommandRoute
} from "./route";
import { resolveQuireCommandRoutingScope } from "./scope";
import type { QuireInteractionSelectionTarget } from "../selection";

describe("interaction generic edit command routing", () => {
  it("allows generic text mutation for editable text targets", () => {
    const editor = createEditorWithParagraph();
    const scope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1)
    });

    expect(resolveQuireGenericEditCommandRoute({
      scope,
      intent: "text-mutation"
    })).toMatchObject({ kind: "allow-text-mutation" });
  });

  it("routes readonly cut as copy-only while blocking readonly text mutation", () => {
    const editor = createEditorWithParagraph();
    const scope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1),
      interactionTarget: createInteractionSelectionTarget(
        "readonly-text",
        "readonly-text"
      )
    });

    expect(resolveQuireGenericEditCommandRoute({
      scope,
      intent: "cut"
    })).toMatchObject({ kind: "copy-only" });
    expect(resolveQuireGenericEditCommandRoute({
      scope,
      intent: "text-mutation"
    })).toMatchObject({ kind: "block" });
  });

  it("blocks generic edit commands for non-text domains until domain commands exist", () => {
    const editor = createEditorWithParagraph();
    const objectScope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1),
      interactionTarget: createInteractionSelectionTarget("object", "object")
    });

    expect(resolveQuireGenericEditCommandRoute({
      scope: objectScope,
      intent: "cut"
    })).toMatchObject({ kind: "block" });
  });

  it("carries active scope facts on generic edit routes", () => {
    const editor = createEditorWithParagraph();
    const interactionTarget = createInteractionSelectionTarget("object", "object");
    const route = resolveQuireGenericEditCommandRoute({
      scope: resolveQuireCommandRoutingScope({
        selection: TextSelection.create(editor.state.doc, 1),
        interactionTarget
      }),
      intent: "cut"
    });

    expect(route).toMatchObject({
      kind: "block",
      selectionRouteKind: "object",
      selectionDomain: "object",
      targetKind: "object",
      activeRoot: interactionTarget.region?.rootId,
      activeRegion: interactionTarget.region,
      activeSource: interactionTarget.source,
      activeCapabilities: interactionTarget.capabilities
    });
    expect(route.interactionTarget).toBe(interactionTarget);
  });

  it("carries the routed generic edit intent", () => {
    const editor = createEditorWithParagraph();
    const route = resolveQuireGenericEditCommandRoute({
      scope: resolveQuireCommandRoutingScope({
        selection: TextSelection.create(editor.state.doc, 1),
        interactionTarget: createInteractionSelectionTarget("cell", "table-cells")
      }),
      intent: "paste"
    });

    expect(route).toMatchObject({
      kind: "block",
      intent: "paste",
      selectionRouteKind: "table-cells",
      selectionDomain: "cell",
      targetKind: "table-cells"
    });
  });

  it("carries the routed selection command intent", () => {
    const editor = createEditorWithParagraph();
    const route = resolveQuireSelectionCommandRoute({
      scope: resolveQuireCommandRoutingScope({
        selection: TextSelection.create(editor.state.doc, 1),
        interactionTarget: createInteractionSelectionTarget("object", "media")
      }),
      intent: "copy"
    });

    expect(route).toMatchObject({
      kind: "object",
      intent: "copy",
      selectionDomain: "object",
      targetKind: "media"
    });
  });

  it("blocks structural table-cell cut at the generic edit fallback", () => {
    const editor = createEditorWithParagraph();
    const cellScope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1),
      interactionTarget: createInteractionSelectionTarget("cell", "table-cells")
    });

    expect(resolveQuireGenericEditCommandRoute({
      scope: cellScope,
      intent: "cut"
    })).toMatchObject({ kind: "block" });
    expect(resolveQuireGenericEditCommandRoute({
      scope: cellScope,
      intent: "text-mutation"
    })).toMatchObject({ kind: "block" });
  });

  it("blocks structural table-cell paste at the generic edit fallback", () => {
    const editor = createEditorWithParagraph();
    const cellScope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1),
      interactionTarget: createInteractionSelectionTarget("cell", "table-cells")
    });

    expect(resolveQuireGenericEditCommandRoute({
      scope: cellScope,
      intent: "paste"
    })).toMatchObject({ kind: "block" });
  });

  it("blocks structural node cut at the generic edit fallback", () => {
    const editor = createEditorWithParagraph();
    const nodeScope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1),
      interactionTarget: createInteractionSelectionTarget("node", "node")
    });

    expect(resolveQuireGenericEditCommandRoute({
      scope: nodeScope,
      intent: "cut"
    })).toMatchObject({ kind: "block" });
  });

  it("blocks structural node paste at the generic edit fallback", () => {
    const editor = createEditorWithParagraph();
    const nodeScope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1),
      interactionTarget: createInteractionSelectionTarget("node", "node")
    });

    expect(resolveQuireGenericEditCommandRoute({
      scope: nodeScope,
      intent: "paste"
    })).toMatchObject({ kind: "block" });
  });

  it("blocks document cut and paste at the generic edit fallback", () => {
    const editor = createEditorWithParagraph();
    const documentScope = resolveQuireCommandRoutingScope({
      selection: new AllSelection(editor.state.doc)
    });

    expect(resolveQuireGenericEditCommandRoute({
      scope: documentScope,
      intent: "cut"
    })).toMatchObject({ kind: "block" });
    expect(resolveQuireGenericEditCommandRoute({
      scope: documentScope,
      intent: "paste"
    })).toMatchObject({ kind: "block" });
    expect(resolveQuireGenericEditCommandRoute({
      scope: documentScope,
      intent: "text-mutation"
    })).toMatchObject({ kind: "block" });
  });

  it("routes non-text targets to explicit domain command routes", () => {
    const editor = createEditorWithParagraph();
    const selection = TextSelection.create(editor.state.doc, 1);

    expect(resolveQuireSelectionCommandRoute({
      scope: resolveQuireCommandRoutingScope({
        selection,
        interactionTarget: createInteractionSelectionTarget(
          "cell",
          "table-cells"
        )
      }),
      intent: "delete"
    })).toMatchObject({ kind: "table-cells", targetKind: "table-cells" });
    expect(resolveQuireSelectionCommandRoute({
      scope: resolveQuireCommandRoutingScope({
        selection,
        interactionTarget: createInteractionSelectionTarget("object", "media")
      }),
      intent: "delete"
    })).toMatchObject({ kind: "object", targetKind: "media" });
    expect(resolveQuireSelectionCommandRoute({
      scope: resolveQuireCommandRoutingScope({
        selection,
        interactionTarget: createInteractionSelectionTarget(
          "control",
          "content-control"
        )
      }),
      intent: "delete"
    })).toMatchObject({ kind: "control", targetKind: "content-control" });
  });

  it("carries active scope facts on selection command routes", () => {
    const editor = createEditorWithParagraph();
    const interactionTarget = createInteractionSelectionTarget("object", "media");
    const selection = TextSelection.create(editor.state.doc, 1);
    const route = resolveQuireSelectionCommandRoute({
      scope: resolveQuireCommandRoutingScope({
        selection,
        interactionTarget
      }),
      intent: "copy"
    });

    expect(route).toMatchObject({
      kind: "object",
      intent: "copy",
      targetKind: "media",
      selectionDomain: "object",
      activeRoot: interactionTarget.region?.rootId,
      activeRegion: interactionTarget.region,
      activeSource: interactionTarget.source,
      activeCapabilities: interactionTarget.capabilities
    });
    expect(route.selection).toBe(selection);
    expect(route.interactionTarget).toBe(interactionTarget);
  });

  it("carries the active selection on generic edit command routes", () => {
    const editor = createEditorWithParagraph();
    const selection = TextSelection.create(editor.state.doc, 1);
    const route = resolveQuireGenericEditCommandRoute({
      scope: resolveQuireCommandRoutingScope({ selection }),
      intent: "text-mutation"
    });

    expect(route.selection).toBe(selection);
  });
});

/**
 * Creates an editor with one paragraph.
 *
 * @returns Editor with a paragraph document.
 */
function createEditorWithParagraph() {
  return createEditor({
    extensions: [StarterKit.configure({ undoRedo: false })],
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello" }]
        }
      ]
    }
  });
}

/**
 * Creates interaction selection target facts for routing tests.
 *
 * @param domain - Selection domain represented by the target.
 * @param commandTarget - Command target represented by the target.
 * @returns Interaction selection target facts.
 */
function createInteractionSelectionTarget(
  domain: "cell" | "control" | "node" | "readonly-text" | "object",
  commandTarget: QuireInteractionSelectionTarget["commandTarget"]
): QuireInteractionSelectionTarget {
  return {
    domain,
    commandTarget,
    hitKind: domain,
    region: {
      rootId: { value: "doc" },
      regionId: { value: domain },
      kind: domain === "readonly-text" ? "readonly-text" : "floating-object"
    },
    source: {
      sourceId: `${domain}-source`,
      range: { from: 1, to: 6 }
    },
    capabilities: {
      editable: domain === "readonly-text",
      selectable: true,
      focusable: true,
      copyable: true,
      commandable: true,
      accessible: true
    }
  };
}
