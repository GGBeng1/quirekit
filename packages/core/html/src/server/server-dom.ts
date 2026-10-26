import { Window } from "happy-dom";
import type { QuireHTMLDocumentScope } from "../types";

/**
 * Creates an isolated DOM document for server-side HTML parsing and
 * serialization.
 *
 * @returns Disposable DOM document scope.
 */
export function createServerDocumentScope(): QuireHTMLDocumentScope {
  const localWindow = new Window({
    settings: {
      disableJavaScriptEvaluation: true,
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true,
      disableIframePageLoading: true,
      disableComputedStyleRendering: true
    }
  });

  return {
    document: localWindow.document as unknown as Document,
    dispose() {
      localWindow.happyDOM.abort();
      localWindow.happyDOM.close();
    }
  };
}

/**
 * Ensures the server helper is used in Node or a Node-like test runtime.
 */
export function assertNodeRuntime(): void {
  const versions = globalThis.process?.versions;

  if (!versions?.node) {
    throw new Error(
      "[quirekit error]: @quirekit/html/server helpers require a Node environment. Use @quirekit/html in browsers."
    );
  }
}
