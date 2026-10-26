# @quirekit/ime

English | [简体中文](./README.zh-CN.md)

`@quirekit/ime` is QuireKit's renderer-neutral IME composition engine. It
normalizes browser `composition*`, `beforeinput`, `input`, `keydown`, and
`blur` signals into a small result object that Canvas, SVG, or DOM editor views
can apply consistently.

The package does not own DOM nodes, editor transactions, layout, overlays, or
ProseMirror plugins. A view runtime supplies the input-host facts and decides
how to render preedit text or commit finalized text.

## Why This Package Exists

IME input is not a single `input` event. Mature editor views need to handle:

- preedit text that changes before it is committed;
- browsers that send stale or empty `event.data`;
- composition sessions that finish through `input` instead of
  `compositionend`;
- duplicate `insertFromComposition` or `insertText` events after a commit;
- `keydown` events with `isComposing` or legacy `keyCode === 229`;
- short-lived Enter, Backspace, and Delete residue after composition ends.

`@quirekit/ime` keeps that state machine outside renderer-specific view code, so
Canvas, SVG, and future HTML modes can share the same browser text-service
behavior.

## Installation

Inside QuireKit workspaces:

```bash
pnpm add @quirekit/ime
```

The package is ESM-only and exports TypeScript declarations.

## Public API

```ts
import {
  QuireImeInputEngine,
  createQuireImeInputEngine,
  type QuireImeBeforeInputEvent,
  type QuireImeCompositionEvent,
  type QuireImeEventResult,
  type QuireImeInputEngineOptions,
  type QuireImeInputEvent,
  type QuireImeKeyboardEvent
} from "@quirekit/ime";
```

Most callers should use `createQuireImeInputEngine(options)`.

## Basic Usage

Create one engine per editable input host. Do not share an engine across two
focused editor views, because each engine tracks one browser composition
session.

```ts
import { createQuireImeInputEngine, type QuireImeEventResult } from "@quirekit/ime";

const ime = createQuireImeInputEngine();
const inputHost = document.createElement("textarea");

function applyImeResult(result: QuireImeEventResult, event?: Event) {
  if (!result.handledByIme) {
    return false;
  }

  if (result.preventDefault) {
    event?.preventDefault();
  }

  if (result.commitText !== undefined) {
    editor.insertText(result.commitText);
  } else if (result.preserveInput) {
    renderCompositionPreview(result.preeditText);
  }

  if (result.clearInput) {
    inputHost.value = "";
    inputHost.setSelectionRange(0, 0);
  }

  return true;
}

inputHost.addEventListener("compositionstart", (event) => {
  applyImeResult(
    ime.handleCompositionStart({
      data: event.data,
      inputValue: inputHost.value
    }),
    event
  );
});

inputHost.addEventListener("compositionupdate", (event) => {
  applyImeResult(
    ime.handleCompositionUpdate({
      data: event.data,
      inputValue: inputHost.value
    }),
    event
  );
});

inputHost.addEventListener("compositionend", (event) => {
  applyImeResult(
    ime.handleCompositionEnd({
      data: event.data,
      inputValue: inputHost.value
    }),
    event
  );
});

inputHost.addEventListener("beforeinput", (event) => {
  const inputEvent = event as InputEvent;
  const result = ime.handleBeforeInput({
    inputType: inputEvent.inputType,
    data: inputEvent.data,
    isComposing: inputEvent.isComposing,
    inputValue: inputHost.value
  });

  if (applyImeResult(result, event)) {
    return;
  }

  handleNormalBeforeInput(inputEvent);
});

inputHost.addEventListener("input", (event) => {
  const inputEvent = event as InputEvent;
  const result = ime.handleInput({
    inputType: inputEvent.inputType,
    data: inputEvent.data,
    isComposing: inputEvent.isComposing,
    inputValue: inputHost.value
  });

  if (applyImeResult(result, event)) {
    return;
  }

  handleNormalInput(inputHost.value);

  if (result.clearInput) {
    inputHost.value = "";
    inputHost.setSelectionRange(0, 0);
  }
});

inputHost.addEventListener("keydown", (event) => {
  const result = ime.handleKeyDown({
    key: event.key,
    keyCode: event.keyCode,
    isComposing: event.isComposing
  });

  if (applyImeResult(result, event)) {
    return;
  }

  handleNormalKeyDown(event);
});

inputHost.addEventListener("blur", () => {
  applyImeResult(ime.handleBlur());
});
```

## Applying Results

Every handler returns `QuireImeEventResult`.

| Field | Meaning |
| --- | --- |
| `handledByIme` | The event belonged to IME handling. Skip ordinary editor mutation for this event. |
| `preventDefault` | Call `event.preventDefault()` when an event object is available. |
| `clearInput` | Clear the native input host after handling. Collapse its selection to a stable origin when possible. |
| `preserveInput` | Keep the native input host value during active composition. |
| `commitText` | Finalized text to insert into the editor document exactly once. |
| `preeditText` | Current visible preedit string to render in the host view. |
| `isComposing` | Whether the engine is inside a composition session after handling the event. |
| `duplicateCommit` | The engine consumed a browser event that repeated a recent commit. |

The usual result application order is:

1. If `handledByIme` is false, continue through normal editor input handling.
2. If `preventDefault` is true, prevent the browser's native edit.
3. If `commitText` is defined, insert it through the editor's normal text
   insertion path.
4. Otherwise, render `preeditText` when `preserveInput` is true.
5. If `clearInput` is true, clear the input host after the editor update.

## Input Host Requirements

The engine assumes the view runtime owns a real browser input host, usually a
`textarea` or `contenteditable` element.

The host should:

- stay focused while the editor is editable;
- be positioned near the visual caret so the OS candidate window follows it;
- keep a measurable width during composition instead of collapsing to a
  one-pixel caret;
- pass its current value as `inputValue` whenever available;
- preserve its value while `preserveInput` is true;
- clear its value only after `clearInput` is returned;
- reset the native selection after clearing to avoid stale browser selection
  state;
- disable browser features such as spellcheck, autocorrect, autocapitalize, and
  autocomplete when they conflict with editor-owned text.

## Event Handling Guidance

Call the IME engine before ordinary editor logic for:

- `compositionstart`
- `compositionupdate`
- `compositionend`
- `beforeinput`
- `input`
- `keydown`
- `blur`

The engine does not require every browser to send every event. It can commit
from `input` when `compositionend` is missing or unhelpful, and it can recover
preedit text from the input host value when `event.data` is empty or stale.

## Configuration

```ts
const ime = createQuireImeInputEngine({
  dedupeWindowMs: 750,
  postCompositionKeyGuardMs: 500,
  now: Date.now
});
```

### `dedupeWindowMs`

Default: `750`.

Browsers may emit `compositionend`, then `beforeinput` with
`insertFromComposition`, then another `insertText` carrying the same finalized
text. The engine records the recent commit and suppresses duplicate commit
events within this window.

Use a shorter value for deterministic tests or an environment with strict event
ordering. Use a longer value only when real-device traces show delayed duplicate
events.

### `postCompositionKeyGuardMs`

Default: `500`.

Some IMEs leave a short tail of editing keys after composition finishes,
especially Enter, Backspace, or Delete. The engine consumes those keys inside
this window to avoid accidental editor commands immediately after a commit.

Keep this window short. If it is too long, normal keyboard editing can feel
blocked after IME input.

### `now`

Default: `Date.now`.

Inject a clock for deterministic tests and event-order trace replay.

## Event Payloads

### `QuireImeCompositionEvent`

Used by `handleCompositionStart`, `handleCompositionUpdate`, and
`handleCompositionEnd`.

| Field | Description |
| --- | --- |
| `data` | Composition text reported by the browser. It may be empty or stale. |
| `inputValue` | Current native input-host value. The engine uses this as a fallback and for value diffing. |

### `QuireImeBeforeInputEvent`

Used by `handleBeforeInput`.

| Field | Description |
| --- | --- |
| `inputType` | Browser Input Events `inputType`, such as `insertCompositionText`, `insertFromComposition`, or `insertText`. |
| `data` | Text reported by the browser. |
| `isComposing` | Browser composition flag. |
| `inputValue` | Current native input-host value. |

### `QuireImeInputEvent`

Used by `handleInput`.

| Field | Description |
| --- | --- |
| `inputType` | Optional Input Events `inputType` exposed on the input event. |
| `data` | Optional text data exposed by the browser. |
| `isComposing` | Browser composition flag. |
| `inputValue` | Native input-host value after the browser has changed it. |

### `QuireImeKeyboardEvent`

Used by `handleKeyDown`.

| Field | Description |
| --- | --- |
| `key` | KeyboardEvent `key`. |
| `keyCode` | Legacy numeric key code. `229` is treated as an IME-processing signal. |
| `isComposing` | Browser composition flag. |

## Preedit And Commit Semantics

The engine distinguishes visible preedit from finalized text.

- `preeditText` is transient. Render it in a composition overlay, virtual inline
  run, or editor-level composition session. Do not commit it to the document
  unless `commitText` is returned.
- `commitText` is final. Insert it once through the editor's normal text path.
- When `compositionend.data` is empty, the engine can commit from the input-host
  value diff or from the last preedit string.
- When the input host value has not caught up yet, non-empty `event.data`
  remains the source of truth for preedit rendering.

## Integration With Editor Views

`@quirekit/ime` intentionally stops before editor mutation. A QuireKit view
adapter typically performs the following work around the engine:

1. Own a focusable input host.
2. Feed browser events into `QuireImeInputEngine`.
3. Render `preeditText` through the active view backend.
4. Insert `commitText` through editor transactions.
5. Tag composition-originated transactions with the editor's composition
   metadata when the view layer supports it.
6. Bridge `compositionstart`, `compositionupdate`, and `compositionend` into
   plugin hooks if the editor runtime emulates ProseMirror view semantics.

## Limitations

This package is intentionally small and does not yet provide:

- a DOM input host abstraction;
- a platform policy module for iOS, Android, Windows TSF, Safari, or virtual
  keyboard quirks;
- an editor-level composition session with owned range, cursor, validation,
  rollback, and history isolation;
- grapheme-aware replacement diffing for every autocorrect, dictation, Korean
  syllable, or suggestion path.

Those features belong in the larger input/view runtime once trace-backed
compatibility data is available.

## Testing

Run the package tests:

```bash
pnpm --filter @quirekit/ime test
```

Run type checking:

```bash
pnpm --filter @quirekit/ime typecheck
```

When changing browser event behavior, add tests for both the direct event data
path and the `inputValue` fallback path. Prefer deterministic clocks through
the `now` option when testing duplicate windows or post-composition key guards.
