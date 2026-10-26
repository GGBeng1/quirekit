declare module 'turndown' {
  /** Options used by the basic importer. */
  interface TurndownOptions {
    /** Heading syntax. */ headingStyle?: 'setext' | 'atx';
    /** Code block syntax. */ codeBlockStyle?: 'indented' | 'fenced';
    /** Bullet marker. */ bulletListMarker?: '-' | '+' | '*';
    /** Emphasis delimiter. */ emDelimiter?: '_' | '*';
  }
  /** HTML to Markdown converter. */
  export default class TurndownService {
    /** @param options - Output syntax. */
    constructor(options?: TurndownOptions);
    /** @param plugin - Rule set to install. @returns This converter. */
    use(plugin: (service: TurndownService) => void): this;
    /** @param name - Rule name. @param rule - Element filter and Markdown replacement. @returns This converter. */
    addRule(name: string, rule: { filter: (node: HTMLElement) => boolean; replacement: (content: string) => string }): this;
    /** @param html - HTML source. @returns Markdown. */
    turndown(html: string): string;
  }
}

declare module 'turndown-plugin-gfm' {
  /** Tables, strikethrough and task lists. */
  export const gfm: (service: import('turndown').default) => void;
}

declare module 'pdfmake' {
  /** In-memory files that font and image definitions refer to by name. */
  interface VirtualFileSystem {
    /** @param name - File name. @returns Whether it exists. */ existsSync(name: string): boolean;
    /** @param name - File name. @param content - File bytes. */ writeFileSync(name: string, content: Uint8Array): void;
  }
  /** One generated document. */
  interface OutputDocument {
    /** @returns The complete PDF bytes. */ getBuffer(): Promise<Uint8Array>;
  }
  /** Shared pdfmake instance. */
  interface PdfMake {
    /** In-memory files. */ readonly virtualfs: VirtualFileSystem;
    /** @param fonts - Families keyed by name, each mapping styles to virtual file names. */ addFonts(fonts: Record<string, Record<string, string>>): void;
    /** @param policy - Decides whether a remote URL may be fetched. */ setUrlAccessPolicy(policy: (url: string) => boolean): void;
    /** @param definition - Document definition. @returns The document. */ createPdf(definition: object): OutputDocument;
  }
  const pdfMake: PdfMake;
  export default pdfMake;
}
