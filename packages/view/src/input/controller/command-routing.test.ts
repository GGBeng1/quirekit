import { createEditor } from "@quirekit/core";
import { TextSelection } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import {
  resolveQuireCommandRoutingScope,
  type QuireInteractionSelectionTarget
} from "@quirekit/view-engine";
import type { QuireKeyboardInputEvent } from "../types";
import {
  resolveQuireGenericCutCommandRoute,
  resolveQuireBlockedGenericCutCommandRoute,
  resolveQuireGenericPasteCommandRoute,
  resolveQuireBlockedGenericPasteCommandRoute,
  resolveQuireGenericTextMutationCommandRoute,
  resolveQuireBlockedGenericTextMutationCommandRoute,
  resolveQuireGenericTextEditingCommandRoute,
  resolveQuireBlockedGenericTextEditingCommandRoute,
  resolveQuireSelectionBeforeInputDeleteCommandRoute,
  resolveQuireSelectionBeforeInputClipboardCommandRoute,
  resolveQuireSelectionBeforeInputTextMutationCommandRoute,
  resolveQuireSelectionCopyCommandRoute,
  resolveQuireSelectionCutCommandRoute,
  resolveQuireSelectionDeleteCommandRoute,
  resolveQuireSelectionPasteCommandRoute,
  resolveQuireSelectionTextEditingCommandRoute,
  resolveQuireSelectionTextMutationCommandRoute
} from "./command-routing";

describe("input controller command routing", () => {
  it("resolves routed selection delete command facts for delete keys", () => {
    const editor = createEditorWithParagraph();
    const interactionTarget = createInteractionSelectionTarget("object", "media");
    const scope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1),
      interactionTarget
    });
    const route = resolveQuireSelectionDeleteCommandRoute(
      scope,
      createKeyboardEvent("Delete")
    );

    expect(route).toMatchObject({
      kind: "object",
      intent: "delete",
      selectionDomain: "object",
      targetKind: "media",
      activeRoot: interactionTarget.region?.rootId,
      activeRegion: interactionTarget.region
    });
  });

  it("skips selection delete routing for non-delete keys", () => {
    const editor = createEditorWithParagraph();
    const scope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1)
    });

    expect(
      resolveQuireSelectionDeleteCommandRoute(scope, createKeyboardEvent("ArrowLeft"))
    ).toBeNull();
  });

  it("resolves routed selection delete command facts for beforeinput deletion families", () => {
    const editor = createEditorWithParagraph();
    const interactionTarget = createInteractionSelectionTarget("object", "object");
    const scope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1),
      interactionTarget
    });

    expect(
      resolveQuireSelectionBeforeInputDeleteCommandRoute(
        scope,
        createBeforeInputEvent("deleteContentBackward")
      )
    ).toMatchObject({
      kind: "object",
      intent: "delete",
      selectionDomain: "object",
      targetKind: "object",
      interactionTarget
    });
    expect(
      resolveQuireSelectionBeforeInputDeleteCommandRoute(
        scope,
        createBeforeInputEvent("insertText")
      )
    ).toBeNull();
    expect(
      resolveQuireSelectionBeforeInputDeleteCommandRoute(
        scope,
        createBeforeInputEvent("deleteWordBackward")
      )
    ).toMatchObject({
      kind: "object",
      intent: "delete",
      selectionDomain: "object",
      targetKind: "object",
      interactionTarget
    });
  });

  it("resolves routed selection clipboard facts for beforeinput clipboard families", () => {
    const editor = createEditorWithParagraph();
    const interactionTarget = createInteractionSelectionTarget("object", "object");
    const scope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1),
      interactionTarget
    });

    expect(
      resolveQuireSelectionBeforeInputClipboardCommandRoute(
        scope,
        createBeforeInputEvent("insertFromPaste")
      )
    ).toMatchObject({
      kind: "object",
      intent: "paste",
      selectionDomain: "object",
      targetKind: "object",
      interactionTarget
    });
    expect(
      resolveQuireSelectionBeforeInputClipboardCommandRoute(
        scope,
        createBeforeInputEvent("deleteByCut")
      )
    ).toMatchObject({
      kind: "object",
      intent: "cut",
      selectionDomain: "object",
      targetKind: "object",
      interactionTarget
    });
    expect(
      resolveQuireSelectionBeforeInputClipboardCommandRoute(
        scope,
        createBeforeInputEvent("insertText")
      )
    ).toBeNull();
  });

  it("resolves routed selection text-mutation facts for beforeinput paragraph and line-break insertion", () => {
    const editor = createEditorWithParagraph();
    const interactionTarget = createInteractionSelectionTarget("object", "object");
    const scope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1),
      interactionTarget
    });

    expect(
      resolveQuireSelectionBeforeInputTextMutationCommandRoute(
        scope,
        createBeforeInputEvent("insertParagraph")
      )
    ).toMatchObject({
      kind: "object",
      intent: "text-mutation",
      selectionDomain: "object",
      targetKind: "object",
      interactionTarget
    });
    expect(
      resolveQuireSelectionBeforeInputTextMutationCommandRoute(
        scope,
        createBeforeInputEvent("insertLineBreak")
      )
    ).toMatchObject({
      kind: "object",
      intent: "text-mutation",
      selectionDomain: "object",
      targetKind: "object",
      interactionTarget
    });
    expect(
      resolveQuireSelectionBeforeInputTextMutationCommandRoute(
        scope,
        createBeforeInputEvent("deleteContentBackward")
      )
    ).toBeNull();
  });

  it("resolves routed selection copy command facts for clipboard copy", () => {
    const editor = createEditorWithParagraph();
    const interactionTarget = createInteractionSelectionTarget(
      "readonly-text",
      "readonly-text"
    );
    const scope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1),
      interactionTarget
    });
    const route = resolveQuireSelectionCopyCommandRoute(scope);

    expect(route).toMatchObject({
      kind: "readonly-text",
      intent: "copy",
      selectionDomain: "readonly-text",
      targetKind: "readonly-text",
      interactionTarget,
      activeRoot: interactionTarget.region?.rootId,
      activeRegion: interactionTarget.region
    });
  });

  it("resolves routed selection cut command facts for clipboard cut", () => {
    const editor = createEditorWithParagraph();
    const interactionTarget = createInteractionSelectionTarget("object", "media");
    const scope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1),
      interactionTarget
    });
    const route = resolveQuireSelectionCutCommandRoute(scope);

    expect(route).toMatchObject({
      kind: "object",
      intent: "cut",
      selectionDomain: "object",
      targetKind: "media",
      interactionTarget,
      activeRoot: interactionTarget.region?.rootId,
      activeRegion: interactionTarget.region
    });
  });

  it("resolves routed selection paste command facts for clipboard paste", () => {
    const editor = createEditorWithParagraph();
    const interactionTarget = createInteractionSelectionTarget(
      "readonly-text",
      "readonly-text"
    );
    const scope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1),
      interactionTarget
    });
    const route = resolveQuireSelectionPasteCommandRoute(scope);

    expect(route).toMatchObject({
      kind: "readonly-text",
      intent: "paste",
      selectionDomain: "readonly-text",
      targetKind: "readonly-text",
      interactionTarget,
      activeRoot: interactionTarget.region?.rootId,
      activeRegion: interactionTarget.region
    });
  });

  it("resolves routed selection text-mutation command facts for text input", () => {
    const editor = createEditorWithParagraph();
    const interactionTarget = createInteractionSelectionTarget("object", "object");
    const scope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1),
      interactionTarget
    });
    const route = resolveQuireSelectionTextMutationCommandRoute(scope);

    expect(route).toMatchObject({
      kind: "object",
      intent: "text-mutation",
      selectionDomain: "object",
      targetKind: "object",
      interactionTarget,
      activeRoot: interactionTarget.region?.rootId,
      activeRegion: interactionTarget.region
    });
  });

  it("resolves routed selection text-editing command facts for editing keys", () => {
    const editor = createEditorWithParagraph();
    const interactionTarget = createInteractionSelectionTarget("object", "object");
    const scope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1),
      interactionTarget
    });
    const route = resolveQuireSelectionTextEditingCommandRoute(
      scope,
      createKeyboardEvent("Enter")
    );

    expect(route).toMatchObject({
      kind: "object",
      intent: "text-mutation",
      selectionDomain: "object",
      targetKind: "object",
      interactionTarget,
      activeRoot: interactionTarget.region?.rootId,
      activeRegion: interactionTarget.region
    });
  });

  it("skips selection text-editing routing for navigation keys", () => {
    const editor = createEditorWithParagraph();
    const scope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1)
    });

    expect(
      resolveQuireSelectionTextEditingCommandRoute(
        scope,
        createKeyboardEvent("ArrowLeft")
      )
    ).toBeNull();
  });

  it("resolves routed generic clipboard edit facts", () => {
    const editor = createEditorWithParagraph();
    const interactionTarget = createInteractionSelectionTarget(
      "readonly-text",
      "readonly-text"
    );
    const scope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1),
      interactionTarget
    });

    expect(resolveQuireGenericCutCommandRoute(scope)).toMatchObject({
      kind: "copy-only",
      intent: "cut",
      selectionRouteKind: "readonly-text",
      selectionDomain: "readonly-text",
      targetKind: "readonly-text",
      activeRoot: interactionTarget.region?.rootId,
      activeRegion: interactionTarget.region
    });
    expect(resolveQuireGenericPasteCommandRoute(scope)).toMatchObject({
      kind: "block",
      intent: "paste",
      selectionRouteKind: "readonly-text",
      selectionDomain: "readonly-text",
      targetKind: "readonly-text",
      activeRoot: interactionTarget.region?.rootId,
      activeRegion: interactionTarget.region
    });
  });

  it("reuses pre-resolved selection routes for generic edit facts", () => {
    const editor = createEditorWithParagraph();
    const editableScope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1)
    });
    const interactionTarget = createInteractionSelectionTarget("object", "object");
    const objectScope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1),
      interactionTarget
    });
    const textMutationRoute =
      resolveQuireSelectionTextMutationCommandRoute(objectScope);
    const genericTextRoute = resolveQuireGenericTextMutationCommandRoute(
      editableScope,
      textMutationRoute
    );

    expect(genericTextRoute).toMatchObject({
      kind: "block",
      intent: "text-mutation",
      selectionRouteKind: "object",
      selectionDomain: "object",
      targetKind: "object",
      interactionTarget
    });

    const readonlyTarget = createInteractionSelectionTarget(
      "readonly-text",
      "readonly-text"
    );
    const readonlyScope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1),
      interactionTarget: readonlyTarget
    });
    const cutRoute = resolveQuireSelectionCutCommandRoute(readonlyScope);

    expect(resolveQuireGenericCutCommandRoute(editableScope, cutRoute)).toMatchObject({
      kind: "copy-only",
      intent: "cut",
      selectionRouteKind: "readonly-text",
      selectionDomain: "readonly-text",
      targetKind: "readonly-text",
      interactionTarget: readonlyTarget
    });
  });

  it("keeps blocked generic cut as a routed object", () => {
    const editor = createEditorWithParagraph();
    const interactionTarget = createInteractionSelectionTarget("object", "object");
    const scope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1),
      interactionTarget
    });

    expect(resolveQuireBlockedGenericCutCommandRoute(scope)).toMatchObject({
      kind: "block",
      intent: "cut",
      selectionRouteKind: "object",
      selectionDomain: "object",
      targetKind: "object",
      interactionTarget
    });
  });

  it("keeps blocked generic paste as a routed object", () => {
    const editor = createEditorWithParagraph();
    const interactionTarget = createInteractionSelectionTarget(
      "readonly-text",
      "readonly-text"
    );
    const scope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1),
      interactionTarget
    });

    expect(resolveQuireBlockedGenericPasteCommandRoute(scope)).toMatchObject({
      kind: "block",
      intent: "paste",
      selectionRouteKind: "readonly-text",
      selectionDomain: "readonly-text",
      targetKind: "readonly-text",
      interactionTarget
    });
  });

  it("skips clipboard branch routes for editable text targets", () => {
    const editor = createEditorWithParagraph();
    const scope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1)
    });

    expect(resolveQuireBlockedGenericCutCommandRoute(scope)).toBeNull();
    expect(resolveQuireBlockedGenericPasteCommandRoute(scope)).toBeNull();
  });

  it("resolves routed generic text mutation facts without keyboard filtering", () => {
    const editor = createEditorWithParagraph();
    const interactionTarget = createInteractionSelectionTarget("object", "object");
    const scope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1),
      interactionTarget
    });
    const route = resolveQuireGenericTextMutationCommandRoute(scope);

    expect(route).toMatchObject({
      kind: "block",
      intent: "text-mutation",
      selectionRouteKind: "object",
      selectionDomain: "object",
      targetKind: "object",
      activeRoot: interactionTarget.region?.rootId,
      activeRegion: interactionTarget.region
    });
  });

  it("keeps blocked generic text mutation as a routed object", () => {
    const editor = createEditorWithParagraph();
    const interactionTarget = createInteractionSelectionTarget("object", "object");
    const scope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1),
      interactionTarget
    });

    expect(resolveQuireBlockedGenericTextMutationCommandRoute(scope)).toMatchObject({
      kind: "block",
      intent: "text-mutation",
      selectionRouteKind: "object",
      selectionDomain: "object",
      targetKind: "object",
      interactionTarget
    });
  });

  it("skips blocked generic text mutation routes for editable text", () => {
    const editor = createEditorWithParagraph();
    const scope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1)
    });

    expect(resolveQuireBlockedGenericTextMutationCommandRoute(scope)).toBeNull();
  });

  it("resolves routed generic edit facts for text editing keys", () => {
    const editor = createEditorWithParagraph();
    const interactionTarget = createInteractionSelectionTarget("object", "object");
    const scope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1),
      interactionTarget
    });
    const event = createKeyboardEvent("Backspace");
    const route = resolveQuireGenericTextEditingCommandRoute(scope, event);

    expect(route).toMatchObject({
      kind: "block",
      intent: "text-mutation",
      selectionRouteKind: "object",
      selectionDomain: "object",
      targetKind: "object",
      activeRoot: interactionTarget.region?.rootId,
      activeRegion: interactionTarget.region
    });
  });

  it("keeps blocked generic text editing as a routed object", () => {
    const editor = createEditorWithParagraph();
    const interactionTarget = createInteractionSelectionTarget("object", "object");
    const scope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1),
      interactionTarget
    });
    const route = resolveQuireBlockedGenericTextEditingCommandRoute(
      scope,
      createKeyboardEvent("Backspace")
    );

    expect(route).toMatchObject({
      kind: "block",
      intent: "text-mutation",
      selectionRouteKind: "object",
      selectionDomain: "object",
      targetKind: "object",
      interactionTarget
    });
  });

  it("skips blocked generic text editing routes for allowed text targets", () => {
    const editor = createEditorWithParagraph();
    const scope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1)
    });

    expect(
      resolveQuireBlockedGenericTextEditingCommandRoute(
        scope,
        createKeyboardEvent("Backspace")
      )
    ).toBeNull();
  });

  it("skips generic edit routing for non-editing navigation keys", () => {
    const editor = createEditorWithParagraph();
    const scope = resolveQuireCommandRoutingScope({
      selection: TextSelection.create(editor.state.doc, 1)
    });
    const event = createKeyboardEvent("ArrowLeft");

    expect(resolveQuireGenericTextEditingCommandRoute(scope, event)).toBeNull();
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
 * Creates interaction selection target facts for input command-routing tests.
 *
 * @param domain - Selection domain represented by the target.
 * @param commandTarget - Command target represented by the target.
 * @returns Interaction selection target facts.
 */
function createInteractionSelectionTarget(
  domain: "object" | "readonly-text",
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
    }
  };
}

/**
 * Creates the minimal keyboard event shape consumed by command-routing tests.
 *
 * @param key - KeyboardEvent key value.
 * @returns Keyboard event-like object for tests.
 */
function createKeyboardEvent(key: string): QuireKeyboardInputEvent {
  return {
    key,
    keyCode: key === "Backspace" ? 8 : 0,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    preventDefault: () => {}
  };
}

/**
 * Creates the minimal beforeinput event shape consumed by command-routing tests.
 *
 * @param inputType - Input Events inputType value.
 * @returns beforeinput event-like object for tests.
 */
function createBeforeInputEvent(inputType: string): {
  readonly inputType: string;
} {
  return { inputType };
}
