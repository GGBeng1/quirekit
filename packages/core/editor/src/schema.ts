import {
  Schema,
  type AttributeSpec,
  type DOMOutputSpec,
  type Mark as PMMark,
  type MarkSpec,
  type Node as PMNode,
  type NodeSpec,
  type ParseRule,
  type TagParseRule
} from "@quirekit/pm";
import { getAttributesFromExtensions } from "./helpers/getAttributesFromExtensions";
import { getExtensionField } from "./helpers/getExtensionField";
import { getRenderedAttributes } from "./helpers/getRenderedAttributes";
import { injectExtensionAttributesToParseRule } from "./helpers/injectExtensionAttributesToParseRule";
import { splitExtensions } from "./helpers/splitExtensions";
import { callOrReturn } from "./utilities/callOrReturn";
import { isEmptyObject } from "./utilities/isEmptyObject";
import type {
  QuireAnyExtension,
  QuireExtensionAttribute,
  QuireExtensionThisContext,
  QuireExtendMarkSchemaHook,
  QuireExtendNodeSchemaHook,
  QuireMarkConfig,
  QuireNodeConfig,
  QuireSchemaSpec
} from "./types";

/** Schema-construction context bound to Tiptap-compatible config fields. */
type QuireSchemaExtensionContext = QuireExtensionThisContext & Record<string, unknown>;

/**
 * Creates the bootstrap schema used by the editor core.
 *
 * @returns A ProseMirror schema with the built-in document, paragraph, and text
 * nodes.
 */
export function createBasicSchema(): Schema {
  return new Schema(createBasicSchemaSpec());
}

/**
 * Creates the bootstrap schema spec used by the editor core.
 *
 * @returns A schema spec with the built-in document, paragraph, and text nodes.
 */
export function createBasicSchemaSpec(): QuireSchemaSpec {
  return {
    nodes: {
      doc: { content: "block*" },
      paragraph: { content: "text*", group: "block" },
      text: { group: "inline" }
    },
    marks: {}
  };
}

/**
 * Creates an empty document for the given schema.
 *
 * @param schema - Schema used to create the top-level document node.
 * @returns A filled top-level document node for the schema.
 */
export function createEmptyDoc(schema: Schema): PMNode {
  const doc = schema.topNodeType.createAndFill();
  if (!doc) {
    throw new RangeError("Unable to create an empty document for the schema.");
  }

  return doc;
}

/**
 * Creates a schema spec from the base schema and extension contributions.
 *
 * @param extensions - Resolved extensions that contribute nodes, marks, or
 * attributes.
 * @returns A merged schema spec ready to construct a ProseMirror schema.
 */
export function createSchemaSpec(extensions: readonly QuireAnyExtension[]): QuireSchemaSpec {
  const baseSpec = createBasicSchemaSpec();
  const extensionAttributes = getAttributesFromExtensions(extensions);
  const { nodeExtensions, markExtensions } = splitExtensions(extensions);
  const nodes: Record<string, NodeSpec> = {
    ...baseSpec.nodes,
    ...Object.fromEntries(
      nodeExtensions.map((extension) => [
        extension.name,
        createNodeSpecFromExtension(extension, extensions, extensionAttributes)
      ])
    )
  };
  const marks: Record<string, MarkSpec> = {
    ...(baseSpec.marks ?? {}),
    ...Object.fromEntries(
      markExtensions.map((extension) => [
        extension.name,
        createMarkSpecFromExtension(extension, extensions, extensionAttributes)
      ])
    )
  };
  const topNodeName =
    nodeExtensions.find((extension) =>
      resolveSchemaField<boolean>(
        extension,
        "topNode",
        createSchemaExtensionContext(extension, extensions)
      )
    )?.name ??
    extensions.find((extension) => extension.topNodeName)?.topNodeName;

  installAttributesOnExistingSpecs(nodes, marks, extensionAttributes);
  installNodeHTMLSerializationTransforms(nodes, extensions);

  return {
    ...(topNodeName === undefined ? {} : { topNode: topNodeName }),
    nodes,
    marks
  };
}

/**
 * Composes behavior-extension transforms around existing node serializers.
 *
 * This phase runs after node specs and global attributes are complete so each
 * transform receives the exact default output that every DOMSerializer
 * consumer would otherwise observe. Extension order is preserved and the
 * document node remains immutable.
 *
 * @param nodes - Mutable node specs being assembled for the schema.
 * @param extensions - Resolved extensions in contribution order.
 */
function installNodeHTMLSerializationTransforms(
  nodes: Record<string, NodeSpec>,
  extensions: readonly QuireAnyExtension[]
): void {
  for (const [nodeName, nodeSpec] of Object.entries(nodes)) {
    const transforms = extensions.flatMap((extension) => {
      const transform = extension.htmlSerializationTransforms?.[nodeName];

      return transform ? [transform] : [];
    });
    const serialize = nodeSpec.toDOM;

    if (!serialize || transforms.length === 0) {
      continue;
    }

    nodeSpec.toDOM = (node) =>
      transforms.reduce(
        (output, transform) => transform(node, output),
        serialize(node)
      );
  }
}

/**
 * Builds a node spec directly from the resolved Tiptap-compatible node config.
 *
 * @param extension - Node extension that owns the schema item.
 * @param extensions - Full resolved extension list.
 * @param allAttributes - Resolved local and global attributes.
 * @returns ProseMirror node spec for this extension.
 */
function createNodeSpecFromExtension(
  extension: QuireAnyExtension,
  extensions: readonly QuireAnyExtension[],
  allAttributes: readonly QuireExtensionAttribute[]
): NodeSpec {
  const extensionAttributes = allAttributes.filter((attribute) => attribute.type === extension.name);
  const context = createSchemaExtensionContext(extension, extensions);
  const schemaFields: Record<string, unknown> = {
    ...collectExtendedNodeSchemaFields(extensions, extension)
  };

  assignDefined(schemaFields, "content", resolveSchemaField<NodeSpec["content"]>(extension, "content", context));
  assignDefined(schemaFields, "marks", resolveSchemaField<NodeSpec["marks"]>(extension, "marks", context));
  assignDefined(schemaFields, "group", resolveSchemaField<NodeSpec["group"]>(extension, "group", context));
  assignDefined(schemaFields, "inline", resolveSchemaField<NodeSpec["inline"]>(extension, "inline", context));
  assignDefined(schemaFields, "atom", resolveSchemaField<NodeSpec["atom"]>(extension, "atom", context));
  assignDefined(schemaFields, "selectable", resolveSchemaField<NodeSpec["selectable"]>(extension, "selectable", context));
  assignDefined(schemaFields, "draggable", resolveSchemaField<NodeSpec["draggable"]>(extension, "draggable", context));
  assignDefined(schemaFields, "code", resolveSchemaField<NodeSpec["code"]>(extension, "code", context));
  assignDefined(schemaFields, "whitespace", resolveSchemaField<NodeSpec["whitespace"]>(extension, "whitespace", context));
  assignDefined(
    schemaFields,
    "linebreakReplacement",
    resolveSchemaField<NodeSpec["linebreakReplacement"]>(
      extension,
      "linebreakReplacement",
      context
    )
  );
  assignDefined(schemaFields, "defining", resolveSchemaField<NodeSpec["defining"]>(extension, "defining", context));
  assignDefined(
    schemaFields,
    "definingAsContext",
    resolveSchemaField<NodeSpec["definingAsContext"]>(
      extension,
      "definingAsContext",
      context
    )
  );
  assignDefined(
    schemaFields,
    "definingForContent",
    resolveSchemaField<NodeSpec["definingForContent"]>(
      extension,
      "definingForContent",
      context
    )
  );
  assignDefined(schemaFields, "isolating", resolveSchemaField<NodeSpec["isolating"]>(extension, "isolating", context));
  schemaFields.attrs = Object.fromEntries(extensionAttributes.map(buildAttributeSpec));

  const spec = cleanUpSchemaItem(schemaFields) as NodeSpec;
  const parseHTML = callOrReturn(
    getExtensionField<readonly TagParseRule[]>(extension, "parseHTML", context)
  );

  if (parseHTML) {
    spec.parseDOM = parseHTML.map((parseRule) =>
      injectExtensionAttributesToParseRule(parseRule, extensionAttributes)
    ) as TagParseRule[];
  }

  const renderHTML = getExtensionField<
    (context: {
      node: PMNode;
      HTMLAttributes: Record<string, unknown>;
    }) => DOMOutputSpec
  >(extension, "renderHTML", context);

  if (renderHTML) {
    spec.toDOM = (node) =>
      renderHTML({
        ...context,
        node,
        HTMLAttributes: getRenderedAttributes(node, extensionAttributes)
      });
  }

  const renderText = getExtensionField<
    OmitThisParameter<NonNullable<QuireNodeConfig["renderText"]>>
  >(
    extension,
    "renderText",
    context
  );

  if (renderText) {
    (spec as NodeSpec & { toText?: typeof renderText }).toText =
      (textContext) => renderText({ ...context, ...textContext });
  }

  return spec;
}

/**
 * Builds a mark spec directly from the resolved Tiptap-compatible mark config.
 *
 * @param extension - Mark extension that owns the schema item.
 * @param extensions - Full resolved extension list.
 * @param allAttributes - Resolved local and global attributes.
 * @returns ProseMirror mark spec for this extension.
 */
function createMarkSpecFromExtension(
  extension: QuireAnyExtension,
  extensions: readonly QuireAnyExtension[],
  allAttributes: readonly QuireExtensionAttribute[]
): MarkSpec {
  const extensionAttributes = allAttributes.filter((attribute) => attribute.type === extension.name);
  const context = createSchemaExtensionContext(extension, extensions);
  const schemaFields: Record<string, unknown> = {
    ...collectExtendedMarkSchemaFields(extensions, extension)
  };

  assignDefined(schemaFields, "inclusive", resolveSchemaField<MarkSpec["inclusive"]>(extension, "inclusive", context));
  assignDefined(schemaFields, "excludes", resolveSchemaField<MarkSpec["excludes"]>(extension, "excludes", context));
  assignDefined(schemaFields, "group", resolveSchemaField<MarkSpec["group"]>(extension, "group", context));
  assignDefined(schemaFields, "spanning", resolveSchemaField<MarkSpec["spanning"]>(extension, "spanning", context));
  assignDefined(schemaFields, "code", resolveSchemaField<MarkSpec["code"]>(extension, "code", context));
  schemaFields.attrs = Object.fromEntries(extensionAttributes.map(buildAttributeSpec));

  const spec = cleanUpSchemaItem(schemaFields) as MarkSpec;
  const parseHTML = callOrReturn(
    getExtensionField<readonly ParseRule[]>(extension, "parseHTML", context)
  );

  if (parseHTML) {
    spec.parseDOM = parseHTML.map((parseRule) =>
      injectExtensionAttributesToParseRule(parseRule, extensionAttributes)
    );
  }

  const renderHTML = getExtensionField<
    (context: {
      mark: PMMark;
      HTMLAttributes: Record<string, unknown>;
    }) => DOMOutputSpec
  >(extension, "renderHTML", context);

  if (renderHTML) {
    spec.toDOM = (mark) =>
      renderHTML({
        ...context,
        mark,
        HTMLAttributes: getRenderedAttributes(mark, extensionAttributes)
      });
  }

  return spec;
}

/**
 * Removes empty and nullish schema fields, matching Tiptap schema construction.
 *
 * @param data - Schema item fields to clean.
 * @returns A schema item without empty attrs or nullish fields.
 */
function cleanUpSchemaItem<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).filter(([key, value]) => {
      if (key === "attrs" && isEmptyObject(value)) {
        return false;
      }

      return value !== null && value !== undefined;
    })
  ) as T;
}

/**
 * Resolves a static or factory schema config field from an extension.
 *
 * @param extension - Extension that owns the field.
 * @param field - Config field name.
 * @param context - Schema construction context.
 * @returns Resolved schema field value.
 */
function resolveSchemaField<Value>(
  extension: QuireAnyExtension,
  field: string,
  context: QuireSchemaExtensionContext
): Value | undefined {
  return callOrReturn(getExtensionField<Value>(extension, field, context));
}

/**
 * Assigns a schema field only when the resolved value is defined.
 *
 * @param target - Mutable schema field map.
 * @param key - Schema field key.
 * @param value - Resolved schema field value.
 */
function assignDefined(
  target: Record<string, unknown>,
  key: string,
  value: unknown
): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

/**
 * Builds a ProseMirror attribute spec from Tiptap-compatible metadata.
 *
 * @param extensionAttribute - Resolved extension attribute.
 * @returns Attribute name and ProseMirror attribute spec tuple.
 */
function buildAttributeSpec(
  extensionAttribute: QuireExtensionAttribute
): [string, AttributeSpec] {
  const spec: AttributeSpec = {};

  if (!extensionAttribute.attribute.isRequired && "default" in extensionAttribute.attribute) {
    spec.default = extensionAttribute.attribute.default;
  }

  if (extensionAttribute.attribute.validate !== undefined) {
    spec.validate = extensionAttribute.attribute.validate;
  }

  return [extensionAttribute.name, spec];
}

/**
 * Applies resolved attributes to schema specs that do not have a backing node or
 * mark extension, such as QuireKit's bootstrap document nodes.
 *
 * @param nodes - Mutable node spec map.
 * @param marks - Mutable mark spec map.
 * @param extensionAttributes - Resolved attributes to install.
 */
function installAttributesOnExistingSpecs(
  nodes: Record<string, NodeSpec>,
  marks: Record<string, MarkSpec>,
  extensionAttributes: readonly QuireExtensionAttribute[]
): void {
  for (const extensionAttribute of extensionAttributes) {
    const [, attributeSpec] = buildAttributeSpec(extensionAttribute);

    const nodeSpec = nodes[extensionAttribute.type];
    if (nodeSpec) {
      nodes[extensionAttribute.type] = {
        ...nodeSpec,
        attrs: {
          ...(nodeSpec.attrs ?? {}),
          [extensionAttribute.name]: attributeSpec
        }
      };
      continue;
    }

    const markSpec = marks[extensionAttribute.type];
    if (markSpec) {
      marks[extensionAttribute.type] = {
        ...markSpec,
        attrs: {
          ...(markSpec.attrs ?? {}),
          [extensionAttribute.name]: attributeSpec
        }
      };
    };
  }
}

/**
 * Collects extra node schema fields contributed for one node extension.
 *
 * @param extensions - Extensions that may define `extendNodeSchema`.
 * @param target - Node extension whose schema spec is being built.
 * @returns Merged extra node schema fields.
 */
function collectExtendedNodeSchemaFields(
  extensions: readonly QuireAnyExtension[],
  target: QuireAnyExtension
): Partial<NodeSpec> {
  const fields: Partial<NodeSpec> = {};
  const context = createSchemaExtensionContext(target, extensions);

  for (const extension of extensions) {
    const extendNodeSchema = getExtensionField<QuireExtendNodeSchemaHook>(
      extension,
      "extendNodeSchema",
      context
    );
    const nextFields = extendNodeSchema?.call(context, target);

    if (nextFields) {
      Object.assign(fields, nextFields);
    }
  }

  return fields;
}

/**
 * Collects extra mark schema fields contributed for one mark extension.
 *
 * @param extensions - Extensions that may define `extendMarkSchema`.
 * @param target - Mark extension whose schema spec is being built.
 * @returns Merged extra mark schema fields.
 */
function collectExtendedMarkSchemaFields(
  extensions: readonly QuireAnyExtension[],
  target: QuireAnyExtension
): Partial<MarkSpec> {
  const fields: Partial<MarkSpec> = {};
  const context = createSchemaExtensionContext(target, extensions);

  for (const extension of extensions) {
    const extendMarkSchema = getExtensionField<QuireExtendMarkSchemaHook>(
      extension,
      "extendMarkSchema",
      context
    );
    const nextFields = extendMarkSchema?.call(context, target);

    if (nextFields) {
      Object.assign(fields, nextFields);
    }
  }

  return fields;
}

/**
 * Creates the `this` context used by Tiptap-compatible schema extension hooks.
 *
 * @param target - Node or mark extension whose schema is being extended.
 * @returns Extension context without an editor instance.
 */
function createSchemaExtensionContext(
  target: QuireAnyExtension,
  extensions: readonly QuireAnyExtension[] = []
): QuireSchemaExtensionContext {
  return {
    name: target.name,
    parent: undefined,
    options: target.options,
    storage: target.storage,
    extensions
  } as QuireSchemaExtensionContext;
}
