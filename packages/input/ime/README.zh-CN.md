# @quirekit/ime

[English](./README.md) | 简体中文

`@quirekit/ime` 是 QuireKit 的 renderer-neutral IME composition engine。它会把浏览器
`composition*`、`beforeinput`、`input`、`keydown` 和 `blur` 信号归一化成一个小的
结果对象，让 Canvas、SVG 或 DOM 编辑器视图用一致的方式处理输入法。

这个包不拥有 DOM 节点、editor transaction、layout、overlay 或 ProseMirror plugin。
视图运行时负责提供输入宿主的事实，并决定如何渲染 preedit 文本或提交最终文本。

## 为什么需要这个包

IME 输入不是单次 `input` 事件。成熟编辑器视图需要处理：

- commit 前持续变化的 preedit 文本；
- 浏览器发送 stale 或空的 `event.data`；
- composition session 通过 `input` 而不是 `compositionend` 结束；
- commit 后重复出现的 `insertFromComposition` 或 `insertText`；
- 带有 `isComposing` 或旧式 `keyCode === 229` 的 `keydown`；
- composition 结束后短暂残留的 Enter、Backspace 和 Delete。

`@quirekit/ime` 把这套状态机从具体渲染视图里拿出来，因此 Canvas、SVG 和未来 HTML mode
可以共享同一套浏览器文本服务行为。

## 安装

在 QuireKit workspace 内：

```bash
pnpm add @quirekit/ime
```

该包只提供 ESM，并导出 TypeScript 类型声明。

## 公开 API

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

大多数调用方应该使用 `createQuireImeInputEngine(options)`。

## 基础用法

每个可编辑输入宿主创建一个 engine。不要在两个同时可 focus 的编辑器视图之间共享同一个
engine，因为每个 engine 只跟踪一个浏览器 composition session。

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

## 应用返回结果

每个 handler 都会返回 `QuireImeEventResult`。

| 字段 | 含义 |
| --- | --- |
| `handledByIme` | 该事件属于 IME 处理。当前事件应跳过普通 editor mutation。 |
| `preventDefault` | 有事件对象时调用 `event.preventDefault()`。 |
| `clearInput` | 处理后清空原生输入宿主。可行时把原生 selection 折叠到稳定起点。 |
| `preserveInput` | active composition 期间保留原生输入宿主 value。 |
| `commitText` | 需要插入 editor document 的最终文本，只插入一次。 |
| `preeditText` | 当前可见 preedit 字符串，应由宿主视图渲染。 |
| `isComposing` | 处理该事件后 engine 是否仍处于 composition session。 |
| `duplicateCommit` | engine 消费了一个重复最近 commit 的浏览器事件。 |

通常按下面顺序应用结果：

1. 如果 `handledByIme` 为 false，继续走普通 editor input handling。
2. 如果 `preventDefault` 为 true，阻止浏览器原生编辑。
3. 如果 `commitText` 已定义，通过 editor 的普通文本插入路径提交它。
4. 否则，当 `preserveInput` 为 true 时渲染 `preeditText`。
5. 如果 `clearInput` 为 true，在 editor 更新后清空输入宿主。

## 输入宿主要求

engine 假设视图运行时拥有一个真实浏览器输入宿主，通常是 `textarea` 或
`contenteditable` 元素。

输入宿主应该：

- 在 editor 可编辑时保持 focus；
- 定位到视觉光标附近，让操作系统候选窗跟随它；
- composition 期间保持可测量宽度，不能塌缩成一像素光标；
- 只要可用，就把当前 value 作为 `inputValue` 传入；
- 当 `preserveInput` 为 true 时保留自己的 value；
- 只在返回 `clearInput` 后清空 value；
- 清空后重置原生 selection，避免浏览器 selection state 残留；
- 在与 editor-owned text 冲突时关闭 spellcheck、autocorrect、autocapitalize 和
  autocomplete。

## 事件处理建议

下面这些事件应先交给 IME engine，再进入普通 editor 逻辑：

- `compositionstart`
- `compositionupdate`
- `compositionend`
- `beforeinput`
- `input`
- `keydown`
- `blur`

engine 不要求每个浏览器都发送完整事件序列。当 `compositionend` 缺失或不可用时，它可以
从 `input` commit；当 `event.data` 为空或 stale 时，它可以从输入宿主 value 恢复
preedit 文本。

## 配置

```ts
const ime = createQuireImeInputEngine({
  dedupeWindowMs: 750,
  postCompositionKeyGuardMs: 500,
  now: Date.now
});
```

### `dedupeWindowMs`

默认值：`750`。

浏览器可能先触发 `compositionend`，再触发带有 `insertFromComposition` 的 `beforeinput`，
然后又触发携带相同最终文本的 `insertText`。engine 会记录最近一次 commit，并在这个窗口
内抑制重复 commit 事件。

如果是确定性测试或事件顺序严格的环境，可以设短一些。只有真实设备 trace 证明重复事件
会延迟出现时，才应该设长一些。

### `postCompositionKeyGuardMs`

默认值：`500`。

有些输入法在 composition 结束后会留下一小段编辑键残留，尤其是 Enter、Backspace 或
Delete。engine 会在这个窗口内消费这些按键，避免 commit 后立刻触发误操作。

这个窗口应保持较短。如果太长，IME 输入后的普通键盘编辑会显得被阻塞。

### `now`

默认值：`Date.now`。

用于注入时钟，方便确定性测试和事件顺序 trace 回放。

## 事件载荷

### `QuireImeCompositionEvent`

用于 `handleCompositionStart`、`handleCompositionUpdate` 和 `handleCompositionEnd`。

| 字段 | 说明 |
| --- | --- |
| `data` | 浏览器事件报告的 composition 文本。它可能为空或 stale。 |
| `inputValue` | 当前原生输入宿主 value。engine 会把它作为 fallback，并用于 value diff。 |

### `QuireImeBeforeInputEvent`

用于 `handleBeforeInput`。

| 字段 | 说明 |
| --- | --- |
| `inputType` | 浏览器 Input Events `inputType`，例如 `insertCompositionText`、`insertFromComposition` 或 `insertText`。 |
| `data` | 浏览器报告的文本。 |
| `isComposing` | 浏览器 composition 标记。 |
| `inputValue` | 当前原生输入宿主 value。 |

### `QuireImeInputEvent`

用于 `handleInput`。

| 字段 | 说明 |
| --- | --- |
| `inputType` | input 事件上可选的 Input Events `inputType`。 |
| `data` | 浏览器可选暴露的文本数据。 |
| `isComposing` | 浏览器 composition 标记。 |
| `inputValue` | 浏览器修改后的原生输入宿主 value。 |

### `QuireImeKeyboardEvent`

用于 `handleKeyDown`。

| 字段 | 说明 |
| --- | --- |
| `key` | KeyboardEvent `key`。 |
| `keyCode` | 旧式数字 key code。`229` 会被视为 IME-processing 信号。 |
| `isComposing` | 浏览器 composition 标记。 |

## Preedit 与 Commit 语义

engine 会区分可见 preedit 和最终文本。

- `preeditText` 是临时文本。可以把它渲染到 composition overlay、virtual inline run 或
  editor-level composition session 中。除非返回 `commitText`，否则不要提交到文档。
- `commitText` 是最终文本。通过 editor 的普通文本路径插入一次。
- 当 `compositionend.data` 为空时，engine 可以从输入宿主 value diff 或最后一次 preedit
  字符串中得到 commit。
- 当输入宿主 value 尚未追上浏览器事件时，非空 `event.data` 仍是 preedit 渲染的事实来源。

## 与编辑器视图集成

`@quirekit/ime` 有意停在 editor mutation 之前。QuireKit view adapter 通常会围绕 engine
完成这些工作：

1. 拥有一个可 focus 的输入宿主。
2. 把浏览器事件送入 `QuireImeInputEngine`。
3. 通过当前 view backend 渲染 `preeditText`。
4. 通过 editor transaction 插入 `commitText`。
5. 当 view layer 支持时，为 composition 来源的 transaction 标记 editor 的 composition
   metadata。
6. 如果 editor runtime 需要模拟 ProseMirror view 语义，把 `compositionstart`、
   `compositionupdate` 和 `compositionend` 桥接到 plugin hook。

## 当前限制

这个包刻意保持小而专注，暂时不提供：

- DOM input host 抽象；
- 覆盖 iOS、Android、Windows TSF、Safari 或虚拟键盘细节的平台策略模块；
- 拥有 range、cursor、validation、rollback 和 history isolation 的 editor-level
  composition session；
- 覆盖所有 autocorrect、dictation、韩文 syllable 或 suggestion 路径的 grapheme-aware
  replacement diff。

这些能力应在有真实 trace-backed 兼容性数据后，放到更大的 input/view runtime 中实现。

## 测试

运行包测试：

```bash
pnpm --filter @quirekit/ime test
```

运行类型检查：

```bash
pnpm --filter @quirekit/ime typecheck
```

修改浏览器事件行为时，应同时补充直接使用 event data 的测试，以及使用 `inputValue` fallback
的测试。测试 duplicate window 或 post-composition key guard 时，优先通过 `now` option 注入
确定性时钟。
