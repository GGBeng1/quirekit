import type {
  QuireAnyExtension,
  QuireExtensionAttribute,
  QuireExtensionAttributeSpec,
  QuireSchemaAttributeContribution,
  QuireSchemaAttributeMap,
  QuireSchemaAttributeTypes
} from "../types";
import { getExtensionField } from "./getExtensionField";
import { splitExtensions } from "./splitExtensions";

/** Context passed to attribute factory hooks. */
type QuireAttributeFactoryContext = Readonly<{
  /** Extension name owning the attribute hook. */
  name: string;
  /** Resolved extension options. */
  options: Readonly<object>;
  /** Resolved extension storage. */
  storage: object;
  /** Resolved node and mark extensions available to global attributes. */
  extensions?: readonly QuireAnyExtension[];
}>;

/** Default metadata applied to Tiptap-compatible extension attributes. */
const defaultAttribute: Required<Omit<QuireExtensionAttributeSpec, "validate">> &
  Pick<QuireExtensionAttributeSpec, "validate"> = {
  default: null,
  rendered: true,
  renderHTML: null,
  parseHTML: null,
  keepOnSplit: true,
  splitValue: null,
  isRequired: false
};

/**
 * Gets all local and global attributes declared by resolved extensions.
 *
 * @param extensions - Resolved extensions to inspect.
 * @returns Attribute metadata keyed by owner type and attribute name.
 */
export function getAttributesFromExtensions(
  extensions: readonly QuireAnyExtension[]
): QuireExtensionAttribute[] {
  const extensionAttributes: QuireExtensionAttribute[] = [];
  const { nodeExtensions, markExtensions } = splitExtensions(extensions);
  const nodeAndMarkExtensions = [...nodeExtensions, ...markExtensions];
  const nodeExtensionTypes = nodeExtensions
    .filter((extension) => extension.name !== "text")
    .map((extension) => extension.name);
  const markExtensionTypes = markExtensions.map((extension) => extension.name);
  const allExtensionTypes = [...nodeExtensionTypes, ...markExtensionTypes];

  for (const extension of extensions) {
    const context = {
      name: extension.name,
      options: extension.options,
      storage: extension.storage,
      extensions: nodeAndMarkExtensions
    };
    const addGlobalAttributes = getExtensionField<
      () => readonly QuireSchemaAttributeContribution[] | undefined
    >(extension, "addGlobalAttributes", context);

    if (!addGlobalAttributes) {
      continue;
    }

    for (const contribution of addGlobalAttributes() ?? []) {
      const resolvedTypes = resolveAttributeTypes(
        contribution.types,
        nodeExtensionTypes,
        markExtensionTypes,
        allExtensionTypes
      );

      for (const type of resolvedTypes) {
        pushAttributeEntries(extensionAttributes, type, contribution.attributes);
      }
    }
  }

  for (const extension of nodeAndMarkExtensions) {
    const context = {
      name: extension.name,
      options: extension.options,
      storage: extension.storage
    };
    const addAttributes = getExtensionField<
      () => QuireSchemaAttributeMap | undefined
    >(extension, "addAttributes", context);

    if (!addAttributes) {
      continue;
    }

    pushAttributeEntries(extensionAttributes, extension.name, addAttributes() ?? {});
  }

  return extensionAttributes;
}

/**
 * Resolves global attribute shorthand selectors to concrete type names.
 *
 * @param types - Attribute target selector.
 * @param nodeTypes - Available node type names.
 * @param markTypes - Available mark type names.
 * @param allTypes - Available node and mark type names.
 * @returns Concrete target type names.
 */
function resolveAttributeTypes(
  types: QuireSchemaAttributeTypes,
  nodeTypes: readonly string[],
  markTypes: readonly string[],
  allTypes: readonly string[]
): readonly string[] {
  if (Array.isArray(types)) {
    return types;
  }

  if (types === "*") {
    return allTypes;
  }

  if (types === "nodes") {
    return nodeTypes;
  }

  if (types === "marks") {
    return markTypes;
  }

  return [];
}

/**
 * Pushes attribute map entries into the resolved extension attribute list.
 *
 * @param target - Mutable output list.
 * @param type - Node or mark type that owns the attributes.
 * @param attributes - Attribute specs keyed by attribute name.
 */
function pushAttributeEntries(
  target: QuireExtensionAttribute[],
  type: string,
  attributes: QuireSchemaAttributeMap
): void {
  for (const [name, attribute] of Object.entries(attributes)) {
    const resolved = {
      ...defaultAttribute,
      ...attribute
    };

    if (typeof resolved.default === "function") {
      resolved.default = resolved.default();
    }

    if (resolved.isRequired && resolved.default === undefined) {
      delete resolved.default;
    }

    target.push({
      type,
      name,
      attribute: resolved
    });
  }
}
