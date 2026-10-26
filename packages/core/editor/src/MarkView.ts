import type { Mark as PMMark } from "@quirekit/pm";
import type { QuireEditor } from "./Editor";
import type {
  QuireMarkViewProps,
  QuireMarkViewRendererOptions,
  QuireViewMutationRecord
} from "./types";
import { isAndroid, isiOS } from "./utilities";

/**
 * Updates all ranges that still contain the represented mark instance.
 *
 * @param checkMark - Mark instance to update.
 * @param editor - Editor whose document should be updated.
 * @param attrs - Attributes to merge into the mark.
 */
export function updateMarkViewAttributes(
  checkMark: PMMark,
  editor: QuireEditor,
  attrs: Record<string, unknown> = {}
): void {
  const { doc, tr } = editor.state.pm;

  doc.descendants((node, pos) => {
    const foundMark = node.marks.find((mark) => mark === checkMark);

    if (!foundMark || !hasChangedAttributes(foundMark, attrs)) {
      return;
    }

    const from = tr.mapping.map(pos);
    const to = from + node.nodeSize;
    const updatedMark = checkMark.type.create({
      ...checkMark.attrs,
      ...attrs
    });

    tr.removeMark(from, to, checkMark.type);
    tr.addMark(from, to, updatedMark);
  });

  if (tr.docChanged) {
    editor.view.dispatch(tr);
  }
}

/** Base Tiptap-compatible mark view for QuireKit mounted views. */
export class MarkView<
  Component,
  Options extends QuireMarkViewRendererOptions = QuireMarkViewRendererOptions
> {
  /** Framework component or renderer object owned by this mark view. */
  component: Component;

  /** Editor instance that owns the mounted view. */
  editor: QuireEditor;

  /** Mark view options supplied by a framework renderer. */
  options: Options;

  /** ProseMirror mark represented by this mark view. */
  mark: QuireMarkViewProps["mark"];

  /** Rendered attributes resolved from extension attributes. */
  HTMLAttributes: QuireMarkViewProps["HTMLAttributes"];

  /**
   * Creates a mark view instance.
   *
   * @param component - Framework component or renderer object.
   * @param props - Mark view renderer props supplied by the mounted view.
   * @param options - Optional mark view behavior overrides.
   */
  constructor(
    component: Component,
    props: QuireMarkViewProps,
    options?: Partial<Options>
  ) {
    this.component = component;
    this.editor = props.editor;
    this.options = { ...options } as Options;
    this.mark = props.mark;
    this.HTMLAttributes = props.HTMLAttributes;
  }

  /**
   * Returns the DOM element exposed to ProseMirror-style integrations.
   *
   * @returns Root DOM element for this mark view.
   */
  get dom(): HTMLElement {
    return this.editor.view.dom;
  }

  /**
   * Returns the editable content DOM element, when this mark view owns one.
   *
   * @returns Content DOM element or null for leaf views.
   */
  get contentDOM(): HTMLElement | null {
    return null;
  }

  /**
   * Updates attributes of the represented mark.
   *
   * @param attrs - Partial attributes to merge into the mark.
   * @param checkMark - Optional mark instance to update instead of this mark.
   */
  updateAttributes(attrs: Record<string, unknown>, checkMark?: PMMark): void {
    updateMarkViewAttributes(checkMark ?? this.mark, this.editor, attrs);
  }

  /**
   * Reports whether a DOM mutation can be ignored by the mounted view.
   *
   * @param mutation - DOM mutation or selection mutation to test.
   * @returns Whether the mutation can be ignored.
   */
  ignoreMutation(mutation: QuireViewMutationRecord): boolean {
    if (typeof this.options.ignoreMutation === "function") {
      return this.options.ignoreMutation({ mutation });
    }

    if (!this.contentDOM) {
      return true;
    }

    if (mutation.type === "selection") {
      return false;
    }

    if (
      this.dom.contains(mutation.target) &&
      mutation.type === "childList" &&
      (isiOS() || isAndroid()) &&
      this.editor.isFocused &&
      [...mutation.addedNodes, ...mutation.removedNodes].every(isEditableNode)
    ) {
      return false;
    }

    if (this.contentDOM === mutation.target && mutation.type === "attributes") {
      return true;
    }

    if (this.contentDOM.contains(mutation.target)) {
      return false;
    }

    return true;
  }
}

/**
 * Reports whether a changed DOM node is content editable.
 *
 * @param node - DOM node to inspect.
 * @returns Whether the node is an editable element.
 */
function isEditableNode(node: globalThis.Node): boolean {
  return node instanceof HTMLElement && node.isContentEditable;
}

/**
 * Reports whether a mark update would change any attributes.
 *
 * @param mark - Existing mark to inspect.
 * @param attrs - Candidate attributes.
 * @returns Whether at least one candidate attribute differs.
 */
function hasChangedAttributes(
  mark: PMMark,
  attrs: Record<string, unknown>
): boolean {
  return Object.entries(attrs).some(([key, value]) => mark.attrs[key] !== value);
}
