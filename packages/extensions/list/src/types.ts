/** Options for the bullet list node extension. */
export interface BulletListOptions {
  /** Node type name used for list item children. */
  readonly itemTypeName: string;
  /** HTML attributes added when the bullet list serializes to HTML. */
  readonly HTMLAttributes: Record<string, unknown>;
  /** Whether active marks are preserved when creating a list. */
  readonly keepMarks: boolean;
  /** Whether active text-style attributes are preserved when creating a list. */
  readonly keepAttributes: boolean;
}

/** Options for the ordered list node extension. */
export interface OrderedListOptions {
  /** Node type name used for list item children. */
  readonly itemTypeName: string;
  /** HTML attributes added when the ordered list serializes to HTML. */
  readonly HTMLAttributes: Record<string, unknown>;
  /** Whether active marks are preserved when creating a list. */
  readonly keepMarks: boolean;
  /** Whether active text-style attributes are preserved when creating a list. */
  readonly keepAttributes: boolean;
}

/** Options for the list item node extension. */
export interface ListItemOptions {
  /** HTML attributes added when the list item serializes to HTML. */
  readonly HTMLAttributes: Record<string, unknown>;
  /** Node type name used for bullet list parents. */
  readonly bulletListTypeName: string;
  /** Node type name used for ordered list parents. */
  readonly orderedListTypeName: string;
}

/** List keymap node family configuration. */
export interface ListKeymapTypeConfig {
  /** Node type name used by list items. */
  readonly itemName: string;
  /** Wrapper node type names that can contain this list item type. */
  readonly wrapperNames: readonly string[];
}

/** Options for the list keymap extension. */
export interface ListKeymapOptions {
  /** List node families handled by Backspace and Delete shortcuts. */
  readonly listTypes: readonly ListKeymapTypeConfig[];
}

/** Options for the combined list extension kit. */
export interface ListKitOptions {
  /** Bullet list options, or false to omit the extension. */
  readonly bulletList: Partial<BulletListOptions> | false;
  /** List item options, or false to omit the extension. */
  readonly listItem: Partial<ListItemOptions> | false;
  /** List keymap options, or false to omit the extension. */
  readonly listKeymap: Partial<ListKeymapOptions> | false;
  /** Ordered list options, or false to omit the extension. */
  readonly orderedList: Partial<OrderedListOptions> | false;
}
