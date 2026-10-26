import type {
  Mark as PMMark,
  Node as PMNode,
  ParseOptions,
  Transaction
} from "@quirekit/pm";
import type { MarkView, NodeView } from "@quirekit/pm-view";
import { describe, expectTypeOf, it } from "vitest";
import { Mark as EditorMark, Node as EditorNode } from "../index";
import type {
  AnyExtension,
  ChangedRange,
  Content,
  DispatchTransactionProps,
  Editor,
  EditorEvents,
  EditorOptions,
  EnableRules,
  ExtendableConfig,
  ExtensionConfig,
  ExtensionAttribute,
  FocusPosition,
  HTMLContent,
  InsertContentAtOptions,
  JSONContent,
  MarkConfig,
  MarkRange,
  MarkViewProps,
  MarkViewRenderer,
  MarkViewRendererOptions,
  MarkViewRendererProps,
  NodeConfig,
  NodeWithPos,
  NodeViewProps,
  NodeViewRenderer,
  NodeViewRendererOptions,
  NodeViewRendererProps,
  Range,
  SetContentOptions
} from "../index";

describe("Tiptap-compatible foundational types", () => {
  it("keeps content and range contracts available under canonical names", () => {
    expectTypeOf<HTMLContent>().toEqualTypeOf<string>();
    expectTypeOf<Content>().toEqualTypeOf<
      string | JSONContent | JSONContent[] | null
    >();
    expectTypeOf<Range>().toEqualTypeOf<{ from: number; to: number }>();
    expectTypeOf<ChangedRange>().toEqualTypeOf<{
      oldRange: Range;
      newRange: Range;
    }>();
    expectTypeOf<NodeWithPos>().toEqualTypeOf<{ node: PMNode; pos: number }>();
    expectTypeOf<MarkRange>().toEqualTypeOf<{
      mark: PMMark;
      from: number;
      to: number;
    }>();
  });

  it("keeps command, rule, and attribute option shapes canonical", () => {
    expectTypeOf<FocusPosition>().toEqualTypeOf<
      "start" | "end" | "all" | number | boolean | null
    >();
    expectTypeOf<EnableRules>().toEqualTypeOf<
      (AnyExtension | string)[] | boolean
    >();
    expectTypeOf<DispatchTransactionProps>().toEqualTypeOf<{
      transaction: Transaction;
      next: (transaction: Transaction) => void;
    }>();
    expectTypeOf<InsertContentAtOptions>().toEqualTypeOf<{
      parseOptions?: ParseOptions | undefined;
      updateSelection?: boolean | undefined;
      applyInputRules?: boolean | undefined;
      applyPasteRules?: boolean | undefined;
      errorOnInvalidContent?: boolean | undefined;
    }>();
    expectTypeOf<SetContentOptions>().toEqualTypeOf<{
      parseOptions?: ParseOptions | undefined;
      errorOnInvalidContent?: boolean | undefined;
      emitUpdate?: boolean | undefined;
    }>();
    expectTypeOf<ExtensionAttribute>()
      .toHaveProperty("type")
      .toEqualTypeOf<string>();
    expectTypeOf<ExtensionAttribute>()
      .toHaveProperty("name")
      .toEqualTypeOf<string>();
  });

  it("exposes canonical editor event and option contracts", () => {
    expectTypeOf<EditorEvents>()
      .toHaveProperty("mount")
      .toHaveProperty("editor");
    expectTypeOf<EditorEvents>()
      .toHaveProperty("unmount")
      .toHaveProperty("editor");
    expectTypeOf<EditorEvents>()
      .toHaveProperty("contentError")
      .toHaveProperty("disableCollaboration")
      .toEqualTypeOf<() => void>();
    expectTypeOf<EditorEvents>()
      .toHaveProperty("transaction")
      .toHaveProperty("appendedTransactions")
      .toEqualTypeOf<Transaction[]>();
    expectTypeOf<EditorEvents>()
      .toHaveProperty("destroy")
      .toEqualTypeOf<void>();
    expectTypeOf<EditorOptions>()
      .toHaveProperty("autofocus")
      .toEqualTypeOf<FocusPosition>();
    expectTypeOf<EditorOptions>()
      .toHaveProperty("enableContentCheck")
      .toEqualTypeOf<boolean>();
    expectTypeOf<EditorOptions>()
      .toHaveProperty("enableExtensionDispatchTransaction")
      .toEqualTypeOf<boolean | undefined>();
    expectTypeOf<Editor>()
      .toHaveProperty("options")
      .toEqualTypeOf<EditorOptions>();
    expectTypeOf<HTMLElement>()
      .toMatchTypeOf<Parameters<Editor["mount"]>[0]>();
  });

  it("exposes canonical extension config names", () => {
    expectTypeOf<ExtensionConfig<{ enabled: boolean }, { count: number }>>()
      .toHaveProperty("name")
      .toEqualTypeOf<string>();
    expectTypeOf<NonNullable<NodeConfig["addNodeView"]>>()
      .toBeFunction();
    expectTypeOf<NonNullable<MarkConfig["addMarkView"]>>()
      .toBeFunction();
    expectTypeOf<ExtendableConfig>()
      .toHaveProperty("name")
      .toEqualTypeOf<string>();
    expectTypeOf<NodeConfig>()
      .toMatchTypeOf<Parameters<typeof EditorNode.create>[0]>();
    expectTypeOf<MarkConfig>()
      .toMatchTypeOf<Parameters<typeof EditorMark.create>[0]>();
  });

  it("keeps DOM node and mark view contracts separate from QuireKit adapters", () => {
    expectTypeOf<NodeViewRendererProps>()
      .toHaveProperty("HTMLAttributes")
      .toEqualTypeOf<Record<string, any>>();
    expectTypeOf<NodeViewProps>()
      .toHaveProperty("deleteNode")
      .toEqualTypeOf<() => void>();
    expectTypeOf<NodeViewRenderer>()
      .returns
      .toEqualTypeOf<NodeView>();
    expectTypeOf<NodeViewRendererOptions>()
      .toHaveProperty("contentDOMElementTag")
      .toEqualTypeOf<string>();
    expectTypeOf<MarkViewRendererProps>()
      .toHaveProperty("updateAttributes")
      .toBeFunction();
    expectTypeOf<MarkViewProps>()
      .toMatchTypeOf<MarkViewRendererProps>();
    expectTypeOf<MarkViewRenderer>()
      .returns
      .toEqualTypeOf<MarkView>();
    expectTypeOf<NonNullable<MarkViewRendererOptions["ignoreMutation"]>>()
      .toBeFunction();
  });
});
