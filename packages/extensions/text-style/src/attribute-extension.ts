import {
  Extension,
  setMark,
  type CommandProps,
  type CommandSpec
} from "@quirekit/core";
import { createTextStyleAttributeAiCapabilities } from "./ai/facts";
import { hasTextStyleAttributes } from "./style-attributes";

/** Mark type resolved from a command context schema. */
type TextStyleMarkType = NonNullable<CommandProps["state"]["schema"]["marks"][string]>;

/** Options shared by textStyle attribute extensions. */
export interface TextStyleAttributeExtensionOptions {
  /** Mark types where the attribute can be applied. */
  readonly types: string[];
}

/** Configuration for one textStyle attribute extension. */
export interface TextStyleAttributeExtensionConfig {
  /** Extension name. */
  readonly name: string;
  /** Command name that sets the style attribute. */
  readonly setCommandName: string;
  /** Command name that unsets the style attribute. */
  readonly unsetCommandName: string;
  /** Schema attribute name stored on textStyle. */
  readonly attributeName: string;
  /** CSS property used for HTML parse/render. */
  readonly styleName: string;
  /** Model-visible character format name and meaning; omitted attributes stay out of the AI view. */
  readonly ai?: {
    /** Format name used in the AI document view. */
    readonly name: string;
    /** One-sentence meaning and value range. */
    readonly description: string;
    /** JSON Schema of accepted values. */
    readonly schema: Readonly<Record<string, unknown>>;
    /** How people see the attribute when reviewing a change. */
    readonly present?: {
      /** Short name, such as "字号". */
      readonly label: string;
      /** Writes one value for people; omitted shows it as plain text. */
      readonly value?: ((value: unknown) => string) | undefined;
    } | undefined;
  } | undefined;
}

/**
 * Creates a Tiptap-style extension that stores one CSS property on textStyle.
 *
 * @param config - Attribute extension configuration.
 * @returns Extension definition.
 */
export function createTextStyleAttributeExtension(
  config: TextStyleAttributeExtensionConfig
): Extension<TextStyleAttributeExtensionOptions> {
  return Extension.create<TextStyleAttributeExtensionOptions>({
    name: config.name,
    addOptions() {
      return {
        types: ["textStyle"]
      };
    },
    addGlobalAttributes() {
      return [
        {
          types: this.options.types,
          attributes: {
            [config.attributeName]: {
              default: null,
              parseHTML: (element) => element.style.getPropertyValue(config.styleName),
              renderHTML: (attributes) => {
                const value = attributes[config.attributeName];

                return typeof value === "string" && value.length > 0
                  ? { style: `${config.styleName}: ${value}` }
                  : {};
              }
            }
          }
        }
      ];
    },
    addAiCapabilities() {
      return createTextStyleAttributeAiCapabilities(config);
    },
    addCommands() {
      return {
        [config.setCommandName]: setTextStyleAttributeCommand(config.attributeName),
        [config.unsetCommandName]: unsetTextStyleAttributeCommand(config.attributeName)
      };
    }
  });
}

/**
 * Creates a configured copy of a textStyle attribute extension.
 *
 * @param extension - Extension to configure.
 * @param options - Optional extension options.
 * @returns Configured extension.
 */
export function configureTextStyleAttributeExtension(
  extension: Extension<TextStyleAttributeExtensionOptions>,
  options: Partial<TextStyleAttributeExtensionOptions> = {}
): Extension<TextStyleAttributeExtensionOptions> {
  return extension.configure(options);
}

/**
 * Creates a command that sets one textStyle attribute.
 *
 * @param attributeName - textStyle attribute to set.
 * @returns Command handler.
 */
export function setTextStyleAttributeCommand(attributeName: string): CommandSpec {
  return (value) => (context) =>
    setMark("textStyle", { [attributeName]: value })(context);
}

/**
 * Creates a command that unsets one textStyle attribute.
 *
 * @param attributeName - textStyle attribute to unset.
 * @returns Command handler.
 */
export function unsetTextStyleAttributeCommand(attributeName: string): CommandSpec {
  return unsetTextStyleAttributesCommand([attributeName]);
}

/**
 * Creates one atomic command that unsets several textStyle attributes.
 *
 * @param attributeNames - Attribute names to clear together.
 * @returns Command handler preserving every unrelated textStyle attribute.
 */
export function unsetTextStyleAttributesCommand(
  attributeNames: readonly string[]
): CommandSpec {
  return () => (context) => {
    const markType = context.state.schema.marks.textStyle;

    if (!markType) {
      return false;
    }

    unsetTextStyleAttributes(context, markType, attributeNames);
    context.dispatch?.(context.tr.scrollIntoView());

    return true;
  };
}

/**
 * Unsets several textStyle attributes while preserving other textStyle attrs.
 *
 * @param context - Command execution context.
 * @param markType - textStyle mark type.
 * @param attributeNames - Attributes to unset atomically.
 */
function unsetTextStyleAttributes(
  context: CommandProps,
  markType: TextStyleMarkType,
  attributeNames: readonly string[]
): void {
  if (context.tr.selection.empty) {
    unsetStoredTextStyleAttributes(context, markType, attributeNames);
    return;
  }

  for (const range of context.tr.selection.ranges) {
    context.state.doc.nodesBetween(range.$from.pos, range.$to.pos, (node, pos) => {
      const currentMark = node.marks.find((mark) => mark.type === markType);

      if (!currentMark) {
        return;
      }

      const from = Math.max(pos, range.$from.pos);
      const to = Math.min(pos + node.nodeSize, range.$to.pos);
      const attrs = { ...currentMark.attrs };
      for (const attributeName of attributeNames) attrs[attributeName] = null;

      context.tr.removeMark(from, to, markType);

      if (hasTextStyleAttributes(attrs)) {
        context.tr.addMark(from, to, markType.create(attrs));
      }
    });
  }
}

/**
 * Unsets several stored textStyle attributes for a collapsed selection.
 *
 * @param context - Command execution context.
 * @param markType - textStyle mark type.
 * @param attributeNames - Attributes to unset atomically.
 */
function unsetStoredTextStyleAttributes(
  context: CommandProps,
  markType: TextStyleMarkType,
  attributeNames: readonly string[]
): void {
  const storedMarks = context.tr.storedMarks ?? context.state.storedMarks ?? [];
  const currentMark = storedMarks.find((mark) => mark.type === markType);

  if (!currentMark) {
    return;
  }

  const attrs = { ...currentMark.attrs };
  for (const attributeName of attributeNames) attrs[attributeName] = null;

  context.tr.removeStoredMark(markType);

  if (hasTextStyleAttributes(attrs)) {
    context.tr.addStoredMark(markType.create(attrs));
  }
}
