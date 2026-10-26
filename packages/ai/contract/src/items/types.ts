/** One feature-owned internal item; it is not a document block or an executable tool. */
export interface QuireAiBlockItem {
  /** Stable native identity used by described editing commands. */ readonly id: string;
  /** Full searchable text; core bounds its presentation when rendering. */ readonly label?: string | undefined;
  /** Small semantic scalar facts; exclude binary data and serialized scenes. */ readonly properties?: Readonly<Record<string, string | number | boolean | null>> | undefined;
}
