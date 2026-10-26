import { describe, expect, it } from "vitest";
import { createQuireImeInputEngine } from "./index";

describe("IME input engine", () => {
  it("tracks preedit text during composition without committing", () => {
    const engine = createQuireImeInputEngine();

    expect(engine.handleCompositionStart({ data: "" })).toMatchObject({
      handledByIme: true,
      preserveInput: true,
      preeditText: "",
      isComposing: true
    });
    expect(engine.handleCompositionUpdate({ data: "ni" })).toMatchObject({
      handledByIme: true,
      preserveInput: true,
      preeditText: "ni",
      isComposing: true
    });
    expect(
      engine.handleBeforeInput({
        inputType: "insertCompositionText",
        data: "ni",
        isComposing: true
      })
    ).toMatchObject({
      handledByIme: true,
      preventDefault: false,
      preserveInput: true,
      commitText: undefined,
      preeditText: "ni"
    });
  });

  it("commits nothing when composition is cancelled with an empty compositionend", () => {
    const engine = createQuireImeInputEngine();

    engine.handleCompositionStart({ data: "", inputValue: "" });
    engine.handleCompositionUpdate({ data: "n", inputValue: "n" });

    // Backspace empties the one-character preedit; the IME ends composition with
    // empty data and a cleared textarea. The preedit must not be committed.
    expect(engine.handleCompositionEnd({ data: "", inputValue: "" })).toMatchObject({
      handledByIme: true,
      clearInput: true,
      commitText: undefined,
      preeditText: "",
      isComposing: false
    });
  });

  it("keeps an emptied preedit session until the browser releases composition", () => {
    const engine = createQuireImeInputEngine();

    engine.handleCompositionStart({ data: "", inputValue: "" });
    engine.handleCompositionUpdate({ data: "n", inputValue: "n" });

    expect(
      engine.handleBeforeInput({
        inputType: "deleteCompositionText",
        data: "",
        isComposing: true,
        inputValue: ""
      })
    ).toMatchObject({
      handledByIme: true,
      preserveInput: true,
      preeditText: "",
      isComposing: true
    });
    expect(engine.handleKeyDown({ key: "Backspace", keyCode: 8 })).toMatchObject({
      handledByIme: false
    });
  });

  it("accepts a new preedit update after a transient empty composition payload", () => {
    const engine = createQuireImeInputEngine();

    engine.handleCompositionStart({ data: "", inputValue: "" });
    engine.handleCompositionUpdate({ data: "ni", inputValue: "ni" });

    expect(
      engine.handleCompositionUpdate({ data: "", inputValue: "" })
    ).toMatchObject({
      handledByIme: true,
      preserveInput: true,
      preeditText: "",
      isComposing: true
    });
    expect(
      engine.handleCompositionUpdate({ data: "n", inputValue: "n" })
    ).toMatchObject({
      handledByIme: true,
      preserveInput: true,
      preeditText: "n",
      isComposing: true
    });
  });

  it("commits finalized composition text once and suppresses duplicate insertText", () => {
    let now = 1000;
    const engine = createQuireImeInputEngine({
      now: () => now,
      dedupeWindowMs: 750
    });

    engine.handleCompositionStart({ data: "" });
    engine.handleCompositionUpdate({ data: "ni" });

    expect(engine.handleCompositionEnd({ data: "你", inputValue: "ni" })).toMatchObject({
      handledByIme: true,
      clearInput: true,
      commitText: "你",
      preeditText: "",
      isComposing: false
    });

    now += 20;
    expect(
      engine.handleBeforeInput({
        inputType: "insertText",
        data: "你"
      })
    ).toMatchObject({
      handledByIme: true,
      preventDefault: true,
      clearInput: true,
      duplicateCommit: true,
      commitText: undefined
    });
  });

  it("lets a deliberate Enter through after a composition commits", () => {
    let now = 1000;
    const engine = createQuireImeInputEngine({ now: () => now });

    engine.handleCompositionStart({ data: "" });
    engine.handleCompositionUpdate({ data: "ni" });
    engine.handleCompositionEnd({ data: "你", inputValue: "ni" });

    // A separate, later keypress for a new line must reach the editor, not be
    // swallowed as IME residue.
    now += 20;
    expect(engine.handleKeyDown({ key: "Enter", keyCode: 13 })).toMatchObject({
      handledByIme: false
    });
  });

  it("swallows IME residue dispatched in the same tick as the commit", () => {
    let now = 1000;
    const engine = createQuireImeInputEngine({ now: () => now });

    engine.handleCompositionStart({ data: "" });
    engine.handleCompositionUpdate({ data: "ni" });
    engine.handleCompositionEnd({ data: "你", inputValue: "ni" });

    expect(engine.handleKeyDown({ key: "Enter", keyCode: 13 })).toMatchObject({
      handledByIme: true
    });
  });

  it("swallows a composing Enter via the isComposing path", () => {
    const engine = createQuireImeInputEngine();

    expect(
      engine.handleKeyDown({ key: "Enter", keyCode: 229, isComposing: true })
    ).toMatchObject({ handledByIme: true });
  });

  it("commits finalized input events when compositionend is missing", () => {
    const engine = createQuireImeInputEngine();

    engine.handleCompositionStart({ data: "" });
    engine.handleCompositionUpdate({ data: "ni" });

    expect(
      engine.handleInput({
        inputType: "insertText",
        data: "你",
        isComposing: false,
        inputValue: "你"
      })
    ).toMatchObject({
      handledByIme: true,
      clearInput: true,
      commitText: "你",
      preeditText: "",
      isComposing: false
    });
  });

  it("derives preedit and fallback commit text from textarea value diffs", () => {
    const engine = createQuireImeInputEngine();

    engine.handleCompositionStart({ data: "" });

    expect(
      engine.handleInput({
        inputType: "insertCompositionText",
        isComposing: true,
        inputValue: "ni"
      })
    ).toMatchObject({
      handledByIme: true,
      preserveInput: true,
      preeditText: "ni"
    });

    expect(engine.handleCompositionUpdate({ data: "", inputValue: "nihao" })).toMatchObject({
      handledByIme: true,
      preserveInput: true,
      preeditText: "nihao"
    });

    expect(engine.handleCompositionEnd({ data: "", inputValue: "你好" })).toMatchObject({
      handledByIme: true,
      clearInput: true,
      commitText: "你好",
      preeditText: "",
      isComposing: false
    });
  });

  it("keeps event data when the input host value has not caught up", () => {
    const engine = createQuireImeInputEngine();

    engine.handleCompositionStart({ data: "", inputValue: "" });

    expect(
      engine.handleCompositionUpdate({
        data: "发大水发大水",
        inputValue: ""
      })
    ).toMatchObject({
      handledByIme: true,
      preserveInput: true,
      preeditText: "发大水发大水"
    });
  });
});
