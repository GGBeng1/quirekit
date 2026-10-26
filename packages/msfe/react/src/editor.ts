import { createElement, Fragment, useEffect, useRef, useState, type RefObject } from "react";
import { createMsfeEditor, createComponentHost, type MsfeEditor, type MsfeComponentHost } from "@quirekit/msfe-core";
import { ReactNodeViewHost } from "./host";
import type { ReactEditorOptions, ReactEditorContentProps } from "./types";

/**
 * Allocates an editor and store for each effect lifetime, including StrictMode replay.
 * @param parent - React-owned mount. @param options - Initial configuration factory.
 * @param onReady - Optional mounted editor observer.
 * @returns Current session; ordinary React renders never reconstruct the editor.
 */
export function useMsfeEditor(parent: RefObject<HTMLElement | null>, options: () => ReactEditorOptions,
  onReady?: (editor: MsfeEditor) => void) {
  const initial = useRef({ options, onReady });
  const [session, setSession] = useState<{ editor: MsfeEditor; host: MsfeComponentHost } | null>(null);
  useEffect(() => {
    if (!parent.current) return;
    const host = createComponentHost("react");
    const editor = createMsfeEditor({ ...initial.current.options(), parent: parent.current, componentHost: host });
    setSession({ editor, host }); initial.current.onReady?.(editor);
    return () => { editor.destroy(); host.destroy(); };
  }, [parent]);
  return session;
}

/** @param props - Initial settings and mount attributes. @returns Editor and portals within the caller's provider tree. */
export function MsfeEditorContent(props: ReactEditorContentProps) {
  const parent = useRef<HTMLDivElement>(null);
  const session = useMsfeEditor(parent, () => props.options, props.onReady);
  return createElement(Fragment, null, createElement("div", { ref: parent, className: props.className, id: props.id }),
    session ? createElement(ReactNodeViewHost, { host: session.host }) : null);
}
