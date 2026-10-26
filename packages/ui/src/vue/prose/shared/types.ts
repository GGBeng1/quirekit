/** Optional Vue props become absent when forwarding to components with their own defaults. */
export type DefinedProseProps<T extends object> = {
  [Key in keyof T as undefined extends T[Key] ? never : Key]: T[Key];
} & {
  [Key in keyof T as undefined extends T[Key] ? Key : never]?: Exclude<T[Key], undefined>;
};
