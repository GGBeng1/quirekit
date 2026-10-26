/**
 * Export specifiers the install check does not load in Node, each with the reason. These
 * entries still get their tarball files and declarations checked; only the runtime import
 * is skipped. Keep the list minimal: an entry that loads in Node must not be listed.
 * @type {Record<string, string>}
 */
export const runtimeSkips = {
  "@quirekit/proofing-hunspell/worker": "Web Worker entry; reads the worker global `self` at load time.",
  "@quirekit/view/layout-worker": "Web Worker entry; reads the worker global `self` at load time."
};

/**
 * pnpm `packageExtensions` for third-party packages that import modules they do not declare.
 * The consumer disables hoisting so QuireKit's own undeclared imports fail; these entries
 * restore only the third-party edges that default hoisting would satisfy for real users.
 * @type {Record<string, { peerDependencies: Record<string, string> }>}
 */
export const thirdPartyExtensions = {
  // The font package's mjs build imports @mathjax/src without declaring it.
  "@mathjax/mathjax-newcm-font": { peerDependencies: { "@mathjax/src": "*" } }
};
