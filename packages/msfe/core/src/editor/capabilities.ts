import type { Transaction } from "@quirekit/cm-state";
import type { CompiledExtensions } from "../extensions/types";
import type { MsfeEditor } from "./types";
import { SourceAnchors } from "../ranges/anchors";
import { StateSubscriptions } from "../state/authoring/subscriptions";
import { querySource, selectedSources } from "../source/semantics/query";
import { TaskScope } from "../tasks/scope";

/** @param editor - Lazy canonical API. @param compiled - Semantic registry. @param report - Host error boundary.
 * @returns Instance capabilities and explicit commit/reset/disposal boundaries. */
export function editorCapabilities(editor: () => MsfeEditor, compiled: CompiledExtensions, report: (error: unknown) => void) {
  const anchors = new SourceAnchors(editor);
  const subscriptions = new StateSubscriptions(report);
  const scope = new TaskScope(report);
  let documentScope = scope.fork();
  const api: Pick<MsfeEditor, "scope" | "documentScope" | "captureAnchor" | "querySource" | "isActive" | "getAttributes" | "getState" | "subscribeState"> = {
    scope, get documentScope() { return documentScope; },
    captureAnchor: (range, policy) => { if (scope.disposed) throw new Error("destroyed"); return anchors.capture(range, policy); },
    querySource: (name, range) => querySource(editor().state, compiled.sources.get(name), range ? [range] : editor().state.selection.ranges),
    isActive(name, attrs) {
      const matches = selectedSources(api.querySource(name), editor().state.selection.ranges);
      return !!matches?.length && matches.every(match => Object.entries(attrs ?? {}).every(([key, value]) => Object.is(match.attrs[key], value)));
    },
    getAttributes(name) {
      const matches = selectedSources(api.querySource(name), editor().state.selection.ranges);
      if (!matches?.length) return null;
      const first = matches[0]!.attrs;
      return matches.every(match => Object.keys(match.attrs).length === Object.keys(first).length
        && Object.entries(first).every(([key, value]) => Object.is(match.attrs[key], value))) ? first : null;
    },
    getState: slot => slot.read(editor().state),
    subscribeState: subscription => scope.disposed ? () => {} : subscriptions.add(editor().state, subscription),
  };
  return { api,
    /** @param transactions - Accepted changes before any external callback. */
    map(transactions: readonly Transaction[]): void { anchors.map(transactions); },
    /** @param transaction - Ordered, accepted state snapshot. */
    publish(transaction: Transaction): void { subscriptions.publish(transaction.state); },
    /** Ends the old generation before publishing a new document. */
    reset(): void { anchors.clear(); documentScope.dispose(); documentScope = scope.fork(); },
    /** Notifies selectors after replacement, which does not create a CM transaction. */
    replaced(): void { subscriptions.publish(editor().state); },
    /** Releases tasks and observers before view teardown. */
    destroy(): void { anchors.clear(); subscriptions.clear(); scope.dispose(); },
  };
}
