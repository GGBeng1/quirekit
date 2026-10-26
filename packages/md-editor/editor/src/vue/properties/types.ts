import type { DocumentPropertiesProps, DocumentProperty } from "@quirekit/msfe-markdown-extras";

/** Vue adapter inputs, passed by VueComponentViewRenderer. */
export interface MdDocumentPropertiesProps {
  /** Canonical feature renderer contract. */ readonly view: DocumentPropertiesProps;
}

/** One property row; the feature owns persistence and stale-form validation. */
export interface MdDocumentPropertyRowProps extends MdDocumentPropertiesProps {
  /** Entry from the same accepted snapshot as view. */ readonly entry: DocumentProperty;
}

/** Read-only typed value preview with bounded default content. */
export interface MdDocumentPropertyValueProps {
  /** Accepted source value. */ readonly entry: DocumentProperty;
  /** Whether the complete value is visible. */ readonly expanded: boolean;
  /** Active control language. */ readonly english: boolean;
}

/** One compact field action sharing its accessible label with the tooltip. */
export interface MdDocumentPropertyActionProps {
  /** Localized accessible action. */ readonly label: string;
  /** Public icon registry key. */ readonly icon: string;
  /** Whether this commits the current draft. */ readonly primary?: boolean;
}
