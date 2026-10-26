import { mergeAttributes, Node } from "@quirekit/core";
import { floatingObjectViewEventHandlers } from "./event-handlers";
import { createFloatingObjectCommands } from "./commands";
import { createFloatingObjectNodeView } from "./html-node-view";
import { createFloatingObjectProviderRegistration } from "./provider/layout";
import type {
  FloatingObjectAttributes,
  FloatingObjectMove,
  FloatingObjectOptions,
  FloatingObjectResize,
  FloatingObjectRestore
} from "./types";

/** Provider-backed floating object with an independently editable text root. */
export const FloatingObject = Node.create<FloatingObjectOptions>({
  name: "floatingObject",
  priority: 1000,

  addOptions() {
    return {
      width: 240,
      minHeight: 96,
      minimumWidth: 96,
      minimumHeight: 48,
      movementStep: 8,
      HTMLAttributes: {}
    };
  },

  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      width: {
        default: this.options.width,
        rendered: false,
        parseHTML: (element) => readNumberAttribute(
          element,
          "data-qk-floating-object-width",
          this.options.width
        )
      },
      minHeight: {
        default: this.options.minHeight,
        rendered: false,
        parseHTML: (element) => readNumberAttribute(
          element,
          "data-qk-floating-object-min-height",
          this.options.minHeight
        )
      },
      inlineOffset: {
        default: 0,
        rendered: false,
        parseHTML: (element) => readNumberAttribute(
          element,
          "data-qk-floating-object-inline-offset",
          0
        )
      },
      blockOffset: {
        default: 0,
        rendered: false,
        parseHTML: (element) => readNumberAttribute(
          element,
          "data-qk-floating-object-block-offset",
          0
        )
      }
    };
  },

  parseHTML() {
    return [{
      tag: 'figure[data-qk-floating-object="true"]',
      getAttrs: (element) => isValidFloatingObjectElement(
        element as HTMLElement,
        this.options
      ) ? null : false
    }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "figure",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-qk-floating-object": "true",
        "data-qk-floating-object-width": node.attrs.width,
        "data-qk-floating-object-min-height": node.attrs.minHeight,
        "data-qk-floating-object-inline-offset": node.attrs.inlineOffset,
        "data-qk-floating-object-block-offset": node.attrs.blockOffset
      }),
      ["div", { "data-qk-floating-object-content": "true" }, 0]
    ];
  },

  addNodeView() {
    return (props) => createFloatingObjectNodeView(props);
  },

  addCommands() {
    return createFloatingObjectCommands(this.name, this.options);
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ commands }) => commands.enterFloatingObject(),
      Escape: ({ commands }) => commands.leaveFloatingObject(),
      "Alt-ArrowLeft": ({ commands }) => commands.moveFloatingObject({
        inlineDelta: -this.options.movementStep,
        blockDelta: 0
      }),
      "Alt-ArrowRight": ({ commands }) => commands.moveFloatingObject({
        inlineDelta: this.options.movementStep,
        blockDelta: 0
      }),
      "Alt-ArrowUp": ({ commands }) => commands.moveFloatingObject({
        inlineDelta: 0,
        blockDelta: -this.options.movementStep
      }),
      "Alt-ArrowDown": ({ commands }) => commands.moveFloatingObject({
        inlineDelta: 0,
        blockDelta: this.options.movementStep
      })
    };
  },

  addLayoutProviders() {
    return [createFloatingObjectProviderRegistration(this.name)];
  },

  viewEventHandlers: floatingObjectViewEventHandlers
});

/** Public floating-object command methods. */
type FloatingObjectCommandMethods<ReturnType> = {
  setFloatingObject: (attributes?: Partial<FloatingObjectAttributes>) => ReturnType;
  selectFloatingObject: () => ReturnType;
  enterFloatingObject: () => ReturnType;
  leaveFloatingObject: () => ReturnType;
  moveFloatingObject: (move: FloatingObjectMove) => ReturnType;
  resizeFloatingObject: (resize: FloatingObjectResize) => ReturnType;
  restoreFloatingObjectGeometry: (snapshot: FloatingObjectRestore) => ReturnType;
};

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Commands installed by the FloatingObject extension. */
    readonly floatingObject: FloatingObjectCommandMethods<ReturnType>;
  }
}

/**
 * Reads one finite numeric HTML attribute with a canonical schema default.
 *
 * @param element - Parsed floating-object element.
 * @param name - Data attribute name.
 * @param fallback - Canonical default when the attribute is absent.
 * @returns Parsed finite number or the schema default for an absent attribute.
 */
function readNumberAttribute(
  element: HTMLElement,
  name: string,
  fallback: number
): number {
  const raw = element.getAttribute(name);
  if (raw === null) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Validates explicit imported geometry before the parse rule creates a node.
 *
 * Missing attributes use canonical schema defaults. Present attributes must
 * satisfy the same geometry contract as transactions and provider execution.
 *
 * @param element - Candidate floating-object element.
 * @param options - Canonical geometry limits.
 * @returns Whether every explicit geometry attribute is valid.
 */
function isValidFloatingObjectElement(
  element: HTMLElement,
  options: FloatingObjectOptions
): boolean {
  return isValidOptionalNumberAttribute(
    element,
    "data-qk-floating-object-width",
    options.minimumWidth
  ) && isValidOptionalNumberAttribute(
    element,
    "data-qk-floating-object-min-height",
    options.minimumHeight
  ) && isValidOptionalNumberAttribute(
    element,
    "data-qk-floating-object-inline-offset",
    0
  ) && isValidOptionalNumberAttribute(
    element,
    "data-qk-floating-object-block-offset",
    0
  );
}

/**
 * Checks one optional finite numeric attribute against its lower bound.
 *
 * @param element - Candidate floating-object element.
 * @param name - Data attribute name.
 * @param minimum - Inclusive lower bound.
 * @returns Whether the absent or explicit value is valid.
 */
function isValidOptionalNumberAttribute(
  element: HTMLElement,
  name: string,
  minimum: number
): boolean {
  const raw = element.getAttribute(name);
  if (raw === null) {
    return true;
  }
  const value = Number(raw);
  return Number.isFinite(value) && value >= minimum;
}
