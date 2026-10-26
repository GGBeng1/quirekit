import { describe, expect, it, vi } from "vitest";
import {
  Decoration as PMDecoration,
  Plugin,
  PluginKey,
  Selection,
  type EditorProps as PMEditorProps,
  type EditorState as PMEditorState,
  type EditorView,
  TextSelection,
  type Transaction
} from "@quirekit/pm";
import { Fragment, h } from "../jsx-runtime";
import {
  type CommandProps,
  combineTransactionSteps,
  createChainableState,
  createAtomBlockMarkdownSpec,
  createBasicSchema,
  createInlineMarkdownSpec,
  createDocument,
  createEditor,
  defaultBlockAt,
  findChildren,
  findChildrenInRange,
  findParentNode,
  findParentNodeClosestToPos,
  Extension,
  deleteProps,
  escapeForRegEx,
  findDuplicates,
  fromString,
  generateText,
  getAttributes,
  getAttributesFromExtensions,
  getChangedRanges,
  getDebugJSON,
  getExtensionField,
  getRenderedAttributes,
  getSchemaByResolvedExtensions,
  isExtensionRulesEnabled,
  getMarksBetween,
  getNodeAtPosition,
  getSplittedAttributes,
  getTextSerializersFromSchema,
  injectExtensionAttributesToParseRule,
  InputRule,
  isAtEndOfNode,
  isAtStartOfNode,
  isList,
  isNodeEmpty,
  isActive,
  isPlainObject,
  markInputRule,
  markPasteRule,
  mergeAttributes,
  minMax,
  markdown,
  nodeInputRule,
  nodePasteRule,
  objectIncludes,
  parseAttributes,
  selectionToInsertionEnd,
  DecorationSet,
  Mark,
  Node,
  PasteRule,
  resolveExtensions,
  resolveFocusPosition,
  rewriteUnknownContent,
  selectionPreset,
  setMark,
  TextDirection,
  textInputRule,
  textblockTypeInputRule,
  textPasteRule,
  toggleMark,
  Tracker,
  unsetMark,
  wrappingInputRule,
  posToDOMRect,
  QuireExtensionManager,
  type QuireEditor,
  type QuireEditorEvents,
  type QuireViewAdapter
} from "../index";
import { createQuireLayoutProviderRegistrationRegistry } from "../layout-provider";

/** Test-only commands contributed by inline fixture extensions. */
type TestCommandMethods<ReturnType> = {
  readSeenLabel: () => ReturnType;
  insertNested: () => ReturnType;
  readNoteStorage: () => ReturnType;
  readHighlightStorage: () => ReturnType;
  ping: () => ReturnType;
  insertA: () => ReturnType;
  insertB: () => ReturnType;
  blocked: () => ReturnType;
  incrementCounter: () => ReturnType;
  prependGreeting: () => ReturnType;
  greet: () => ReturnType;
  insertHello: () => ReturnType;
};

declare module "../types" {
  interface Commands<ReturnType> {
    /** Commands installed only by fixtures in this test module. */
    readonly tests: TestCommandMethods<ReturnType>;
  }
}

/** Empty mounted widget query methods used by fake view adapters. */
const emptyMountedWidgetQueries = {
  /** Reads no widgets. */
  getWidgets: () => [],
  /** Finds no widget by id. */
  getWidgetById: () => undefined,
  /** Finds no widgets by role. */
  getWidgetsByRole: () => [],
  /** Finds no widgets by part. */
  getWidgetsByPart: () => [],
  /** Finds no widgets by document position. */
  getWidgetsByPosition: () => [],
  /** Finds no widgets by document range. */
  getWidgetsByRange: () => [],
  /** Hits no widget at a point. */
  widgetAtPoint: () => null,
  /** Retains no mounted pointer target. */
  getInteractionTargetSnapshot: () => null
};

describe("QuireEditor", () => {
  it("creates a default ProseMirror document", () => {
    const editor = createEditor();

    expect(editor.state.doc.type.name).toBe("doc");
    expect(editor.state.doc.textContent).toBe("");
  });

  it("sets Tiptap-compatible JSON content", () => {
    const editor = createEditor();

    editor.setContent({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "hello from JSON" }]
        }
      ]
    });

    expect(editor.state.doc.textContent).toBe("hello from JSON");
  });

  it("sets markdown content when the caller declares the content type", () => {
    const editor = createEditor({
      content: "Initial **bold** and *italic*",
      contentType: "markdown",
      extensions: [
        Mark.create({ name: "bold" }),
        Mark.create({ name: "italic" })
      ]
    });

    editor.setContent("Next **strong** and *emphasized*", {
      contentType: "markdown"
    });

    expect(editor.state.doc.toJSON()).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Next " },
            { type: "text", marks: [{ type: "bold" }], text: "strong" },
            { type: "text", text: " and " },
            { type: "text", marks: [{ type: "italic" }], text: "emphasized" }
          ]
        }
      ]
    });
  });

  it("serializes editor content to markdown with the editor markdown manager", () => {
    const editor = createEditor({
      content: "Marked **bold** and *italic*",
      contentType: "markdown",
      extensions: [
        Mark.create({ name: "bold" }),
        Mark.create({ name: "italic" })
      ]
    });

    expect(editor.markdown.parse("Next *line*").content?.[0]?.type).toBe("paragraph");
    expect(editor.getMarkdown()).toBe("Marked **bold** and *italic*");
  });

  it("exports Tiptap-compatible markdown utility helpers", () => {
    expect(parseAttributes('.note #main checked title="Hello"')).toEqual({
      class: "note",
      id: "main",
      checked: true,
      title: "Hello"
    });
    expect(markdown.serializeAttributes({
      class: "note",
      id: "main",
      checked: true,
      title: "Hello"
    })).toBe('.note #main checked title="Hello"');

    const mentionSpec = createInlineMarkdownSpec({
      nodeName: "mention",
      selfClosing: true,
      allowedAttributes: ["id"]
    });
    const token = mentionSpec.markdownTokenizer.tokenize(
      '[mention id="ada" label="Ada"]',
      [],
      {
        inlineTokens: () => [],
        blockTokens: () => []
      }
    );

    expect(token).toMatchObject({
      type: "mention",
      attributes: {
        id: "ada",
        label: "Ada"
      }
    });
    expect(mentionSpec.parseMarkdown(token!, {
      parseInline: () => [],
      parseChildren: () => [],
      createTextNode: (text) => ({ type: "text", text }),
      createNode: (type, attrs, content) => ({
        type,
        ...(attrs ? { attrs } : {}),
        ...(content ? { content } : {})
      }),
      applyMark: (mark, content, attrs) => ({ mark, content, attrs })
    })).toEqual({
      type: "mention",
      attrs: {
        id: "ada",
        label: "Ada"
      }
    });
    expect(mentionSpec.renderMarkdown({
      type: "mention",
      attrs: {
        id: "ada",
        label: "Ada"
      }
    })).toBe('[mention id="ada"]');

    const imageSpec = createAtomBlockMarkdownSpec({
      nodeName: "image",
      requiredAttributes: ["src"],
      allowedAttributes: ["src"]
    });

    expect(imageSpec.renderMarkdown({
      type: "image",
      attrs: {
        src: "asset.png",
        title: "ignored"
      }
    })).toBe(':::image {src="asset.png"} :::');
  });

  it("exposes Tiptap-compatible markdown fields from extension classes", () => {
    const parseMarkdown = vi.fn((token, helpers) =>
      helpers.createTextNode(token.text ?? "")
    );
    const renderMarkdown = vi.fn((node) => node.text ?? "");
    const tokenizer = {
      name: "token",
      level: "inline" as const,
      tokenize: () => undefined
    };
    const extension = Extension.create({
      name: "plainMarkdown",
      markdownTokenName: "text",
      parseMarkdown,
      renderMarkdown,
      markdownTokenizer: tokenizer,
      markdownOptions: {
        indentsContent: true
      }
    });

    expect(extension.markdownTokenName).toBe("text");
    expect(extension.parseMarkdown?.(
      { type: "text", text: "hello" },
      {
        parseInline: () => [],
        parseChildren: () => [],
        createTextNode: (text) => ({ type: "text", text }),
        createNode: (type, attrs, content) => ({
          type,
          ...(attrs ? { attrs } : {}),
          ...(content ? { content } : {})
        }),
        applyMark: (mark, content, attrs) => ({ mark, content, attrs })
      }
    )).toEqual({ type: "text", text: "hello" });
    expect(extension.renderMarkdown?.(
      { type: "text", text: "hello" },
      {
        renderChildren: () => "",
        wrapInBlock: (_prefix, content) => content,
        indent: (content) => content
      },
      {
        index: 0,
        level: 0
      }
    )).toBe("hello");
    expect(extension.markdownTokenizer).toBe(tokenizer);
    expect(extension.markdownOptions).toEqual({ indentsContent: true });

    const node = Node.create({
      name: "callout",
      markdownTokenName: "blockquote"
    });
    const mark = Mark.create({
      name: "strike",
      markdownTokenName: "del"
    });

    expect(node.markdownTokenName).toBe("blockquote");
    expect(mark.markdownTokenName).toBe("del");
  });

  it("registers extension-owned markdown handlers on the editor markdown manager", () => {
    const highlight = Mark.create({
      name: "highlight",
      markdownTokenName: "mark",
      parseMarkdown(token, helpers) {
        return helpers.applyMark(
          "highlight",
          helpers.parseInline(token.tokens ?? []),
          { tone: "yellow" }
        );
      },
      renderMarkdown(node, helpers) {
        return `==${helpers.renderChildren(node.content ?? [])}==`;
      },
      markdownTokenizer: {
        name: "mark",
        level: "inline",
        start: "==",
        tokenize(source, _tokens, lexer) {
          const match = source.match(/^==([^=]+)==/);

          if (!match) {
            return undefined;
          }

          return {
            type: "mark",
            raw: match[0],
            tokens: lexer.inlineTokens(match[1] ?? "")
          };
        }
      }
    });
    const editor = createEditor({
      extensions: [highlight]
    });
    const resolvedHighlight = editor.extensions.find((extension) => extension.name === "highlight");

    expect(highlight.markdownTokenizer?.name).toBe("mark");
    expect(resolvedHighlight?.markdownTokenizer?.name).toBe("mark");

    expect(editor.markdown.parse("Marked ==text==").content).toEqual([
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Marked " },
          {
            type: "text",
            text: "text",
            marks: [{ type: "highlight", attrs: { tone: "yellow" } }]
          }
        ]
      }
    ]);
    expect(editor.markdown.serialize({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Marked " },
            {
              type: "text",
              text: "text",
              marks: [{ type: "highlight", attrs: { tone: "yellow" } }]
            }
          ]
        }
      ]
    })).toBe("Marked ==text==");
  });

  it("reports active node and mark attributes for toolbar state", () => {
    const editor = createEditor({
      extensions: [
        Mark.create({
          name: "highlight",
          addAttributes() {
            return {
              color: { default: null }
            };
          }
        })
      ]
    });

    editor.setContent({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              marks: [{ type: "highlight", attrs: { color: "gold" } }],
              text: "marked"
            }
          ]
        }
      ]
    });
    editor.dispatchTransaction(
      editor.state.pm.tr.setSelection(Selection.near(editor.state.doc.resolve(3), 1))
    );

    expect(editor.getAttributes("paragraph")).toEqual({});
    expect(editor.getAttributes("highlight")).toEqual({ color: "gold" });
    expect(getAttributes(editor.state.pm, "highlight")).toEqual({ color: "gold" });
    expect(editor.isActive("paragraph")).toBe(true);
    expect(editor.isActive("highlight", { color: "gold" })).toBe(true);
    expect(isActive(editor.state.pm, "highlight", { color: "gold" })).toBe(true);
    expect(editor.isActive("highlight", { color: "blue" })).toBe(false);
    expect(editor.isActive("missing")).toBe(false);
  });

  it("exposes Tiptap-compatible readonly editor state helpers", () => {
    const editor = createEditor({
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "hello helpers" }]
          }
        ]
      }
    });

    expect(editor.schema).toBe(editor.state.schema);
    expect(editor.storage).toBe(editor.state.storage);
    expect(editor.view.state).toBe(editor.state.pm);
    expect(editor.getJSON()).toEqual(editor.state.doc.toJSON());
    expect(editor.getText()).toBe("hello helpers");
    expect(editor.isEmpty).toBe(false);
    expect(editor.isDestroyed).toBe(false);

    editor.destroy();

    expect(editor.isDestroyed).toBe(true);
  });

  it("tracks Tiptap-compatible focus state", () => {
    const editor = createEditor();

    expect(editor.isEmpty).toBe(true);
    expect(editor.isFocused).toBe(false);

    editor.dispatchTransaction(
      editor.state.pm.tr.setMeta("focus", {})
    );
    expect(editor.isFocused).toBe(true);

    editor.dispatchTransaction(
      editor.state.pm.tr.setMeta("blur", {})
    );
    expect(editor.isFocused).toBe(false);
  });

  it("updates Tiptap-compatible editability state", () => {
    const calls: string[] = [];
    const editor = createEditor({
      onUpdate: () => calls.push("update")
    });

    expect(editor.isEditable).toBe(true);
    editor.setEditable(false, false);
    expect(editor.isEditable).toBe(false);
    editor.setEditable(true);
    expect(editor.isEditable).toBe(true);
    expect(calls).toEqual(["update"]);
  });

  it("exposes canonical options and updates option callbacks through setOptions", () => {
    const calls: string[] = [];
    const editor = createEditor({
      content: {
        type: "doc",
        content: [{ type: "paragraph" }]
      }
    });

    expect(editor.options.editable).toBe(true);
    expect(editor.options.enableCoreExtensions).toBe(true);
    expect(editor.options.enableContentCheck).toBe(false);

    editor.setOptions({
      editable: false,
      onUpdate: ({ transaction }) => {
        calls.push(transaction.docChanged ? "document" : "selection");
      }
    });
    expect(editor.options.editable).toBe(false);

    editor.dispatchTransaction(editor.state.pm.tr.insertText("x", 1));
    expect(calls).toEqual(["document"]);
  });

  it("mounts and updates view adapters contributed by extensions", () => {
    const mountedUpdates: string[] = [];
    const viewLifecycleCalls: string[] = [];
    const ownerDocument = createTestOwnerDocument();
    let focusedViewId: string | null = null;
    const adapter: QuireViewAdapter = {
      mode: "canvas",
      mount: (options) => {
        let destroyed = false;
        function someProp<PropName extends keyof PMEditorProps, Result>(
          propName: PropName,
          f: (value: NonNullable<PMEditorProps[PropName]>) => Result
        ): Result | undefined;
        function someProp<PropName extends keyof PMEditorProps>(
          propName: PropName
        ): NonNullable<PMEditorProps[PropName]> | undefined;
        function someProp<PropName extends keyof PMEditorProps, Result>(
          propName: PropName,
          f?: (value: NonNullable<PMEditorProps[PropName]>) => Result
        ): Result | NonNullable<PMEditorProps[PropName]> | undefined {
          return f
            ? options.editor.someProp(propName, f)
            : options.editor.someProp(propName);
        }

        return {
          id: options.id,
          mode: options.mode,
          status: options.status,
          ...emptyMountedWidgetQueries,
          get state() {
            return options.editor.state.pm;
          },
          get props() {
            return {
              ...options.editor.editorProps,
              state: options.editor.state.pm
            };
          },
          dom: options.element,
          editable: options.status !== "lock" && options.editor.isEditable,
          hiddenTextViewMode: "normal" as const,
          get root() {
            return options.element.ownerDocument;
          },
          elements: {
            root: options.element
          },
          focus: () => {
            focusedViewId = options.id;
          },
          dispatch: (transaction) => {
            options.editor.dispatchTransaction(transaction);
          },
          hasFocus: () => focusedViewId === options.id,
          someProp,
          setProps: (props) => {
            options.editor.setEditorProps(props);
          },
          updateRoot: () => {},
          updateState: (state) => {
            if (state !== options.editor.state.pm) {
              throw new RangeError("test view cannot replace shared state");
            }
          },
          setHiddenTextViewMode: () => {},
          dispatchEvent: () => false,
          pasteHTML: () => false,
          pasteText: () => false,
          scrollToSelection: () => false,
          scrollRangeIntoView: () => false,
          serializeForClipboard: (slice) => {
            const dom = options.element.ownerDocument.createElement("div");

            return { dom, text: slice.content.textBetween(0, slice.content.size), slice };
          },
          posAtCoords: () => null,
          coordsAtPos: () => ({
            left: 0,
            right: 0,
            top: 0,
            bottom: 0
          }),
          endOfTextblock: () => false,
          get isDestroyed() {
            return destroyed;
          },
          update: (updateOptions) => {
            mountedUpdates.push(`${options.id}:${updateOptions.reason}`);
          },
          destroy: () => {
            destroyed = true;
            mountedUpdates.push(`${options.id}:destroy`);
          }
        };
      }
    };
    const viewExtension = Extension.create({
      name: "test-view-runtime",
      addViewAdapters() {
        return [adapter];
      }
    });
    const primaryElement = ownerDocument.createElement("div");
    const editor = createEditor({
      element: primaryElement,
      mode: "canvas",
      extensions: [viewExtension],
      viewId: "primary",
      onMount: () => viewLifecycleCalls.push("mount"),
      onUnmount: () => viewLifecycleCalls.push("unmount")
    });

    expect(viewLifecycleCalls).toEqual(["mount"]);

    expect(() =>
      editor.mount({
        id: "primary",
        mode: "canvas",
        element: ownerDocument.createElement("div"),
        ownerDocument
      })
    ).toThrow(/already mounted/);

    const previewElement = ownerDocument.createElement("div");
    const preview = editor.mount({
      id: "preview",
      mode: "canvas",
      element: previewElement,
      ownerDocument
    });

    expect(() =>
      editor.mount({
        id: "preview",
        mode: "canvas",
        element: ownerDocument.createElement("div"),
        ownerDocument
      })
    ).toThrow(/already mounted/);

    const editableMirrorElement = ownerDocument.createElement("div");
    const editableMirror = editor.mount({
      id: "editable-mirror",
      mode: "canvas",
      element: editableMirrorElement,
      editable: true,
      ownerDocument
    });

    vi.useFakeTimers();
    try {
      editor.setContent({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "synced" }] }]
      });

      expect(preview.status).toBe("lock");
      expect(preview.editable).toBe(false);
      expect(editableMirror.status).toBe("sync");
      expect(editableMirror.editable).toBe(true);
      expect(mountedUpdates).toEqual(["primary:document-replace"]);

      vi.runOnlyPendingTimers();

      expect(mountedUpdates).toEqual([
        "primary:document-replace",
        "preview:document-replace",
        "editable-mirror:document-replace"
      ]);

      editableMirror.focus();
      editor.setContent({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "mirror" }] }]
      });

      expect(mountedUpdates).toEqual([
        "primary:document-replace",
        "preview:document-replace",
        "editable-mirror:document-replace",
        "editable-mirror:document-replace"
      ]);

      vi.runOnlyPendingTimers();

      preview.destroy();
      preview.destroy();
      editableMirror.destroy();
      editor.destroy();

      expect(mountedUpdates).toEqual([
        "primary:document-replace",
        "preview:document-replace",
        "editable-mirror:document-replace",
        "editable-mirror:document-replace",
        "primary:document-replace",
        "preview:document-replace",
        "preview:destroy",
        "editable-mirror:destroy",
        "primary:destroy"
      ]);
      expect(viewLifecycleCalls).toEqual(["mount", "unmount"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("collects extension-owned qkView event handlers in priority order", () => {
    const firstHandler = vi.fn();
    const duplicateHandler = vi.fn();
    const generatedHandler = vi.fn();
    const nodeHandler = vi.fn();
    const markHandler = vi.fn();
    const manager = new QuireExtensionManager({
      extensions: [
        Extension.create({
          name: "first-view-handlers",
          priority: 100,
          viewEventHandlers: {
            openMenu: firstHandler
          }
        }),
        Extension.create({
          name: "generated-view-handlers",
          addViewEventHandlers() {
            return {
              openMenu: duplicateHandler,
              closeMenu: generatedHandler
            };
          }
        }),
        Node.create({
          name: "handlerNode",
          group: "block",
          viewEventHandlers: {
            "node.inspect": nodeHandler
          }
        }),
        Mark.create({
          name: "handlerMark",
          viewEventHandlers: {
            "mark.inspect": markHandler
          }
        })
      ]
    });

    expect(manager.viewEventHandlers.openMenu).toBe(firstHandler);
    expect(manager.viewEventHandlers.closeMenu).toBe(generatedHandler);
    expect(manager.viewEventHandlers["node.inspect"]).toBe(nodeHandler);
    expect(manager.viewEventHandlers["mark.inspect"]).toBe(markHandler);
    expect(manager.viewEventHandlers.openMenu).not.toBe(duplicateHandler);
  });

  it("collects Tiptap-compatible node view renderers", () => {
    let nodeViewTypeName = "";
    let receivedProps: any = null;
    const editor = createEditor({
      extensions: [
        Node.create({
          name: "card",
          group: "block",
          addAttributes() {
            return {
              label: {
                default: null,
                rendered: true
              }
            };
          },
          addNodeView() {
            nodeViewTypeName = this.type.name;

            return (props) => {
              receivedProps = props;
              return { kind: "card-node-view" };
            };
          },
          renderHTML({ HTMLAttributes }) {
            return ["section", HTMLAttributes, 0];
          }
        })
      ]
    });
    const node = editor.state.schema.nodes.card!.create({ label: "Featured" });
    const nodeView = editor.extensionManager.nodeViews.card?.(
      node,
      editor.view,
      () => 1,
      [],
      DecorationSet.empty
    );

    expect(nodeView).toEqual({ kind: "card-node-view" });
    expect(nodeViewTypeName).toBe("card");
    expect(receivedProps.editor).toBe(editor);
    expect(receivedProps.extension.name).toBe("card");
    expect(receivedProps.HTMLAttributes).toEqual({ label: "Featured" });
    expect(receivedProps.getPos()).toBe(1);
  });

  it("collects Tiptap-compatible mark view renderers", () => {
    let markViewTypeName = "";
    let receivedProps: any = null;
    const editor = createEditor({
      extensions: [
        Mark.create({
          name: "badge",
          addAttributes() {
            return {
              tone: {
                default: null,
                rendered: true
              }
            };
          },
          addMarkView() {
            markViewTypeName = this.type.name;

            return (props) => {
              receivedProps = props;
              return { kind: "badge-mark-view" };
            };
          },
          renderHTML({ HTMLAttributes }) {
            return ["span", HTMLAttributes, 0];
          }
        })
      ]
    });
    const mark = editor.state.schema.marks.badge!.create({ tone: "info" });
    const markView = editor.extensionManager.markViews.badge?.(
      mark,
      editor.view,
      true
    );

    expect(markView).toEqual({ kind: "badge-mark-view" });
    expect(markViewTypeName).toBe("badge");
    expect(receivedProps.editor).toBe(editor);
    expect(receivedProps.extension.name).toBe("badge");
    expect(receivedProps.inline).toBe(true);
    expect(receivedProps.HTMLAttributes).toEqual({ tone: "info" });
  });

  it("marks plain extensions with the extension kind", () => {
    const extension = Extension.create({ name: "plain" });

    expect(extension.kind).toBe("extension");
    expect(extension.type).toBe("extension");
  });

  it("creates extensions through a Tiptap-compatible Extension class", () => {
    const extension = Extension.create({ name: "class-extension" });
    const configured = extension.configure({});
    const generated = Extension.create(() => ({ name: "generated-extension" }));

    expect(extension).toBeInstanceOf(Extension);
    expect(configured).toBeInstanceOf(Extension);
    expect(extension.kind).toBe("extension");
    expect(extension.type).toBe("extension");
    expect(extension.name).toBe("class-extension");
    expect(generated.name).toBe("generated-extension");
  });

  it("supports Tiptap-compatible configure and extend contexts", () => {
    const extension = Extension.create<
      { label: string; nested: { left: number; right: number } },
      { seenLabel: string }
    >({
      name: "settings",
      addOptions() {
        return {
          label: "base",
          nested: { left: 1, right: 2 }
        };
      },
      addStorage() {
        return {
          seenLabel: this.options.label
        };
      },
      addCommands() {
        return {
          readSeenLabel: () => () => this.storage.seenLabel === "child"
        };
      }
    });
    const configured = extension.configure({
      label: "child",
      nested: { right: 3 } as { left: number; right: number }
    });
    const extended = extension.extend({
      addOptions() {
        const parent = this.parent as () => {
          label: string;
          nested: { left: number; right: number };
        };

        return {
          ...parent(),
          label: "extended"
        };
      }
    });

    expect(configured.options).toEqual({
      label: "child",
      nested: { left: 1, right: 3 }
    });
    expect(configured.storage).toEqual({ seenLabel: "child" });
    const commandEditor = createEditor({ extensions: [configured] });
    expect(commandEditor.commands.readSeenLabel()).toBe(true);
    expect(extended.options.label).toBe("extended");
  });

  it("flattens child extensions returned from addExtensions", () => {
    const kit = Extension.create({
      name: "nested-kit",
      addExtensions() {
        return [
          Extension.create({
            name: "nested-command",
            addCommands() {
              return {
                insertNested: () => ({ tr, dispatch }) => {
                  dispatch?.(tr.insertText("nested"));
                  return true;
                }
              };
            }
          }),
          Node.create({
            name: "nestedBlock",
            group: "block",
            content: "inline*"
          })
        ];
      }
    });
    const editor = createEditor({ extensions: [kit] });

    expect(editor.extensions
      .map((extension) => extension.name)
      .filter((name) => ["nested-kit", "nested-command", "nestedBlock"].includes(name))
    ).toEqual([
      "nested-kit",
      "nested-command",
      "nestedBlock"
    ]);
    expect(editor.state.schema.nodes.nestedBlock).toBeDefined();
    expect(editor.commands.insertNested()).toBe(true);
    expect(editor.state.doc.textContent).toBe("nested");
  });

  it("flattens child extensions returned from node and mark addExtensions", () => {
    const node = Node.create({
      name: "parentNode",
      addExtensions() {
        return [Extension.create({ name: "node-child" })];
      }
    });
    const mark = Mark.create({
      name: "parentMark",
      addExtensions() {
        return [Extension.create({ name: "mark-child" })];
      }
    });
    const editor = createEditor({ extensions: [node, mark] });

    expect(editor.extensions
      .map((extension) => extension.name)
      .filter((name) => [
        "parentNode",
        "node-child",
        "parentMark",
        "mark-child"
      ].includes(name))
    ).toEqual([
      "parentNode",
      "node-child",
      "parentMark",
      "mark-child"
    ]);
  });

  it("resolves extensions by flattening, sorting, and warning about duplicates", () => {
    const warn = viSpyOnConsoleWarn();
    const low = Extension.create({ name: "ordered", priority: 10 });
    const duplicate = Extension.create({ name: "ordered", priority: 20 });
    const child = Extension.create({ name: "child", priority: 200 });
    const kit = Extension.create({
      name: "kit",
      priority: 100,
      addExtensions() {
        return [child];
      }
    });

    const names = resolveExtensions([low, kit, duplicate]).map((extension) => extension.name);

    expect(names).toEqual(["child", "kit", "ordered", "ordered"]);
    expect(warn).toHaveBeenCalledWith(
      "[quirekit warn]: Duplicate extension names found: ['ordered']. This can lead to issues."
    );
    warn.mockRestore();
  });

  it("resolves parent-aware extension fields", () => {
    const base = Extension.create({
      name: "field-base",
      addOptions() {
        return { label: "base", count: 1 };
      }
    });
    const child = base.extend({
      addOptions() {
        const parent = this.parent as () => { label: string; count: number };

        return {
          ...parent(),
          label: "child"
        };
      }
    });
    const addOptions = getExtensionField<() => { label: string; count: number }>(
      child,
      "addOptions",
      { name: child.name }
    );

    expect(addOptions?.()).toEqual({ label: "child", count: 1 });
  });

  it("resolves Tiptap-compatible extension attribute metadata", () => {
    const editor = createEditor({
      extensions: [
        Mark.create({
          name: "mention",
          addAttributes: () => ({
            id: {
              default: null,
              keepOnSplit: false,
              renderHTML: (attrs) => ({ "data-id": attrs.id })
            }
          }),
          parseHTML: () => [{ tag: "span[data-mention]" }],
          renderHTML: ({ HTMLAttributes }) => ["span", HTMLAttributes, 0]
        }),
        Extension.create({
          name: "global-role",
          addGlobalAttributes: () => [
            {
              types: ["paragraph"],
              attributes: {
                role: { default: "note" }
              }
            }
          ]
        })
      ]
    });
    const extensionAttributes = getAttributesFromExtensions(editor.extensions);
    const mentionMark = editor.state.schema.marks.mention!.create({ id: "42" });
    const parseRule = injectExtensionAttributesToParseRule(
      { tag: "span[data-mention]" },
      extensionAttributes.filter((item) => item.type === "mention")
    );

    expect(extensionAttributes.map((item) => `${item.type}.${item.name}`)).toContain("paragraph.role");
    expect(getRenderedAttributes(mentionMark, extensionAttributes)).toEqual({ "data-id": "42" });
    expect(getSplittedAttributes(extensionAttributes, "mention", { id: "42" })).toEqual({});
    expect(parseRule.getAttrs?.({
      getAttribute: (name: string) => (name === "id" ? "7" : null)
    } as never)).toEqual({ id: 7 });
  });

  it("injects global attributes into schema parse and render paths", () => {
    const extensions = resolveExtensions([
      Node.create({
        name: "doc",
        topNode: true,
        content: "block+"
      }),
      Node.create({
        name: "paragraph",
        group: "block",
        content: "inline*",
        parseHTML: () => [{ tag: "p" }],
        renderHTML: ({ HTMLAttributes }) => ["p", HTMLAttributes, 0]
      }),
      Node.create({
        name: "text",
        group: "inline"
      }),
      Mark.create({
        name: "label",
        parseHTML: () => [{ tag: "strong" }],
        renderHTML: ({ HTMLAttributes }) => ["strong", HTMLAttributes, 0]
      }),
      Extension.create({
        name: "schema-attrs",
        addGlobalAttributes: () => [
          {
            types: ["paragraph"],
            attributes: {
              tracking: {
                default: null,
                parseHTML: (element) => element.getAttribute("data-tracking"),
                renderHTML: (attrs) =>
                  attrs.tracking ? { "data-tracking": attrs.tracking } : {}
              }
            }
          },
          {
            types: ["label"],
            attributes: {
              tone: {
                default: null,
                parseHTML: (element) => element.getAttribute("data-tone"),
                renderHTML: (attrs) =>
                  attrs.tone ? { "data-tone": attrs.tone } : {}
              },
              internal: {
                default: "private",
                rendered: false
              }
            }
          }
        ]
      })
    ]);
    const schema = getSchemaByResolvedExtensions(extensions);
    const paragraphRule = schema.nodes.paragraph!.spec.parseDOM?.[0];
    const labelRule = schema.marks.label!.spec.parseDOM?.[0];
    const paragraph = schema.nodes.paragraph!.create({ tracking: "intro" });
    const mark = schema.marks.label!.create({ tone: "hot" });

    expect(paragraphRule).toMatchObject({ tag: "p" });
    expect(labelRule).toMatchObject({ tag: "strong" });
    expect(paragraphRule?.getAttrs?.({
      getAttribute: (name: string) => (name === "data-tracking" ? "intro" : null)
    } as never)).toEqual({ tracking: "intro" });
    expect(labelRule?.getAttrs?.({
      getAttribute: (name: string) => (name === "data-tone" ? "hot" : null)
    } as never)).toEqual({ tone: "hot" });
    expect(schema.nodes.paragraph?.spec.attrs).toHaveProperty("tracking");
    expect(schema.marks.label?.spec.attrs).toHaveProperty("tone");
    expect(schema.nodes.paragraph!.spec.toDOM?.(paragraph)).toEqual([
      "p",
      { "data-tracking": "intro" },
      0
    ]);
    expect(schema.marks.label!.spec.toDOM?.(mark, true)).toEqual([
      "strong",
      { "data-tone": "hot" },
      0
    ]);
  });

  it("transforms existing node HTML serialization without replacing its owner", () => {
    const extensions = resolveExtensions([
      Node.create({
        name: "doc",
        topNode: true,
        content: "block+"
      }),
      Node.create({
        name: "paragraph",
        group: "block",
        content: "inline*",
        renderHTML: ({ HTMLAttributes }) => ["p", HTMLAttributes, 0]
      }),
      Node.create({
        name: "text",
        group: "inline"
      }),
      Extension.create({
        name: "semantic-paragraph",
        addGlobalAttributes: () => [{
          types: ["paragraph"],
          attributes: {
            semanticHeading: { default: false, rendered: false }
          }
        }],
        addNodeHTMLSerializationTransforms: () => ({
          paragraph: (node, output) => node.attrs.semanticHeading
            ? ["h2", ...(
                Array.isArray(output) ? output.slice(1) : []
              )]
            : output
        })
      })
    ]);
    const schema = getSchemaByResolvedExtensions(extensions);
    const paragraph = schema.nodes.paragraph!.create({
      semanticHeading: true
    });

    expect(schema.nodes.paragraph!.spec.toDOM?.(paragraph)).toEqual([
      "h2",
      {},
      0
    ]);
  });

  it("reports node emptiness, cursor edge positions, and list extension groups", () => {
    const editor = createEditor({
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "abc" }]
          }
        ]
      },
      extensions: [
        Node.create({
          name: "bulletList",
          group: "block list",
          content: "paragraph*",
          parseHTML: () => [{ tag: "ul" }],
          renderHTML: () => ["ul", 0]
        })
      ]
    });
    const emptyParagraph = editor.state.schema.nodes.paragraph!.create();

    expect(isNodeEmpty(emptyParagraph)).toBe(true);
    expect(isNodeEmpty(editor.state.doc.firstChild!)).toBe(false);

    expect(editor.commands.setTextSelection(1)).toBe(true);
    expect(isAtStartOfNode(editor.state.pm)).toBe(true);
    expect(isAtEndOfNode(editor.state.pm)).toBe(false);

    expect(editor.commands.setTextSelection(4)).toBe(true);
    expect(isAtEndOfNode(editor.state.pm, "paragraph")).toBe(true);
    expect(isList("bulletList", editor.extensions)).toBe(true);
  });

  it("clamps invalid text selections to valid document text positions", () => {
    const editor = createEditor({
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "abc" }]
          }
        ]
      }
    });

    expect(editor.commands.setTextSelection(-100)).toBe(true);
    expect(editor.state.pm.selection.from).toBe(1);

    expect(editor.commands.setTextSelection(100)).toBe(true);
    expect(editor.state.pm.selection.from).toBe(4);
  });

  it("reads node text serializers from schema renderText hooks", () => {
    const editor = createEditor({
      content: {
        type: "doc",
        content: [
          {
            type: "tokenBlock"
          }
        ]
      },
      extensions: [
        Node.create({
          name: "tokenBlock",
          group: "block",
          atom: true,
          selectable: false,
          parseHTML: () => [{ tag: "token-block" }],
          renderHTML: () => ["token-block"],
          renderText: () => "[token]"
        })
      ]
    });
    const serializers = getTextSerializersFromSchema(editor.schema);

    expect(editor.getText({ textSerializers: serializers })).toBe("[token]");
    expect(editor.getText()).toBe("[token]");
  });

  it("finds children, parents, marks, and nodes by position", () => {
    const editor = createEditor({
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "hello",
                marks: [{ type: "strong" }]
              }
            ]
          }
        ]
      },
      extensions: [
        Mark.create({ name: "strong" })
      ]
    });

    expect(findChildren(editor.state.doc, (node) => node.type.name === "paragraph")).toHaveLength(1);
    expect(findChildrenInRange(
      editor.state.doc,
      { from: 0, to: editor.state.doc.content.size },
      (node) => node.isText
    )).toHaveLength(1);

    expect(editor.commands.setTextSelection(2)).toBe(true);
    expect(findParentNode((node) => node.type.name === "paragraph")(editor.state.pm.selection)?.pos).toBe(0);
    expect(findParentNodeClosestToPos(
      editor.state.pm.selection.$from,
      (node) => node.type.name === "paragraph"
    )?.start).toBe(1);
    expect(getMarksBetween(1, 6, editor.state.doc)).toHaveLength(1);
    expect(getNodeAtPosition(editor.state.pm, "paragraph", 2)[0]?.type.name).toBe("paragraph");
  });

  it("supports transaction and content-match helper utilities", () => {
    const editor = createEditor({
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "hello" }]
          }
        ]
      }
    });
    const transaction = editor.state.pm.tr.insertText("X", 1);
    const transform = combineTransactionSteps(editor.state.doc, [transaction]);
    const chainableState = createChainableState({
      state: editor.state.pm,
      transaction
    });
    const insertionTransaction = editor.state.pm.tr.insertText("Z", 1);

    selectionToInsertionEnd(insertionTransaction, 0, -1);

    expect(transform.doc.textContent).toBe("Xhello");
    expect(getChangedRanges(transform).length).toBeGreaterThan(0);
    expect(chainableState.doc.textContent).toBe("Xhello");
    expect(defaultBlockAt(editor.schema.nodes.doc!.contentMatch)?.name).toBe("paragraph");
    expect(insertionTransaction.selection.from).toBe(2);
  });

  it("supports Tiptap-compatible position helper utilities", () => {
    const editor = createEditor({
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "abc" }]
          }
        ]
      }
    });
    const mappable = editor.utils.createMappablePosition(2);
    const transaction = editor.state.pm.tr.insertText("X", 1);
    const tracker = new Tracker(editor.state.pm.tr);

    tracker.transaction.insertText("Z", 1);

    expect(editor.utils.getUpdatedPosition(mappable, transaction).position.position).toBe(3);
    expect(tracker.map(2)).toEqual({ position: 3, deleted: false });
    expect(getDebugJSON(editor.state.doc).content?.[0]?.from).toBe(0);
    expect(resolveFocusPosition(editor.state.doc, "start")?.from).toBe(1);
    expect(resolveFocusPosition(editor.state.doc, "end")?.to).toBe(4);
    expect(resolveFocusPosition(editor.state.doc, "all")?.from).toBe(1);

    const rect = posToDOMRect({
      state: { doc: editor.state.doc },
      coordsAtPos: (pos: number) => ({
        left: pos,
        right: pos + 1,
        top: pos * 2,
        bottom: pos * 2 + 1
      })
    }, 1, 3);

    expect(rect.toJSON()).toEqual({
      top: 2,
      bottom: 7,
      left: 1,
      right: 4,
      width: 3,
      height: 5,
      x: 1,
      y: 2
    });
  });

  it("exposes Tiptap-compatible NodePos document navigation", () => {
    const editor = createEditor({
      content: {
        type: "doc",
        content: [
          {
            type: "panel",
            attrs: { tone: "info" },
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "inside" }]
              }
            ]
          }
        ]
      },
      extensions: [
        Node.create({
          name: "panel",
          group: "block",
          content: "paragraph+",
          addAttributes: () => ({
            tone: { default: null }
          }),
          parseHTML: () => [{ tag: "section" }],
          renderHTML: ({ HTMLAttributes }) => ["section", HTMLAttributes, 0]
        })
      ]
    });
    const panel = editor.$node("panel", { tone: "info" })!;
    const paragraph = panel.querySelector("paragraph")!;

    expect(editor.$doc.firstChild?.node.type.name).toBe("panel");
    expect(panel.from).toBe(0);
    expect(panel.textContent).toBe("inside");
    expect(editor.$nodes("paragraph")).toHaveLength(1);
    expect(paragraph.closest("panel", { tone: "info" })?.node.type.name).toBe("panel");

    panel.setAttribute({ tone: "success" });

    expect(editor.$node("panel", { tone: "success" })?.attributes.tone).toBe("success");
  });

  it("rewrites unknown JSON content against the active schema", () => {
    const editor = createEditor({
      extensions: [Mark.create({ name: "knownMark" })]
    });
    const result = rewriteUnknownContent({
      type: "unknownBlock",
      content: [
        {
          type: "text",
          marks: [
            { type: "knownMark" },
            { type: "missingMark" }
          ],
          text: "clean"
        }
      ]
    }, editor.schema);

    expect(result.json?.type).toBe("paragraph");
    expect(result.json?.content?.[0]?.marks).toEqual([{ type: "knownMark" }]);
    expect(result.rewrittenContent.map((item) => item.unsupported)).toEqual([
      "missingMark",
      "unknownBlock"
    ]);
  });

  it("creates Tiptap-compatible JSX DOM output specs", () => {
    expect(h("slot")).toBe(0);
    expect(h("strong", { class: "mark" }, 0)).toEqual(["strong", { class: "mark" }, 0]);
    expect(h((props) => ["span", props ?? {}, 0], { "data-kind": "inline" })).toEqual([
      "span",
      { "data-kind": "inline" },
      0
    ]);
    expect(Fragment({ children: [["em", 0]] })).toEqual([["em", 0]]);
    expect(() => h("svg")).toThrow("SVG elements are not supported");
  });

  it("installs Tiptap-compatible core commands by default", () => {
    const editor = createEditor({
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "hello" }]
          }
        ]
      }
    });

    expect(editor.commands.setTextSelection(2)).toBe(true);
    expect(editor.commands.insertContent("X")).toBe(true);
    expect(editor.state.doc.textContent).toBe("hXello");
    expect(editor.commands.selectAll()).toBe(true);
    expect(editor.state.pm.selection.from).toBe(0);
    expect(editor.commands.deleteSelection()).toBe(true);
    expect(editor.state.doc.textContent).toBe("");
    expect(editor.commands.command(({ commands }: CommandProps) => {
      return commands.setContent({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "reset" }] }]
      });
    })).toBe(true);
    expect(editor.state.doc.textContent).toBe("reset");
  });

  it("installs additional ProseMirror-backed core commands by default", () => {
    const editor = createEditor({
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "alpha" }]
          }
        ]
      }
    });

    expect(editor.commands.setTextSelection(6)).toBe(true);
    expect(editor.commands.splitBlock()).toBe(true);
    expect(editor.state.doc.childCount).toBe(2);
    expect(editor.commands.insertContent("beta")).toBe(true);
    expect(editor.state.doc.textContent).toBe("alphabeta");
    expect(editor.commands.selectTextblockStart()).toBe(true);
    expect((editor.state.pm.selection as TextSelection).$from.parentOffset).toBe(0);
    expect(editor.commands.selectTextblockEnd()).toBe(true);
    expect((editor.state.pm.selection as TextSelection).$from.parentOffset).toBe(4);
    expect(editor.commands.clearContent(false)).toBe(true);
    expect(editor.state.doc.textContent).toBe("");
  });

  it("focuses Tiptap-compatible positions through the focus command", () => {
    const editor = createEditor({
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "focus" }]
          }
        ]
      }
    });

    expect(editor.commands.focus("end", { scrollIntoView: false })).toBe(true);
    expect(editor.state.pm.selection.from).toBe(6);
    expect(editor.commands.focus("start", { scrollIntoView: false })).toBe(true);
    expect(editor.state.pm.selection.from).toBe(1);
    expect(editor.commands.focus(false)).toBe(true);
  });

  it("installs Tiptap-compatible list commands by default", () => {
    const listExtensions = [
      Node.create({
        name: "bulletList",
        group: "block list",
        content: "listItem+",
        parseHTML: () => [{ tag: "ul" }],
        renderHTML: () => ["ul", 0]
      }),
      Node.create({
        name: "orderedList",
        group: "block list",
        content: "listItem+",
        parseHTML: () => [{ tag: "ol" }],
        renderHTML: () => ["ol", 0]
      }),
      Node.create({
        name: "listItem",
        content: "paragraph block*",
        defining: true,
        parseHTML: () => [{ tag: "li" }],
        renderHTML: () => ["li", 0]
      })
    ];
    const editor = createEditor({
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "one" }]
          }
        ]
      },
      extensions: listExtensions
    });

    expect(editor.commands.setTextSelection(2)).toBe(true);
    expect(editor.commands.wrapInList("bulletList")).toBe(true);
    expect(editor.state.doc.firstChild?.type.name).toBe("bulletList");

    const firstParagraph = findChildren(
      editor.state.doc,
      (node) => node.type.name === "paragraph"
    )[0]!;

    expect(editor.commands.setTextSelection(firstParagraph.pos + firstParagraph.node.nodeSize - 1)).toBe(true);
    expect(editor.commands.splitListItem("listItem")).toBe(true);
    expect(findChildren(editor.state.doc, (node) => node.type.name === "listItem")).toHaveLength(2);

    const secondParagraph = findChildren(
      editor.state.doc,
      (node) => node.type.name === "paragraph"
    )[1]!;

    expect(editor.commands.setTextSelection(secondParagraph.pos + 1)).toBe(true);
    expect(editor.commands.sinkListItem("listItem")).toBe(true);
    expect(findChildren(editor.state.doc, (node) => node.type.name === "bulletList")).toHaveLength(2);
    expect(editor.commands.liftListItem("listItem")).toBe(true);
    expect(findChildren(editor.state.doc, (node) => node.type.name === "listItem")).toHaveLength(2);

    const toggleEditor = createEditor({
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "toggle" }]
          }
        ]
      },
      extensions: listExtensions
    });

    expect(toggleEditor.commands.setTextSelection(2)).toBe(true);
    expect(toggleEditor.commands.toggleList("bulletList", "listItem")).toBe(true);
    expect(toggleEditor.state.doc.firstChild?.type.name).toBe("bulletList");
    expect(toggleEditor.commands.toggleList("bulletList", "listItem")).toBe(true);
    expect(toggleEditor.state.doc.firstChild?.type.name).toBe("paragraph");

    const nestedEditor = createEditor({
      content: {
        type: "doc",
        content: [{
          type: "section",
          content: [{
            type: "paragraph",
            content: [{ type: "text", text: "nested" }]
          }]
        }]
      },
      extensions: [
        ...listExtensions,
        Node.create({
          name: "section",
          group: "block",
          content: "block+",
          parseHTML: () => [{ tag: "section" }],
          renderHTML: () => ["section", 0]
        })
      ]
    });

    expect(nestedEditor.commands.setTextSelection(2)).toBe(true);
    expect(() => nestedEditor.can().toggleList("bulletList", "listItem")).not.toThrow();
    expect(nestedEditor.can().toggleList("bulletList", "listItem")).toBe(true);
  });

  it("installs Tiptap-compatible mark and attribute commands by default", () => {
    const editor = createEditor({
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "hello" }]
          }
        ]
      },
      extensions: [
        Mark.create({
          name: "highlight",
          addAttributes: () => ({
            tone: { default: "neutral" }
          }),
          parseHTML: () => [{ tag: "mark" }],
          renderHTML: ({ HTMLAttributes }) => ["mark", HTMLAttributes, 0]
        })
      ]
    });
    const metaKey = new PluginKey<string>("mark-command-meta");

    expect(editor.commands.setTextSelection({ from: 1, to: 6 })).toBe(true);
    expect(editor.commands.setMark("highlight", { tone: "warm" })).toBe(true);
    expect(getAttributes(editor.state.pm, "highlight")).toEqual({ tone: "warm" });

    expect(editor.commands.updateAttributes("highlight", { tone: "hot" })).toBe(true);
    expect(getAttributes(editor.state.pm, "highlight")).toEqual({ tone: "hot" });

    expect(editor.commands.resetAttributes("highlight", "tone")).toBe(true);
    expect(getAttributes(editor.state.pm, "highlight")).toEqual({ tone: "neutral" });

    expect(editor.commands.extendMarkRange("highlight")).toBe(true);
    expect(editor.state.pm.selection.from).toBe(1);
    expect(editor.state.pm.selection.to).toBe(6);

    expect(editor.commands.toggleMark("highlight")).toBe(true);
    expect(getAttributes(editor.state.pm, "highlight")).toEqual({});

    expect(editor.commands.setMeta(metaKey, "value")).toBe(true);
    expect(editor.commands.setMark("highlight", { tone: "warm" })).toBe(true);
    expect(editor.commands.unsetAllMarks()).toBe(true);
    expect(getAttributes(editor.state.pm, "highlight")).toEqual({});
  });

  it("toggles textblock nodes with Tiptap-compatible commands", () => {
    const editor = createEditor({
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "heading" }]
          }
        ]
      },
      extensions: [
        Node.create({
          name: "heading",
          group: "block",
          content: "text*",
          addAttributes: () => ({
            level: { default: 1 }
          }),
          parseHTML: () => [{ tag: "h1" }],
          renderHTML: ({ node }) => [`h${node.attrs.level}`, 0]
        })
      ]
    });

    expect(editor.commands.setTextSelection(2)).toBe(true);
    expect(editor.commands.toggleNode("heading", "paragraph", { level: 2 })).toBe(true);
    expect(editor.state.doc.firstChild?.type.name).toBe("heading");
    expect(editor.state.doc.firstChild?.attrs).toEqual({ level: 2 });

    expect(editor.commands.toggleNode("heading", "paragraph")).toBe(true);
    expect(editor.state.doc.firstChild?.type.name).toBe("paragraph");
  });

  it("cuts a content range and inserts it at a mapped target position", () => {
    const editor = createEditor({
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "abcdef" }]
          }
        ]
      }
    });

    expect(editor.commands.cut({ from: 1, to: 4 }, 7)).toBe(true);
    expect(editor.state.doc.textContent).toBe("defabc");
  });

  it("emits Tiptap-compatible editor lifecycle events", () => {
    const calls: string[] = [];
    const editor = createEditor({
      onBeforeCreate: () => calls.push("beforeCreate"),
      onCreate: () => calls.push("create"),
      onUpdate: () => calls.push("update-option")
    });

    editor.once("selectionUpdate", () => calls.push("selection-once"));
    editor.on("transaction", () => calls.push("transaction"));
    editor.on("update", () => calls.push("update"));
    editor.dispatchTransaction(editor.state.pm.tr.insertText("event"));
    editor.dispatchTransaction(editor.state.pm.tr.setSelection(Selection.atStart(editor.state.doc)));
    editor.destroy();

    expect(calls).toEqual([
      "beforeCreate",
      "create",
      "transaction",
      "selection-once",
      "update-option",
      "update",
      "transaction"
    ]);
  });

  it("emits canonical transaction payloads and a zero-argument destroy event", () => {
    const appendKey = new PluginKey("canonical-event-append");
    const extension = Extension.create({
      name: "canonical-event-payloads",
      addProseMirrorPlugins() {
        return [new Plugin({
          key: appendKey,
          appendTransaction(transactions, _oldState, newState) {
            if (transactions.some((transaction) => transaction.getMeta(appendKey))) {
              return null;
            }

            return newState.tr.setMeta(appendKey, true);
          }
        })];
      }
    });
    const editor = createEditor({
      content: {
        type: "doc",
        content: [{ type: "paragraph" }]
      },
      extensions: [extension]
    });
    const beforeTransactions: Array<QuireEditorEvents["beforeTransaction"]> = [];
    const transactions: Array<QuireEditorEvents["transaction"]> = [];
    const updates: Array<QuireEditorEvents["update"]> = [];
    let destroyArgumentCount = -1;

    editor.on("beforeTransaction", (payload) => beforeTransactions.push(payload));
    editor.on("transaction", (payload) => transactions.push(payload));
    editor.on("update", (payload) => updates.push(payload));
    editor.on("destroy", (...args) => {
      destroyArgumentCount = args.length;
    });

    const rootTransaction = editor.state.pm.tr.insertText("event", 1);
    editor.dispatchTransaction(rootTransaction);

    expect(beforeTransactions).toHaveLength(1);
    expect(beforeTransactions[0]?.transaction).toBe(rootTransaction);
    expect(beforeTransactions[0]?.nextState.doc.textContent).toBe("event");
    expect(transactions).toHaveLength(1);
    expect(transactions[0]?.transaction).toBe(rootTransaction);
    expect(transactions[0]?.appendedTransactions).toHaveLength(1);
    expect(updates).toHaveLength(1);
    expect(updates[0]?.transaction).toBe(rootTransaction);
    expect(updates[0]?.appendedTransactions).toHaveLength(1);

    editor.destroy();
    expect(destroyArgumentCount).toBe(0);
  });

  it("emits contentError with a usable fallback document", () => {
    const calls: string[] = [];
    const editor = createEditor({
      content: { type: "missing-node" },
      enableContentCheck: true,
      onContentError({ editor: activeEditor, error, disableCollaboration }) {
        disableCollaboration();
        calls.push(`${activeEditor.state.doc.type.name}:${error.message}`);
      }
    });

    expect(editor.isEmpty).toBe(true);
    expect(calls).toEqual([
      "doc:[quirekit error]: Invalid JSON content."
    ]);
  });

  it("respects built-in extension and dispatch hook options", () => {
    const calls: string[] = [];
    const editor = createEditor({
      content: {
        type: "doc",
        content: [{ type: "paragraph" }]
      },
      enableCoreExtensions: { paste: false },
      enableExtensionDispatchTransaction: false,
      coreExtensionOptions: {
        tabindex: { value: "-1" }
      },
      extensions: [Extension.create({
        name: "disabled-dispatch-hook",
        dispatchTransaction({ transaction, next }) {
          calls.push("dispatch");
          next(transaction);
        }
      })]
    });

    editor.dispatchTransaction(editor.state.pm.tr.insertText("x", 1));

    expect(calls).toEqual([]);
    expect(editor.extensionManager.extensions.map((extension) => extension.name))
      .not.toContain("paste");
    const attributes = editor.someProp("attributes") as
      | (() => Record<string, string>)
      | undefined;
    expect(attributes?.()).toMatchObject({ tabindex: "-1" });
  });

  it("supports Tiptap-compatible addProseMirrorPlugins and global attributes", () => {
    const key = new PluginKey("tiptap-plugin-alias");
    const extension = Extension.create({
      name: "tiptap-compat-hooks",
      addProseMirrorPlugins() {
        return [new Plugin({ key })];
      },
      addGlobalAttributes() {
        return [
          {
            types: ["paragraph", "bold"],
            attributes: {
              tracked: { default: false }
            }
          }
        ];
      }
    });
    const editor = createEditor({
      extensions: [
        extension,
        Mark.create({ name: "bold" })
      ]
    });

    expect(key.get(editor.state.pm)).toBeDefined();
    expect(editor.state.schema.nodes.paragraph?.spec.attrs?.tracked).toEqual({
      default: false
    });
    expect(editor.state.schema.marks.bold?.spec.attrs?.tracked).toEqual({
      default: false
    });
  });

  it("collects Tiptap-compatible input and paste rules from extensions", () => {
    const inputRule = new InputRule({
      find: /--$/,
      handler: () => {}
    });
    const pasteRule = new PasteRule({
      find: /bold/g,
      handler: () => {}
    });
    const editor = createEditor({
      extensions: [
        Extension.create({
          name: "rules",
          addInputRules() {
            return [inputRule];
          },
          addPasteRules() {
            return [pasteRule];
          }
        })
      ]
    });

    expect(editor.extensionManager.inputRules).toEqual([inputRule]);
    expect(editor.extensionManager.pasteRules).toEqual([pasteRule]);
  });

  it("matches Tiptap rule enablement helper semantics", () => {
    const alpha = Extension.create({ name: "alpha" });
    const beta = Extension.create({ name: "beta" });

    expect(isExtensionRulesEnabled(alpha, true)).toBe(true);
    expect(isExtensionRulesEnabled(alpha, false)).toBe(false);
    expect(isExtensionRulesEnabled(alpha, ["alpha"])).toBe(true);
    expect(isExtensionRulesEnabled(beta, ["alpha"])).toBe(false);
    expect(isExtensionRulesEnabled(alpha, [alpha])).toBe(true);
    expect(isExtensionRulesEnabled(beta, [alpha])).toBe(false);
  });

  it("filters extension input and paste rules with editor enablement options", () => {
    const disabledInputRule = new InputRule({
      find: /disabled$/,
      handler: () => {}
    });
    const enabledInputRule = new InputRule({
      find: /enabled$/,
      handler: () => {}
    });
    const disabledPasteRule = new PasteRule({
      find: /disabled/g,
      handler: () => {}
    });
    const enabledPasteRule = new PasteRule({
      find: /enabled/g,
      handler: () => {}
    });
    const disabled = Extension.create({
      name: "disabled-rules",
      addInputRules() {
        return [disabledInputRule];
      },
      addPasteRules() {
        return [disabledPasteRule];
      }
    });
    const enabled = Extension.create({
      name: "enabled-rules",
      addInputRules() {
        return [enabledInputRule];
      },
      addPasteRules() {
        return [enabledPasteRule];
      }
    });
    const editor = createEditor({
      extensions: [disabled, enabled],
      enableInputRules: ["enabled-rules"],
      enablePasteRules: [enabled]
    });

    expect(editor.extensionManager.inputRules).toEqual([enabledInputRule]);
    expect(editor.extensionManager.pasteRules).toEqual([enabledPasteRule]);
  });

  it("does not install runtime rule plugins when rule enablement disables them", () => {
    const inputHandler = vi.fn();
    const pasteHandler = vi.fn();
    const editor = createEditor({
      extensions: [
        Extension.create({
          name: "disabled-rules",
          addInputRules() {
            return [
              new InputRule({
                find: /--$/,
                handler: inputHandler
              })
            ];
          },
          addPasteRules() {
            return [
              textPasteRule({
                find: /--/g,
                replace: "—"
              }),
              new PasteRule({
                find: /paste/g,
                handler: pasteHandler
              })
            ];
          }
        })
      ],
      enableInputRules: false,
      enablePasteRules: false
    });
    const view = createTestEditorView(editor);

    editor.setContent({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "a-" }]
        }
      ]
    });
    editor.dispatchTransaction(
      editor.state.pm.tr.setSelection(TextSelection.create(editor.state.doc, 3))
    );

    expect(editor.extensionManager.inputRules).toEqual([]);
    expect(editor.extensionManager.pasteRules).toEqual([]);
    expect(
      editor.state.pm.plugins.some((plugin) =>
        plugin.props.handleTextInput?.call(plugin, view, 3, 3, "-")
      )
    ).toBe(false);
    expect(editor.state.doc.textContent).toBe("a-");

    editor.dispatchTransaction(
      editor.state.pm.tr.insertText("--", 3, 3).setMeta("uiEvent", "paste")
    );

    expect(editor.state.doc.textContent).toBe("a---");
    expect(inputHandler).not.toHaveBeenCalled();
    expect(pasteHandler).not.toHaveBeenCalled();
  });

  it("exposes PM-compatible DecorationSet through direct editor props", () => {
    const editor = createEditor({
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "decorated" }]
          }
        ]
      },
      editorProps: {
        decorations(state) {
          return DecorationSet.create(state.doc, [
            PMDecoration.inline(1, 5, { class: "search-result" })
          ]);
        }
      }
    });

    const decorationSource = editor.someProp("decorations", (decorations) =>
      decorations(editor.state.pm)
    );
    const directDecorations =
      decorationSource instanceof DecorationSet ? decorationSource.find() : [];
    const viewDecorationSource = editor.view.props.decorations?.(editor.state.pm);
    const viewDecorations =
      viewDecorationSource instanceof DecorationSet
        ? viewDecorationSource.find()
        : [];

    expect(decorationSource).toBeInstanceOf(DecorationSet);
    expect(directDecorations.map((decoration) => ({
      from: decoration.from,
      to: decoration.to,
      spec: decoration.spec
    }))).toEqual([
      {
        from: 1,
        to: 5,
        spec: {}
      }
    ]);
    expect(viewDecorationSource).toBeInstanceOf(DecorationSet);
    expect(viewDecorations).toHaveLength(1);
  });

  it("runs extension input rules and exposes undoInputRule", () => {
    const editor = createEditor({
      extensions: [
        Extension.create({
          name: "smart-input-rules",
          addInputRules() {
            return [textInputRule({ find: /--$/, replace: "—" })];
          }
        })
      ]
    });
    const view = createTestEditorView(editor);

    editor.setContent({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "a-" }]
        }
      ]
    });
    editor.dispatchTransaction(
      editor.state.pm.tr.setSelection(TextSelection.create(editor.state.doc, 3))
    );

    expect(
      editor.state.pm.plugins.some((plugin) =>
        plugin.props.handleTextInput?.call(plugin, view, 3, 3, "-")
      )
    ).toBe(true);
    expect(editor.state.doc.textContent).toBe("a—");
    expect(editor.commands.undoInputRule()).toBe(true);
    expect(editor.state.doc.textContent).toBe("a--");
  });

  it("runs extension paste rules through appended transactions", () => {
    const editor = createEditor({
      extensions: [
        Extension.create({
          name: "smart-paste-rules",
          addPasteRules() {
            return [textPasteRule({ find: /--/g, replace: "—" })];
          }
        })
      ]
    });

    editor.setContent({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "start" }]
        }
      ]
    });
    editor.dispatchTransaction(
      editor.state.pm.tr.insertText("--", 6, 6).setMeta("uiEvent", "paste")
    );

    expect(editor.state.doc.textContent).toBe("start—");
  });

  it("creates Tiptap-compatible input and paste rule builders", () => {
    const editor = createEditor({ extensions: [Mark.create({ name: "bold" })] });
    const boldType = editor.state.schema.marks.bold!;
    const inputRule = textInputRule({ find: /--$/, replace: "-", undoable: false });
    const pasteRule = textPasteRule({ find: /--/g, replace: "-" });
    const boldInputRule = markInputRule({ find: /\*\*([^*]+)\*\*$/, type: boldType });
    const boldPasteRule = markPasteRule({ find: /\*\*([^*]+)\*\*/g, type: boldType });

    expect(inputRule).toBeInstanceOf(InputRule);
    expect(inputRule.undoable).toBe(false);
    expect(pasteRule).toBeInstanceOf(PasteRule);
    expect(boldInputRule).toBeInstanceOf(InputRule);
    expect(boldPasteRule).toBeInstanceOf(PasteRule);
  });

  it("creates Tiptap-compatible node input and paste rule builders", () => {
    const editor = createEditor({
      extensions: [
        Node.create({
          name: "heading",
          group: "block",
          content: "inline*",
          addAttributes() {
            return {
              level: { default: 1 }
            };
          }
        }),
        Node.create({
          name: "blockquote",
          group: "block",
          content: "block+"
        }),
        Node.create({
          name: "emoji",
          group: "inline",
          inline: true,
          atom: true,
          addAttributes() {
            return {
              name: { default: null }
            };
          }
        })
      ]
    });
    const heading = editor.state.schema.nodes.heading!;
    const blockquote = editor.state.schema.nodes.blockquote!;
    const emoji = editor.state.schema.nodes.emoji!;
    const inlineRule = nodeInputRule({
      find: /:([a-z]+):$/,
      type: emoji,
      getAttributes: (match) => ({ name: match[1] })
    });
    const blockRule = textblockTypeInputRule({
      find: /^# $/,
      type: heading,
      getAttributes: () => ({ level: 1 })
    });
    const wrapRule = wrappingInputRule({
      find: /^> $/,
      type: blockquote
    });
    const pasteRule = nodePasteRule({
      find: /:([a-z]+):/g,
      type: emoji,
      getAttributes: (match) => ({ name: match[1] })
    });

    expect(inlineRule).toBeInstanceOf(InputRule);
    expect(blockRule).toBeInstanceOf(InputRule);
    expect(wrapRule).toBeInstanceOf(InputRule);
    expect(pasteRule).toBeInstanceOf(PasteRule);
  });

  it("creates node and mark extensions through Tiptap-compatible classes", () => {
    const node = Node.create({ name: "classNode", group: "block" });
    const mark = Mark.create({ name: "classMark", inclusive: false });

    expect(node).toBeInstanceOf(Node);
    expect(mark).toBeInstanceOf(Mark);
    expect(Node.create({ name: "functionNode" })).toBeInstanceOf(Node);
    expect(Mark.create({ name: "functionMark" })).toBeInstanceOf(Mark);
    expect(node.kind).toBe("node");
    expect(node.type).toBe("node");
    expect(mark.kind).toBe("mark");
    expect(mark.type).toBe("mark");
    expect(node.nodes.classNode).toMatchObject({ group: "block" });
    expect(mark.marks.classMark).toMatchObject({ inclusive: false });
  });

  it("uses Tiptap-compatible topNode config to set the schema top node", () => {
    const root = Node.create({
      name: "root",
      topNode: true,
      content: "block+"
    });
    const editor = createEditor({ extensions: [root] });

    expect(root.topNodeName).toBe("root");
    expect(editor.extensionManager.schemaSpec.topNode).toBe("root");
    expect(editor.state.schema.topNodeType.name).toBe("root");
  });

  it("reports duplicate top node declarations", () => {
    const editor = createEditor({
      extensions: [
        Node.create({ name: "root", topNode: true, content: "block+" }),
        Node.create({ name: "page", topNode: true, content: "block+" })
      ]
    });

    expect(editor.extensionManager.diagnostics).toEqual([
      expect.objectContaining({
        code: "duplicate-top-node",
        extensionName: "page",
        severity: "error"
      })
    ]);
  });

  it("merges HTML classes and styles with Tiptap-compatible mergeAttributes", () => {
    expect(
      mergeAttributes(
        { class: "one two", style: "color: red; font-weight: 400", title: "old" },
        { class: "two three", style: "font-weight: 700; font-family: \"A;B\"", title: "new" }
      )
    ).toEqual({
      class: "one two three",
      style: "color: red; font-weight: 700; font-family: \"A;B\"",
      title: "new"
    });
  });

  it("exports Tiptap-compatible utility helpers", () => {
    expect(escapeForRegEx("a+b?")).toBe("a\\+b\\?");
    expect(findDuplicates(["a", "b", "a", "c", "b"])).toEqual(["a", "b"]);
    expect(fromString("42")).toBe(42);
    expect(fromString("true")).toBe(true);
    expect(isPlainObject({ ok: true })).toBe(true);
    expect(minMax(10, 1, 5)).toBe(5);
    expect(objectIncludes({ tone: "info" }, { tone: /inf/ }, { strict: false })).toBe(true);
    expect(deleteProps({ keep: 1, drop: 2 }, "drop")).toEqual({ keep: 1 });
  });

  it("exports Tiptap-compatible static content helpers", () => {
    const schema = createBasicSchema();
    const doc = createDocument({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "static helpers" }]
        }
      ]
    }, schema);

    expect(doc.textContent).toBe("static helpers");
    expect(generateText(doc.toJSON(), [])).toBe("static helpers");
  });

  it("runs public mark command helpers against schema mark names", () => {
    const editor = createEditor({
      extensions: [
        Mark.create({
          name: "bold",
          parseHTML: () => [{ tag: "strong" }],
          renderHTML: () => ["strong", 0]
        })
      ]
    });
    const paragraphType = editor.state.schema.nodes.paragraph!;
    const docType = editor.state.schema.nodes.doc!;

    editor.setContent(docType.create(null, paragraphType.create(null, editor.state.schema.text("hello"))));
    editor.dispatchTransaction(
      editor.state.pm.tr.setSelection(Selection.near(editor.state.doc.resolve(1), 1))
    );

    expect(editor.commands.setMark("bold")).toBe(true);
    expect(editor.state.pm.storedMarks?.some((mark) => mark.type.name === "bold")).toBe(true);

    expect(editor.commands.toggleMark("bold")).toBe(true);
    expect(editor.state.pm.storedMarks?.some((mark) => mark.type.name === "bold")).not.toBe(true);

    expect(editor.commands.unsetMark("bold")).toBe(true);
  });

  it("lets node and mark extensions inherit parent config fields", () => {
    const callout = Node.create<
      { tag: string; tone: string },
      Record<string, never>
    >({
      name: "callout",
      addOptions() {
        return { tag: "aside", tone: "info" };
      },
      content() {
        return "inline*";
      },
      group() {
        return "block";
      },
      addAttributes() {
        return {
          tone: { default: this.options.tone }
        };
      },
      parseHTML() {
        return [{ tag: this.options.tag }];
      },
      renderHTML({ HTMLAttributes }) {
        return [this.options.tag, HTMLAttributes, 0];
      }
    });
    const panel = callout.extend({
      name: "panel",
      addOptions() {
        const parent = this.parent as () => { tag: string; tone: string };

        return {
          ...parent(),
          tag: "section",
          tone: "warning"
        };
      },
      group() {
        const parent = this.parent as () => string;

        return `${parent()} custom`;
      },
      addAttributes() {
        const parent = this.parent as () => Record<string, unknown>;

        return {
          ...parent(),
          level: { default: 2 }
        };
      }
    });
    const strong = Mark.create({
      name: "strongish",
      inclusive() {
        return true;
      },
      parseHTML() {
        return [{ tag: "strong" }];
      },
      renderHTML({ HTMLAttributes }) {
        return ["strong", HTMLAttributes, 0];
      }
    });
    const quietStrong = strong.extend({
      name: "quietStrong",
      inclusive() {
        const parent = this.parent as () => boolean;

        return !parent();
      }
    });
    const editor = createEditor({ extensions: [panel, quietStrong] });

    expect(editor.state.schema.nodes.panel!.spec).toMatchObject({
      content: "inline*",
      group: "block custom"
    });
    expect(editor.state.schema.nodes.panel!.spec.attrs?.tone?.default).toBe("warning");
    expect(editor.state.schema.nodes.panel!.spec.attrs?.level?.default).toBe(2);
    expect(editor.state.schema.nodes.panel!.spec.parseDOM?.[0]).toMatchObject({ tag: "section" });
    expect(editor.state.schema.marks.quietStrong!.spec.inclusive).toBe(false);
    expect(editor.state.schema.marks.quietStrong!.spec.parseDOM?.[0]).toMatchObject({ tag: "strong" });
  });

  it("creates node extensions from Tiptap-compatible schema config", () => {
    const calls: string[] = [];
    const noteExtension = Node.create({
      name: "note",
      priority: 950,
      content: "inline*",
      group: "block",
      draggable: true,
        addOptions: () => ({
          tag: "aside",
          tone: "info"
        }),
        addStorage() {
          return {
            tag: this.options.tag
          };
        },
        addAttributes() {
          return {
            id: { default: null },
            tone: { default: this.options.tone }
          };
        },
        parseHTML() {
          return [{ tag: this.options.tag }];
        },
        renderHTML({ node, HTMLAttributes }) {
          return [
            this.options.tag,
            { ...HTMLAttributes, "data-tone": node.attrs.tone },
            0
          ];
        },
        addCommands() {
          return {
            readNoteStorage: () => () => {
              calls.push(this.storage.tag);
              return true;
            }
          };
        }
    }).configure({ tag: "section" });
    const editor = createEditor({ extensions: [noteExtension] });
    const noteType = editor.state.schema.nodes.note!;
    const note = noteType.create({ id: "a", tone: "warning" });

    expect(noteExtension.kind).toBe("node");
    expect(noteExtension.name).toBe("note");
    expect(editor.state.storage.note).toEqual({ tag: "section" });
    expect(noteType.spec).toMatchObject({
      content: "inline*",
      group: "block",
      draggable: true
    });
    expect(noteType.spec.attrs?.id?.default).toBeNull();
    expect(noteType.spec.attrs?.tone?.default).toBe("info");
    expect(noteType.spec.parseDOM?.[0]).toMatchObject({ tag: "section" });
    expect(noteType.spec.parseDOM?.[0]?.getAttrs).toBeTypeOf("function");
    expect(noteType.spec.toDOM?.(note)).toEqual([
      "section",
      { id: "a", tone: "warning", "data-tone": "warning" },
      0
    ]);
    expect(editor.commands.readNoteStorage()).toBe(true);
    expect(calls).toEqual(["section"]);
  });

  it("creates mark extensions from Tiptap-compatible schema config", () => {
    const calls: string[] = [];
    const highlightExtension = Mark.create({
      name: "highlight",
      inclusive: false,
      spanning: false,
        addOptions: () => ({
          tag: "mark",
          color: "yellow"
        }),
        addStorage() {
          return {
            color: this.options.color
          };
        },
        addAttributes() {
          return {
            color: { default: this.options.color }
          };
        },
        parseHTML() {
          return [{ tag: this.options.tag }];
        },
        renderHTML({ mark, HTMLAttributes }) {
          return [
            this.options.tag,
            { ...HTMLAttributes, "data-color": mark.attrs.color },
            0
          ];
        },
        addCommands() {
          return {
            readHighlightStorage: () => () => {
              calls.push(this.storage.color);
              return true;
            }
          };
        }
    }).configure({ color: "gold" });
    const editor = createEditor({ extensions: [highlightExtension] });
    const highlightType = editor.state.schema.marks.highlight!;
    const mark = highlightType.create({ color: "orange" });

    expect(highlightExtension.kind).toBe("mark");
    expect(editor.state.storage.highlight).toEqual({ color: "gold" });
    expect(highlightType.spec).toMatchObject({
      inclusive: false,
      spanning: false
    });
    expect(highlightType.spec.attrs?.color?.default).toBe("gold");
    expect(highlightType.spec.parseDOM?.[0]).toMatchObject({ tag: "mark" });
    expect(highlightType.spec.parseDOM?.[0]?.getAttrs).toBeTypeOf("function");
    expect(highlightType.spec.toDOM?.(mark, true)).toEqual([
      "mark",
      { color: "orange", "data-color": "orange" },
      0
    ]);
    expect(editor.commands.readHighlightStorage()).toBe(true);
    expect(calls).toEqual(["gold"]);
  });

  it("uses Tiptap overwrite semantics for duplicate command names", () => {
    const calls: string[] = [];
    const editor = createEditor({
      content: {
        type: "doc",
        content: [{ type: "paragraph" }]
      },
      extensions: [
        Extension.create({
          name: "low",
          priority: 10,
          addCommands() {
            return {
              ping: () => () => {
                calls.push("low");
                return true;
              }
            };
          }
        }),
        Extension.create({
          name: "high",
          priority: 1000,
          addCommands() {
            return {
              ping: () => () => {
                calls.push("high");
                return true;
              }
            };
          }
        })
      ]
    });

    expect(editor.commands.ping()).toBe(true);
    expect(calls).toEqual(["low"]);
  });

  it("exposes Tiptap-compatible commands, chain, and can helpers", () => {
    const editor = createEditor({
      extensions: [
        Extension.create({
          name: "command-manager",
          addCommands() {
            return {
              insertA: () => ({ tr, dispatch }) => {
                dispatch?.(tr.insertText("A"));
                return true;
              },
              insertB: () => ({ tr, dispatch }) => {
                dispatch?.(tr.insertText("B"));
                return true;
              },
              blocked: () => () => false
            };
          }
        })
      ]
    });

    expect(editor.can().insertA()).toBe(true);
    expect(editor.state.doc.textContent).toBe("");
    expect(editor.commands.insertA()).toBe(true);
    expect(editor.state.doc.textContent).toBe("A");
    expect(editor.chain().insertA().insertB().run()).toBe(true);
    expect(editor.state.doc.textContent).toBe("AAB");
    expect(editor.chain().insertA().blocked().run()).toBe(false);
    expect(editor.state.doc.textContent).toBe("AABA");
  });

  it("runs extension keyboard shortcuts by priority", () => {
    const calls: string[] = [];
    const editor = createEditor({
      extensions: [
        Extension.create({
          name: "fallback-shortcut",
          priority: 10,
          addKeyboardShortcuts() {
            return {
              "Mod-k": () => {
                calls.push("fallback");

                return true;
              }
            };
          }
        }),
        Extension.create({
          name: "primary-shortcut",
          priority: 1000,
          addKeyboardShortcuts() {
            return {
              "Mod-k": ({ tr, dispatch }) => {
                calls.push("primary");
                dispatch?.(tr.insertText("!"));

                return true;
              }
            };
          }
        })
      ]
    });

    expect(dispatchKeyboardShortcut(editor, createModKeyboardShortcutEvent("k", 75))).toBe(true);
    expect(calls).toEqual(["primary"]);
    expect(editor.state.doc.textContent).toBe("!");
  });

  it("consumes a shortcut that already dispatched through bound editor commands", () => {
    const editor = createEditor({ extensions: [Extension.create({
      name: "bound-shortcut",
      addKeyboardShortcuts() {
        return { "Mod-k": () => this.editor!.commands.insertContent("once") };
      }
    })] });
    let transactions = 0;
    editor.on("transaction", () => { transactions += 1; });
    expect(dispatchKeyboardShortcut(editor, createModKeyboardShortcutEvent("k", 75))).toBe(true);
    expect(editor.state.doc.textContent).toBe("once");
    expect(transactions).toBe(1);
    editor.destroy();
  });

  it("continues shortcut fallbacks after a declined bound command dispatches no-op state", () => {
    const editor = createEditor({ extensions: [
      Extension.create({ name: "declined", priority: 200,
        addKeyboardShortcuts() { return { "Mod-k": () => this.editor!.commands.command(() => false) }; }
      }),
      Extension.create({ name: "fallback", priority: 100,
        addKeyboardShortcuts() { return { "Mod-k": ({ tr }) => { tr.insertText("fallback"); return true; } }; }
      })
    ] });
    expect(dispatchKeyboardShortcut(editor, createModKeyboardShortcutEvent("k", 75))).toBe(true);
    expect(editor.state.doc.textContent).toBe("fallback");
    editor.destroy();
  });

  it("can override shortcut order without changing extension order", () => {
    const calls: string[] = [];
    const editor = createEditor({
      extensions: [
        Extension.create({
          name: "schema-first",
          priority: 1000,
          addKeyboardShortcuts() {
            return {
              "Mod-k": () => {
                calls.push("schema-first");

                return true;
              }
            };
          }
        }),
        Extension.create({
          name: "shortcut-first",
          priority: 10,
          keyboardShortcutPriority: 2000,
          addKeyboardShortcuts() {
            return {
              "Mod-k": () => {
                calls.push("shortcut-first");

                return true;
              }
            };
          }
        })
      ]
    });

    expect(editor.extensions
      .map((extension) => extension.name)
      .filter((name) => ["schema-first", "shortcut-first"].includes(name))
    ).toEqual(["schema-first", "shortcut-first"]);
    expect(dispatchKeyboardShortcut(editor, createModKeyboardShortcutEvent("k", 75))).toBe(true);
    expect(calls).toEqual(["shortcut-first"]);
  });

  it("captures shortcut transactions when running keyboardShortcut commands", () => {
    const previousKeyboardEvent = globalThis.KeyboardEvent;

    Object.defineProperty(globalThis, "KeyboardEvent", {
      configurable: true,
      value: class {
        key: string;
        altKey: boolean;
        ctrlKey: boolean;
        metaKey: boolean;
        shiftKey: boolean;
        bubbles: boolean;
        cancelable: boolean;

        constructor(_type: string, init: KeyboardEventInit = {}) {
          this.key = init.key ?? "";
          this.altKey = init.altKey ?? false;
          this.ctrlKey = init.ctrlKey ?? false;
          this.metaKey = init.metaKey ?? false;
          this.shiftKey = init.shiftKey ?? false;
          this.bubbles = init.bubbles ?? false;
          this.cancelable = init.cancelable ?? false;
        }

        preventDefault(): void {}

        stopPropagation(): void {}
      }
    });
    const editor = createEditor({
      extensions: [
        Extension.create({
          name: "captured-shortcut",
          addKeyboardShortcuts() {
            return {
              "Mod-k": ({ tr, dispatch }) => {
                dispatch?.(tr.insertText("captured"));

                return true;
              }
            };
          }
        })
      ]
    });

    try {
      expect(editor.commands.keyboardShortcut("Mod-k")).toBe(true);
      expect(editor.state.doc.textContent).toBe("captured");
    } finally {
      if (previousKeyboardEvent) {
        Object.defineProperty(globalThis, "KeyboardEvent", {
          configurable: true,
          value: previousKeyboardEvent
        });
      } else {
        Reflect.deleteProperty(globalThis, "KeyboardEvent");
      }
    }
  });

  it("reports duplicate command names while preserving overwrite execution", () => {
    const calls: string[] = [];
    const editor = createEditor({
      extensions: [
        Extension.create({
          name: "fallback-command",
          priority: 10,
          addCommands() {
            return {
              ping: () => () => {
                calls.push("fallback");
                return true;
              }
            };
          }
        }),
        Extension.create({
          name: "primary-command",
          priority: 1000,
          addCommands() {
            return {
              ping: () => () => {
                calls.push("primary");
                return true;
              }
            };
          }
        })
      ]
    });

    expect(editor.extensionManager.diagnostics).toEqual([
      expect.objectContaining({
        code: "duplicate-command-name",
        commandName: "ping",
        extensionName: "primary-command",
        severity: "warning"
      })
    ]);
    expect(editor.commands.ping()).toBe(true);
    expect(calls).toEqual(["fallback"]);
  });

  it("reports duplicate extension names", () => {
    const editor = createEditor({
      extensions: [
        Extension.create({
          name: "duplicate",
          priority: 1000
        }),
        Extension.create({
          name: "duplicate",
          priority: 10
        })
      ]
    });

    expect(editor.extensionManager.diagnostics).toEqual([
      expect.objectContaining({
        code: "duplicate-extension-name",
        extensionName: "duplicate",
        severity: "error"
      })
    ]);
  });

  it("builds the editor schema from extension node, mark, and attribute contributions", () => {
    const editor = createEditor({
      extensions: [
        Node.create({
          name: "heading",
          content: "text*",
          group: "block",
          addAttributes() {
            return {
              level: { default: 1 }
            };
          }
        }),
        Mark.create({ name: "bold" }),
        Extension.create({
          name: "rich-schema",
          addGlobalAttributes() {
            return [
              {
                types: ["paragraph", "heading"],
                attributes: {
                  id: { default: null }
                }
              },
              {
                types: ["bold"],
                attributes: {
                  weight: { default: "strong" }
                }
              }
            ];
          }
        })
      ]
    });

    expect(editor.state.schema.nodes.heading).toBeDefined();
    expect(editor.state.schema.nodes.paragraph!.spec.attrs?.id?.default).toBeNull();
    expect(editor.state.schema.nodes.heading!.spec.attrs?.level?.default).toBe(1);
    expect(editor.state.schema.nodes.heading!.spec.attrs?.id?.default).toBeNull();
    expect(editor.state.schema.marks.bold!.spec.attrs?.weight?.default).toBe("strong");
  });

  it("applies Tiptap-compatible schema extension hooks", () => {
    const editor = createEditor({
      extensions: [
        Node.create({
          name: "panel",
          content: "inline*",
          group: "block"
        }),
        Mark.create({ name: "tagged" }),
        Extension.create({
          name: "schema-extender",
          extendNodeSchema(extension) {
            return extension.name === "panel"
              ? {
                  isolating: true
                }
              : {};
          },
          extendMarkSchema(extension) {
            return extension.name === "tagged"
              ? {
                  excludes: "_"
                }
              : {};
          },
          addGlobalAttributes() {
            return [
              {
                types: ["panel"],
                attributes: {
                  tracked: { default: true }
                }
              },
              {
                types: ["tagged"],
                attributes: {
                  source: { default: "external" }
                }
              }
            ];
          }
        })
      ]
    });

    expect(editor.state.schema.nodes.panel!.spec.isolating).toBe(true);
    expect(editor.state.schema.nodes.panel!.spec.attrs?.tracked?.default).toBe(true);
    expect(editor.state.schema.marks.tagged!.spec.excludes).toBe("_");
    expect(editor.state.schema.marks.tagged!.spec.attrs?.source?.default).toBe("external");
  });

  it("installs extension ProseMirror plugins in extension priority order", () => {
    const highPlugin = new Plugin({ key: new PluginKey("high-plugin") });
    const lowPlugin = new Plugin({ key: new PluginKey("low-plugin") });
    const editor = createEditor({
      extensions: [
        Extension.create({
          name: "low-plugin-extension",
          priority: 10,
          addProseMirrorPlugins() {
            return [lowPlugin];
          }
        }),
        Extension.create({
          name: "high-plugin-extension",
          priority: 1000,
          addProseMirrorPlugins() {
            return [highPlugin];
          }
        })
      ]
    });

    expect(editor.extensionManager.plugins).toEqual([]);
    expect(editor.state.pm.plugins.indexOf(highPlugin)).toBeGreaterThanOrEqual(0);
    expect(editor.state.pm.plugins.indexOf(lowPlugin)).toBeGreaterThanOrEqual(0);
    expect(editor.state.pm.plugins.indexOf(highPlugin)).toBeLessThan(
      editor.state.pm.plugins.indexOf(lowPlugin)
    );
  });

  it("resolves ProseMirror view props in plugin order", () => {
    const calls: string[] = [];
    const fallbackPlugin = new Plugin({
      key: new PluginKey("fallback-view-props"),
      props: {
        handleKeyDown(_view, event) {
          calls.push(`fallback:${event.key}`);

          return false;
        }
      }
    });
    const primaryPlugin = new Plugin({
      key: new PluginKey("primary-view-props"),
      props: {
        handleKeyDown(view, event) {
          calls.push(`primary:${view.state.doc.textContent}:${event.key}`);

          return true;
        }
      }
    });
    const editor = createEditor({
      extensions: [
        Extension.create({
          name: "view-props",
          addProseMirrorPlugins() {
            return [fallbackPlugin, primaryPlugin];
          }
        })
      ]
    });
    const view: EditorView = {
      state: editor.state.pm,
      dispatch: (transaction) => editor.dispatchTransaction(transaction),
      endOfTextblock: () => false
    };

    expect(
      editor.someProp("handleKeyDown", (handler) =>
        handler(view, { key: "Enter" } as KeyboardEvent)
      )
    ).toBe(true);
    expect(calls).toEqual(["fallback:Enter", "primary::Enter"]);
  });

  it("resolves direct editor props before plugin props and allows runtime updates", () => {
    const calls: string[] = [];
    const fallbackPlugin = new Plugin({
      key: new PluginKey("fallback-direct-view-props"),
      props: {
        handleKeyDown() {
          calls.push("plugin");

          return true;
        }
      }
    });
    const editor = createEditor({
      editorProps: {
        handleKeyDown() {
          calls.push("direct");

          return false;
        }
      },
      extensions: [
        Extension.create({
          name: "direct-view-props",
          addProseMirrorPlugins() {
            return [fallbackPlugin];
          }
        })
      ]
    });
    const view: EditorView = {
      state: editor.state.pm,
      dispatch: (transaction) => editor.dispatchTransaction(transaction),
      endOfTextblock: () => false
    };

    expect(
      editor.someProp("handleKeyDown", (handler) =>
        handler(view, { key: "Enter" } as KeyboardEvent)
      )
    ).toBe(true);
    editor.setEditorProps({
      handleKeyDown() {
        calls.push("updated-direct");

        return true;
      }
    });
    expect(
      editor.someProp("handleKeyDown", (handler) =>
        handler(view, { key: "Tab" } as KeyboardEvent)
      )
    ).toBe(true);

    expect(calls).toEqual(["direct", "plugin", "updated-direct"]);
  });

  it("exposes headless view setProps and updateState facade methods", () => {
    const calls: string[] = [];
    const editor = createEditor();

    editor.view.setProps({
      handleKeyDown() {
        calls.push("headless-view-prop");

        return true;
      },
      handleScrollToSelection(view: typeof editor.view) {
        calls.push(`headless-scroll:${view.id}`);

        return true;
      }
    });

    expect(
      editor.view.someProp("handleKeyDown", (handler) =>
        handler(editor.view, { key: "Enter" } as KeyboardEvent)
      )
    ).toBe(true);
    expect(() => editor.view.updateState(editor.state.pm)).not.toThrow();
    expect(() => editor.view.updateState({} as PMEditorState)).toThrow(
      /cannot replace QuireKit shared editor state/
    );
    expect(editor.view.getObjectAnchor?.("picture-1")).toEqual({
      status: "unsupported",
      kind: "object",
      reason: "snapshot-version-unavailable"
    });
    expect(editor.view.scrollToSelection()).toBe(true);
    expect(calls).toEqual(["headless-view-prop", "headless-scroll:headless"]);
  });

  it("registers and unregisters ProseMirror plugins at runtime", () => {
    const updateReasons: string[] = [];
    const ownerDocument = createTestOwnerDocument();
    const dynamicPlugin = new Plugin({
      key: new PluginKey("dynamic-runtime-plugin"),
      props: {
        handleKeyDown() {
          return true;
        }
      }
    });
    const adapter: QuireViewAdapter = {
      mode: "canvas",
      mount: (options) => {
        function someProp<PropName extends keyof PMEditorProps, Result>(
          propName: PropName,
          handler: (value: NonNullable<PMEditorProps[PropName]>) => Result
        ): Result | undefined;
        function someProp<PropName extends keyof PMEditorProps>(
          propName: PropName
        ): NonNullable<PMEditorProps[PropName]> | undefined;
        function someProp<PropName extends keyof PMEditorProps, Result>(
          propName: PropName,
          handler?: (value: NonNullable<PMEditorProps[PropName]>) => Result
        ): Result | NonNullable<PMEditorProps[PropName]> | undefined {
          return handler
            ? options.editor.someProp(propName, handler)
            : options.editor.someProp(propName);
        }

        return {
          id: options.id,
          mode: options.mode,
          status: options.status,
          ...emptyMountedWidgetQueries,
          get state() {
            return options.editor.state.pm;
          },
          get props() {
            return {
              ...options.editor.editorProps,
              state: options.editor.state.pm
            };
          },
          dom: options.element,
          editable: options.status !== "lock" && options.editor.isEditable,
          hiddenTextViewMode: "normal" as const,
          get root() {
            return options.element.ownerDocument;
          },
          elements: {
            root: options.element
          },
          focus: () => {},
          dispatch: (transaction) => options.editor.dispatchTransaction(transaction),
          hasFocus: () => false,
          someProp,
          setProps: (props) => {
            options.editor.setEditorProps(props);
          },
          updateRoot: () => {},
          updateState: (state) => {
            if (state !== options.editor.state.pm) {
              throw new RangeError("test view cannot replace shared state");
            }
          },
          setHiddenTextViewMode: () => {},
          dispatchEvent: () => false,
          pasteHTML: () => false,
          pasteText: () => false,
          scrollToSelection: () => false,
          scrollRangeIntoView: () => false,
          serializeForClipboard: (slice) => {
            const dom = options.element.ownerDocument.createElement("div");

            return { dom, text: slice.content.textBetween(0, slice.content.size), slice };
          },
          posAtCoords: () => null,
          coordsAtPos: () => ({ left: 0, right: 0, top: 0, bottom: 0 }),
          endOfTextblock: () => false,
          get isDestroyed() {
            return false;
          },
          update: (update) => {
            updateReasons.push(update.reason);
          },
          destroy: () => {}
        };
      }
    };
    const editor = createEditor({
      element: ownerDocument.createElement("div"),
      mode: "canvas",
      extensions: [
        Extension.create({
          name: "dynamic-view",
          addViewAdapters: () => [adapter]
        })
      ]
    });

    const stateWithPlugin = editor.registerPlugin(dynamicPlugin);

    expect(stateWithPlugin.plugins).toContain(dynamicPlugin);
    expect(editor.state.pm.plugins).toContain(dynamicPlugin);
    expect(editor.state.pm.plugins.some(
      (plugin) => plugin.props.handleKeyDown === dynamicPlugin.props.handleKeyDown
    )).toBe(true);
    expect(editor.unregisterPlugin("dynamic-runtime-plugin")).toBeDefined();
    expect(editor.state.pm.plugins).not.toContain(dynamicPlugin);
    expect(editor.unregisterPlugin("dynamic-runtime-plugin")).toBeUndefined();
    expect(updateReasons).toEqual(["transaction", "transaction"]);
  });

  it("keeps runtime-registered plugins when setContent rebuilds editor state", () => {
    const dynamicPlugin = new Plugin({
      key: new PluginKey("persistent-runtime-plugin"),
      props: {
        handleKeyDown() {
          return true;
        }
      }
    });
    const editor = createEditor();

    editor.registerPlugin(dynamicPlugin);
    editor.setContent({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "after rebuild" }]
        }
      ]
    });

    expect(editor.state.pm.plugins).toContain(dynamicPlugin);
    expect(editor.state.pm.plugins.some(
      (plugin) => plugin.props.handleKeyDown === dynamicPlugin.props.handleKeyDown
    )).toBe(true);
  });

  it("applies extension ProseMirror plugin state through dispatched transactions", () => {
    const counterKey = new PluginKey<number>("counter");
    const editor = createEditor({
      extensions: [
        Extension.create({
          name: "counter-plugin",
          addCommands() {
            return {
              incrementCounter: () => ({ tr, dispatch }) => {
                dispatch?.(tr.setMeta(counterKey, "increment"));
                return true;
              }
            };
          },
          addProseMirrorPlugins() {
            return [
              new Plugin<number>({
                key: counterKey,
                state: {
                  init: () => 1,
                  apply: (transaction, value) =>
                    transaction.getMeta(counterKey) === "increment" ? value + 1 : value
                }
              })
            ];
          }
        })
      ]
    });

    expect(counterKey.getState(editor.state.pm)).toBe(1);
    expect(editor.commands.incrementCounter()).toBe(true);
    expect(counterKey.getState(editor.state.pm)).toBe(2);
  });

  it("does not run update lifecycle hooks for selection-only transactions", () => {
    const calls: string[] = [];
    const schema = createBasicSchema();
    const content = schema.node("doc", null, [
      schema.node("paragraph", null, [schema.text("hello")])
    ]);
    const editor = createEditor({
      content,
      extensions: [
        Extension.create({
          name: "observer",
          onUpdate: ({ previousState, state }) => {
            calls.push(`${previousState.pm.selection.from}->${state.pm.selection.from}`);
          }
        })
      ]
    });

    editor.dispatchTransaction(
      editor.state.pm.tr.setSelection(Selection.near(editor.state.doc.resolve(3), 1))
    );

    expect(editor.state.pm.selection.from).toBe(3);
    expect(calls).toEqual([]);
  });

  it("composes extension dispatchTransaction hooks by priority", () => {
    const calls: string[] = [];
    const editor = createEditor({
      content: {
        type: "doc",
        content: [{ type: "paragraph" }]
      },
      extensions: [
        Extension.create({
          name: "low-dispatch",
          priority: 10,
          dispatchTransaction({ transaction, next }) {
            calls.push(`low:${transaction.getMeta("source")}:${this.editor.state.doc.textContent}`);
            next(transaction);
          }
        }),
        Extension.create({
          name: "high-dispatch",
          priority: 1000,
          dispatchTransaction({ transaction, next }) {
            calls.push(`high-before:${this.name}`);
            transaction.setMeta("source", "high");
            next(transaction);
            calls.push(`high-after:${this.editor.state.doc.textContent}`);
          }
        })
      ]
    });

    editor.dispatchTransaction(editor.state.pm.tr.insertText("x", 1).setMeta("source", "root"));

    expect(editor.state.doc.textContent).toBe("x");
    expect(calls).toEqual([
      "high-before:high-dispatch",
      "low:high:",
      "high-after:x"
    ]);
  });

  it("allows dispatchTransaction hooks to intercept transactions", () => {
    const editor = createEditor({
      content: {
        type: "doc",
        content: [{ type: "paragraph" }]
      },
      extensions: [
        Extension.create({
          name: "interceptor",
          dispatchTransaction() {}
        })
      ]
    });

    editor.dispatchTransaction(editor.state.pm.tr.insertText("x", 1));

    expect(editor.state.doc.textContent).toBe("");
  });

  it("composes transformPastedHTML hooks with direct editor props", () => {
    const editor = createEditor({
      editorProps: {
        transformPastedHTML: (html: string) => `${html}|base`
      },
      extensions: [
        Extension.create({
          name: "low-html-transform",
          priority: 10,
          transformPastedHTML(html) {
            return `${html}|${this.name}:${this.editor.state.doc.textContent}`;
          }
        }),
        Extension.create({
          name: "high-html-transform",
          priority: 1000,
          transformPastedHTML(html) {
            return `${html}|${this.name}`;
          }
        })
      ]
    });
    const transform = editor.someProp("transformPastedHTML") as
      | ((html: string, view?: unknown) => string)
      | undefined;

    expect(transform?.("<p>test</p>", editor.view)).toBe(
      "<p>test</p>|base|high-html-transform|low-html-transform:"
    );
  });

  it("emits focus and blur events from transactions and runs extension hooks", () => {
    const calls: string[] = [];
    const focusEvent = { type: "focus" } as Event;
    const blurEvent = { type: "blur" } as Event;
    let editor!: QuireEditor;

    editor = createEditor({
      onFocus(event) {
        calls.push(`event:focus:${event.editor === editor}:${event.event === focusEvent}`);
      },
      onBlur(event) {
        calls.push(`event:blur:${event.editor === editor}:${event.event === blurEvent}`);
      },
      extensions: [
        Extension.create({
          name: "focus-observer",
          onFocus(event) {
            calls.push(
              `hook:focus:${this.name}:${this.editor === editor}:${event.event === focusEvent}`
            );
          },
          onBlur(event) {
            calls.push(
              `hook:blur:${this.name}:${this.editor === editor}:${event.event === blurEvent}`
            );
          }
        })
      ]
    });

    editor.dispatchTransaction(
      editor.state.pm.tr
        .setMeta("focus", { event: focusEvent })
        .setMeta("addToHistory", false)
    );
    editor.dispatchTransaction(
      editor.state.pm.tr
        .setMeta("blur", { event: blurEvent })
        .setMeta("addToHistory", false)
    );

    expect(calls).toEqual([
      "event:focus:true:true",
      "hook:focus:focus-observer:true:true",
      "event:blur:true:true",
      "hook:blur:focus-observer:true:true"
    ]);
  });

  it("installs Tiptap-compatible built-in core extension props and events", () => {
    const calls: string[] = [];
    const editor = createEditor({
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "copy me" }]
          }
        ]
      },
      onPaste: (event, slice) => {
        calls.push(`paste:${event.type}:${slice.size}`);
        event.preventDefault();
      },
      onDrop: (event, slice, moved) => {
        calls.push(`drop:${event.type}:${moved}:${slice.size}`);
      }
    });
    const selection = TextSelection.create(editor.state.doc, 1, 5);

    editor.dispatchTransaction(editor.state.pm.tr.setSelection(selection));

    const serializeText = editor.someProp("clipboardTextSerializer");
    expect(typeof serializeText).toBe("function");
    expect((serializeText as () => string)()).toBe("copy");
    const slice = editor.state.doc.slice(1, 5);

    editor.dispatchTransaction(
      editor.state.pm.tr.setSelection(TextSelection.create(editor.state.doc, 1, 2))
    );
    expect((serializeText as (slice?: unknown) => string)(slice)).toBe("copy");
    const editable = editor.someProp("editable") as
      | ((state: typeof editor.state.pm) => boolean)
      | undefined;
    expect(editable?.(editor.state.pm)).toBe(true);

    let pastePrevented = false;
    const pasteEvent = {
      type: "paste",
      get defaultPrevented() {
        return pastePrevented;
      },
      preventDefault() {
        pastePrevented = true;
      }
    } as ClipboardEvent;
    const dropEvent = { type: "drop" } as DragEvent;
    const handlePaste = editor.someProp("handlePaste") as
      | ((view: typeof editor.view, event: ClipboardEvent, pastedSlice: typeof slice) => unknown)
      | undefined;
    const handleDrop = editor.someProp("handleDrop") as
      | ((
        view: typeof editor.view,
        event: DragEvent,
        droppedSlice: typeof slice,
        moved: boolean
      ) => unknown)
      | undefined;

    expect(handlePaste?.(editor.view, pasteEvent, slice)).toBe(true);
    expect(pastePrevented).toBe(true);
    handleDrop?.(editor.view, dropEvent, slice, true);

    expect(calls).toEqual([
      `paste:paste:${slice.size}`,
      `drop:drop:true:${slice.size}`
    ]);
  });

  it("sets and unsets text direction through the Tiptap-compatible extension", () => {
    const editor = createEditor({
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "direction" }]
          }
        ]
      },
      extensions: [
        Node.create({
          name: "doc",
          topNode: true,
          content: "block+"
        }),
        Node.create({
          name: "paragraph",
          content: "inline*",
          group: "block"
        }),
        Node.create({
          name: "text",
          group: "inline"
        }),
        TextDirection.configure({ direction: "ltr" })
      ]
    });
    const range = { from: 0, to: editor.state.doc.content.size };

    expect(editor.state.doc.firstChild?.attrs.dir).toBe("ltr");
    expect(editor.commands.setTextDirection("rtl", range)).toBe(true);
    expect(editor.state.doc.firstChild?.attrs.dir).toBe("rtl");
    expect(editor.commands.unsetTextDirection(range)).toBe(true);
    expect(editor.state.doc.firstChild?.attrs.dir).toBe("ltr");
  });

  it("runs extension lifecycle hooks in extension priority order", () => {
    const calls: string[] = [];
    const schema = createBasicSchema();
    const content = schema.node("doc", null, [
      schema.node("paragraph", null, [schema.text("world")])
    ]);
    const editor = createEditor({
      content,
      extensions: [
        Extension.create({
          name: "low-lifecycle",
          priority: 10,
          addCommands() {
            return {
              prependGreeting: () => ({ tr, dispatch }) => {
                dispatch?.(tr.insertText("hello ", 1));
                return true;
              }
            };
          },
          onCreate: ({ extension, state }) => {
            calls.push(`create:${extension.name}:${state.doc.textContent}`);
          },
          onUpdate: ({ extension, previousState, state }) => {
            calls.push(
              `update:${extension.name}:${previousState.doc.textContent}->${state.doc.textContent}`
            );
          },
          onDestroy: ({ extension, state }) => {
            calls.push(`destroy:${extension.name}:${state.doc.textContent}`);
          }
        }),
        Extension.create({
          name: "high-lifecycle",
          priority: 1000,
          onCreate: ({ editor: activeEditor, extension, state }) => {
            calls.push(
              `create:${extension.name}:${state.doc.textContent}:${activeEditor.state.doc.textContent}`
            );
          },
          onUpdate: ({ extension, previousState, state }) => {
            calls.push(
              `update:${extension.name}:${previousState.doc.textContent}->${state.doc.textContent}`
            );
          },
          onDestroy: ({ extension, state }) => {
            calls.push(`destroy:${extension.name}:${state.doc.textContent}`);
          }
        })
      ]
    });

    expect(calls).toEqual([
      "create:high-lifecycle:world:world",
      "create:low-lifecycle:world"
    ]);

    expect(editor.commands.prependGreeting()).toBe(true);
    expect(calls).toEqual([
      "create:high-lifecycle:world:world",
      "create:low-lifecycle:world",
      "update:high-lifecycle:world->hello world",
      "update:low-lifecycle:world->hello world"
    ]);

    editor.destroy();
    expect(calls).toEqual([
      "create:high-lifecycle:world:world",
      "create:low-lifecycle:world",
      "update:high-lifecycle:world->hello world",
      "update:low-lifecycle:world->hello world",
      "destroy:high-lifecycle:hello world",
      "destroy:low-lifecycle:hello world"
    ]);
  });

  it("runs extension destroy hooks once", () => {
    const calls: string[] = [];
    const editor = createEditor({
      extensions: [
        Extension.create({
          name: "cleanup",
          onDestroy: () => {
            calls.push("destroy");
          }
        })
      ]
    });

    editor.destroy();
    editor.destroy();

    expect(calls).toEqual(["destroy"]);
  });

  it("configures extension options and initializes extension storage", () => {
    const calls: string[] = [];
    const extension = Extension.create({
      name: "greeting",
      addOptions: () => ({
        message: "hello",
        enabled: true
      }),
        addStorage() {
          return {
            message: this.options.message
          };
        },
        addCommands() {
          return {
            greet: () => () => {
              calls.push(`${this.storage.message}:${this.options.enabled}`);
              return true;
            }
          };
        }
    }).configure({ message: "hi" });
    const editor = createEditor({ extensions: [extension] });

    expect(editor.state.storage.greeting).toEqual({ message: "hi" });
    expect(editor.commands.greet()).toBe(true);
    expect(calls).toEqual(["hi:true"]);
  });

  it("applies dispatched ProseMirror transactions from commands", () => {
    const schema = createBasicSchema();
    const content = schema.node("doc", null, [
      schema.node("paragraph", null, [schema.text("world")])
    ]);
    const editor = createEditor({
      content,
      extensions: [
        Extension.create({
          name: "insert-text",
          addCommands() {
            return {
              insertHello: () => ({ tr, dispatch }) => {
                dispatch?.(tr.insertText("hello ", 1));
                return true;
              }
            };
          }
        })
      ]
    });

    expect(editor.commands.insertHello()).toBe(true);
    expect(editor.state.doc.textContent).toBe("hello world");
  });

  it("collects layout providers from extension and node hooks with context", () => {
    const extensionProvider = { kind: "extension" };
    const nodeProvider = { kind: "node" };
    const extension = Extension.create({
      name: "layout-extension",
      addLayoutProviders() {
        expect(this.name).toBe("layout-extension");
        return [{
          id: "extension-provider",
          nodeTypes: ["paragraph"],
          capabilities: ["child-flow"],
          provider: extensionProvider
        }];
      }
    });
    const node = Node.create({
      name: "layout-node",
      addLayoutProviders() {
        expect(this.name).toBe("layout-node");
        return [{
          id: "node-provider",
          nodeTypes: ["layout-node"],
          capabilities: ["fragmentation"],
          provider: nodeProvider
        }];
      }
    });
    const manager = new QuireExtensionManager([extension, node]);

    expect(manager.layoutProviders).toMatchObject([
      { id: "extension-provider", extensionName: "layout-extension" },
      { id: "node-provider", extensionName: "layout-node" }
    ]);
    expect(manager.layoutProviderRegistry?.getById("node-provider")?.provider)
      .toBe(nodeProvider);
  });

  it("looks up a unique layout provider deterministically", () => {
    const first = {
      id: "first",
      nodeTypes: ["alpha"],
      capabilities: ["selection-domain" as const],
      provider: 1,
      extensionName: "first-extension"
    };
    const second = {
      id: "second",
      nodeTypes: ["beta"],
      capabilities: ["semantic-export" as const],
      provider: 2,
      extensionName: "second-extension"
    };
    const result = createQuireLayoutProviderRegistrationRegistry([first, second]);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.registry.entries).toEqual([first, second]);
      expect(result.registry.getById("first")).toBe(first);
      expect(result.registry.getByNodeType("beta")).toBe(second);
      expect(result.registry.getByNodeType("missing")).toBeUndefined();
    }
  });

  it("reports duplicate layout provider ids as errors without fallback", () => {
    const manager = new QuireExtensionManager([
      Extension.create({
        name: "first-layout-extension",
        addLayoutProviders: () => [{
          id: "shared-provider",
          nodeTypes: ["first-node"],
          capabilities: ["child-flow"],
          provider: "first"
        }]
      }),
      Extension.create({
        name: "second-layout-extension",
        addLayoutProviders: () => [{
          id: "shared-provider",
          nodeTypes: ["second-node"],
          capabilities: ["child-flow"],
          provider: "second"
        }]
      })
    ]);

    expect(manager.layoutProviderRegistry).toBeNull();
    expect(manager.diagnostics).toContainEqual(expect.objectContaining({
      code: "duplicate-layout-provider-id",
      providerId: "shared-provider",
      severity: "error"
    }));
  });

  it("reports ambiguous node layout providers as errors without priority fallback", () => {
    const manager = new QuireExtensionManager([
      Extension.create({
        name: "high-layout-extension",
        priority: 100,
        addLayoutProviders: () => [{
          id: "high-provider",
          nodeTypes: ["shared-node"],
          capabilities: ["child-flow"],
          provider: "high"
        }]
      }),
      Extension.create({
        name: "low-layout-extension",
        priority: 1,
        addLayoutProviders: () => [{
          id: "low-provider",
          nodeTypes: ["shared-node"],
          capabilities: ["child-flow"],
          provider: "low"
        }]
      })
    ]);

    expect(manager.layoutProviderRegistry).toBeNull();
    expect(manager.diagnostics).toContainEqual(expect.objectContaining({
      code: "ambiguous-node-layout-provider",
      nodeType: "shared-node",
      severity: "error"
    }));
  });

  it("collects selection adapters from three independent semantic consumers", () => {
    const wordTableAdapter = {
      modes: ["internal", "entry", "exit", "fully-crossed"],
      semanticUnit: "row"
    };
    const atomicBlockContribution = selectionPreset.atomicBlock({
      id: "atomic-image",
      nodeTypes: ["atomicImage"],
      priority: 100
    });
    const customLayoutAdapter = {
      modes: ["internal", "entry", "exit", "fully-crossed"],
      semanticUnit: "extension-owned"
    };
    const manager = new QuireExtensionManager([
      Extension.create({
        name: "word-table-selection",
        addSelectionAdapters() {
          expect(this.name).toBe("word-table-selection");
          return [{
            id: "word-table-rows",
            nodeTypes: ["table"],
            priority: 200,
            adapter: wordTableAdapter
          }];
        }
      }),
      Node.create({
        name: "atomicImage",
        group: "block",
        atom: true,
        addSelection() {
          expect(this.name).toBe("atomicImage");
          return [atomicBlockContribution];
        }
      }),
      Extension.create({
        name: "consumer-callout-layout",
        addSelectionAdapters: () => [{
          id: "consumer-callout",
          nodeTypes: ["consumerCallout"],
          priority: 50,
          adapter: customLayoutAdapter
        }]
      })
    ]);

    expect(manager.selectionAdapters.map((entry) => entry.id)).toEqual([
      "word-table-rows",
      "atomic-image",
      "consumer-callout"
    ]);
    expect(manager.selectionAdapterRegistry?.getByNodeType("table")?.adapter)
      .toBe(wordTableAdapter);
    expect(
      manager.selectionAdapterRegistry?.getByNodeType("atomicImage")?.adapter
    ).toBe(atomicBlockContribution.adapter);
    expect(
      manager.selectionAdapterRegistry
        ?.getByNodeType("consumerCallout")
        ?.adapter
    ).toBe(customLayoutAdapter);
  });

  it("diagnoses ambiguous selection adapters instead of using extension order", () => {
    const manager = new QuireExtensionManager([
      Extension.create({
        name: "first-selection-owner",
        addSelectionAdapters: () => [{
          id: "first-selection-adapter",
          nodeTypes: ["sharedNode"],
          priority: 100,
          adapter: "first"
        }]
      }),
      Extension.create({
        name: "second-selection-owner",
        addSelectionAdapters: () => [{
          id: "second-selection-adapter",
          nodeTypes: ["sharedNode"],
          priority: 100,
          adapter: "second"
        }]
      })
    ]);

    expect(manager.selectionAdapterRegistry).toBeNull();
    expect(manager.diagnostics).toContainEqual(expect.objectContaining({
      code: "ambiguous-node-selection-adapter",
      nodeType: "sharedNode",
      priority: 100,
      severity: "error"
    }));
  });

  it("removes selection adapters when their extension is no longer installed", () => {
    const extension = Extension.create({
      name: "temporary-selection-owner",
      addSelectionAdapters: () => [{
        id: "temporary-selection-adapter",
        nodeTypes: ["temporaryNode"],
        adapter: "temporary"
      }]
    });
    const installed = new QuireExtensionManager([extension]);
    const uninstalled = new QuireExtensionManager([]);

    expect(installed.selectionAdapterRegistry?.getById(
      "temporary-selection-adapter"
    )).toBeDefined();
    expect(uninstalled.selectionAdapterRegistry?.entries).toEqual([]);
    expect(uninstalled.selectionAdapters).toEqual([]);
  });
});

/**
 * Creates the small DOM subset needed by mounted-view tests.
 *
 * @returns DOM document stub that can allocate appendable elements.
 */
function createTestOwnerDocument(): Document {
  const ownerDocument = {} as {
    createElement: (tagName: string) => HTMLElement;
  };

  ownerDocument.createElement = () =>
    createTestElement(ownerDocument as unknown as Document);

  return ownerDocument as unknown as Document;
}

/**
 * Creates the small HTMLElement subset consumed by core mounted-view contracts.
 *
 * @param ownerDocument - Document stub associated with the element.
 * @returns HTMLElement stub for tests.
 */
function createTestElement(ownerDocument: Document): HTMLElement {
  const children: HTMLElement[] = [];

  return {
    ownerDocument,
    appendChild: (child: HTMLElement) => {
      children.push(child);

      return child;
    },
    remove: () => {
      children.length = 0;
    }
  } as unknown as HTMLElement;
}

/**
 * Dispatches a keyboard event through installed ProseMirror keydown props.
 *
 * @param editor - Editor whose plugin props should receive the event.
 * @param event - Keyboard event fields used by the PM keymap package.
 * @returns Whether any plugin handled the keyboard event.
 */
function dispatchKeyboardShortcut(
  editor: QuireEditor,
  event: Pick<KeyboardEvent, "key" | "keyCode"> &
    Partial<Pick<KeyboardEvent, "altKey" | "ctrlKey" | "metaKey" | "shiftKey">>
): boolean {
  const view = createTestEditorView(editor);
  const keyboardEvent = createTestKeyboardEvent(event);

  return editor.state.pm.plugins.some((plugin) =>
    plugin.props.handleKeyDown?.call(plugin, view, keyboardEvent)
  );
}

/**
 * Creates the minimal EditorView subset needed by PM keymap tests.
 *
 * @param editor - Editor whose state and dispatch should back the view.
 * @returns EditorView-like object for plugin prop dispatch.
 */
function createTestEditorView(editor: QuireEditor): EditorView {
  return {
    get state() {
      return editor.state.pm;
    },
    dispatch(transaction: Transaction): void {
      editor.dispatchTransaction(transaction);
    },
    editable: true
  } as unknown as EditorView;
}

/**
 * Creates a DOM-light KeyboardEvent object for PM keymap matching.
 *
 * @param event - Keyboard event fields used by PM key name resolution.
 * @returns KeyboardEvent-like object for plugin prop dispatch.
 */
function createTestKeyboardEvent(
  event: Pick<KeyboardEvent, "key" | "keyCode"> &
    Partial<Pick<KeyboardEvent, "altKey" | "ctrlKey" | "metaKey" | "shiftKey">>
): KeyboardEvent {
  return {
    key: event.key,
    keyCode: event.keyCode,
    altKey: event.altKey ?? false,
    ctrlKey: event.ctrlKey ?? false,
    metaKey: event.metaKey ?? false,
    shiftKey: event.shiftKey ?? false,
    preventDefault: () => {},
    stopPropagation: () => {}
  } as unknown as KeyboardEvent;
}

/**
 * Creates a platform-correct `Mod-*` keyboard shortcut event.
 *
 * @param key - KeyboardEvent key value.
 * @param keyCode - Legacy keyCode used by PM key name fallbacks.
 * @param event - Optional modifier overrides for the event.
 * @returns Keyboard event fields for a PM `Mod-*` binding.
 */
function createModKeyboardShortcutEvent(
  key: string,
  keyCode: number,
  event: Partial<Pick<KeyboardEvent, "altKey" | "ctrlKey" | "metaKey" | "shiftKey">> = {}
): Pick<KeyboardEvent, "key" | "keyCode"> &
  Partial<Pick<KeyboardEvent, "altKey" | "ctrlKey" | "metaKey" | "shiftKey">> {
  const useMetaKey = isMacKeyboardPlatform();

  return {
    key,
    keyCode,
    altKey: event.altKey ?? false,
    ctrlKey: event.ctrlKey ?? !useMetaKey,
    metaKey: event.metaKey ?? useMetaKey,
    shiftKey: event.shiftKey ?? false
  };
}

/**
 * Checks whether PM keymap will normalize `Mod-*` shortcuts to Meta.
 *
 * @returns Whether the current runtime reports a Mac-like keyboard platform.
 */
function isMacKeyboardPlatform(): boolean {
  return /Mac|iP(hone|[oa]d)/.test(globalThis.navigator?.platform ?? "");
}

/**
 * Spies on console.warn while keeping test output quiet.
 *
 * @returns Console warn spy that callers must restore.
 */
function viSpyOnConsoleWarn(): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(console, "warn").mockImplementation(() => {});
}
