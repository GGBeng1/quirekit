import type { VersionRecord, VersionStore } from "@quirekit/edit-history";
import type { MdVersions } from "../../activity/versions";
import type { MdEditorLocale } from "../types";
import type { MdActivityTimelineProps } from "./types";

/** Inputs of the version list; listing comes from the host store, saving and restoring from the editor. */
export interface MdVersionListProps {
  /** Host version store. */
  readonly versions: VersionStore;
  /** Document whose versions are listed. */
  readonly documentId: string;
  /** @returns The editor's version controller, or null when `MdActivity` is not installed. */
  readonly controller: () => MdVersions | null;
  /** @returns Current editor source, compared with a previewed version. */
  readonly source: () => string;
  /** Control language. */
  readonly locale: MdEditorLocale;
}

/** Inputs of the version preview dialog. */
export interface MdVersionPreviewProps extends MdVersionListProps {
  /** Previewed version. */
  readonly record: VersionRecord;
  /** Dialog owner used for focus and placement. */
  readonly owner: HTMLElement;
}

/** Inputs of the activity panel content. */
export interface MdActivityViewProps {
  /** Activity timeline inputs. */
  readonly timeline: MdActivityTimelineProps;
  /** Version list inputs; omitted hides the version tab. */
  readonly versions?: MdVersionListProps | undefined;
}
