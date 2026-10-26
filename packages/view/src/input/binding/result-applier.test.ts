import { describe, expect, it, vi } from "vitest";
import { QuireMountedInputResultApplier } from "./result-applier";
import type { QuireEditorInputBindingOptions } from "../types";
import type { QuireImePreedit } from "@quirekit/view-engine";
import type { QuireEditor } from "@quirekit/core";
import type { QuireImeEventResult } from "@quirekit/ime";

describe("QuireMountedInputResultApplier", () => {
  it("emits IME preedit clearing after document-changing commits", () => {
    const imePreedits: Array<QuireImePreedit | undefined> = [];
    const onUpdate = vi.fn();
    const applier = new QuireMountedInputResultApplier({
      binding: createInputBindingOptions({
        onImePreedit: (preedit) => {
          imePreedits.push(preedit);
        },
        onUpdate
      }),
      commitCompositionText: () => ({ handled: true, docChanged: true })
    });

    applier.applyImeResult(createPreeditResult("ni"));
    const handled = applier.applyImeResult(createCommitResult("你"));

    expect(handled).toBe(true);
    expect(imePreedits).toEqual([
      { range: { from: 3, to: 3 }, text: "ni" },
      undefined
    ]);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith({
      source: "compositionend",
      result: { handled: true, docChanged: true },
      reason: "transaction"
    });
  });

  it("renders an IME preedit clear when handled input changes no document", () => {
    const imePreedits: Array<QuireImePreedit | undefined> = [];
    const applier = new QuireMountedInputResultApplier({
      binding: createInputBindingOptions({
        onImePreedit: (preedit) => {
          imePreedits.push(preedit);
        }
      }),
      commitCompositionText: () => ({ handled: true, docChanged: true })
    });

    applier.applyImeResult(createPreeditResult("ni"));
    applier.applyInputResult("keydown", { handled: true, docChanged: false });

    expect(imePreedits).toEqual([
      { range: { from: 3, to: 3 }, text: "ni" },
      undefined
    ]);
  });

  it("does not emit unchanged IME preedits twice", () => {
    const imePreedits: Array<QuireImePreedit | undefined> = [];
    const applier = new QuireMountedInputResultApplier({
      binding: createInputBindingOptions({
        onImePreedit: (preedit) => {
          imePreedits.push(preedit);
        }
      }),
      commitCompositionText: () => ({ handled: true, docChanged: true })
    });

    applier.applyImeResult(createPreeditResult("ni"));
    applier.applyImeResult(createPreeditResult("ni"));

    expect(imePreedits).toEqual([
      { range: { from: 3, to: 3 }, text: "ni" }
    ]);
  });

  it("emits the same preedit again for a new session after commit", () => {
    const imePreedits: Array<QuireImePreedit | undefined> = [];
    const applier = new QuireMountedInputResultApplier({
      binding: createInputBindingOptions({
        onImePreedit: (preedit) => {
          imePreedits.push(preedit);
        }
      }),
      commitCompositionText: () => ({ handled: true, docChanged: true })
    });

    applier.applyImeResult(createPreeditResult("ni"));
    applier.applyImeResult(createCommitResult("你"));
    applier.applyImeResult(createPreeditResult("ni"));

    expect(imePreedits).toEqual([
      { range: { from: 3, to: 3 }, text: "ni" },
      undefined,
      { range: { from: 3, to: 3 }, text: "ni" }
    ]);
  });
});

/**
 * Creates mounted input binding options for result-applier tests.
 *
 * @param overrides - Callback overrides used by a specific test.
 * @returns Binding options with a deterministic fake editor and input proxy.
 */
function createInputBindingOptions(
  overrides: Partial<QuireEditorInputBindingOptions> = {}
): QuireEditorInputBindingOptions {
  return {
    editor: createFakeEditor(),
    inputProxy: createFakeInputProxy(),
    ...overrides
  };
}

/**
 * Creates a fake editor exposing only the selection consumed by IME preedit.
 *
 * @returns Minimal editor-like object for input binding tests.
 */
function createFakeEditor(): QuireEditor {
  return {
    state: {
      pm: {
        selection: {
          from: 3,
          to: 3
        }
      }
    }
  } as QuireEditor;
}

/**
 * Creates a fake textarea that supports value clearing and selection reset.
 *
 * @returns Minimal textarea-like object for result-applier tests.
 */
function createFakeInputProxy(): HTMLTextAreaElement {
  return {
    value: "native",
    setSelectionRange: vi.fn()
  } as unknown as HTMLTextAreaElement;
}

/**
 * Creates an IME result carrying transient preedit text.
 *
 * @param preeditText - IME preedit text to render.
 * @returns IME event result consumed by the mounted result applier.
 */
function createPreeditResult(preeditText: string): QuireImeEventResult {
  return {
    handledByIme: true,
    preventDefault: false,
    clearInput: false,
    preserveInput: true,
    preeditText,
    isComposing: true
  };
}

/**
 * Creates an IME result carrying finalized composition text.
 *
 * @param commitText - Text committed by compositionend.
 * @returns IME event result consumed by the mounted result applier.
 */
function createCommitResult(commitText: string): QuireImeEventResult {
  return {
    handledByIme: true,
    preventDefault: false,
    clearInput: true,
    preserveInput: false,
    commitText,
    preeditText: "",
    isComposing: false
  };
}
