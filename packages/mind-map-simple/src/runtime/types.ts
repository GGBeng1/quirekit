/** Input state owned by one mounted instance. */
export interface MindMapInputBinding {
  /** @returns Whether the surface currently has an unfinished composition. */
  isComposing(): boolean;
  /** Removes all adapter-owned input listeners. */
  dispose(): void;
}
