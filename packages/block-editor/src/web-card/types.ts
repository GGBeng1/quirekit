/** Presentations shared by ordinary inline links and rich web blocks. */
export type BlockWebLinkView = "link" | "title" | "card" | "preview";

/** Portable web metadata retained across presentation changes. */
export interface BlockWebLinkMetadata {
  /** Exact destination owning this metadata. */ readonly url: string;
  /** Authored or host-resolved webpage title. */ readonly title: string;
  /** Optional short summary. */ readonly description: string;
  /** Optional site icon from the metadata provider. */ readonly icon: string;
  /** Optional cover image from the metadata provider. */ readonly cover: string;
  /** Authored preview height in CSS pixels. */ readonly height: number;
}
