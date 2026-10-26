/** Host-injected frame scheduling pair carried by mounted runtime options. */
export interface MountedUpdateFrameSource {
  /** Schedules one update frame. */
  readonly requestUpdateFrame?: ((callback: () => void) => number) | undefined;
  /** Cancels a frame scheduled by `requestUpdateFrame`. */
  readonly cancelUpdateFrame?: ((handle: number) => void) | undefined;
}

/**
 * Projects a host frame pair onto consumer option keys; a half-injected pair is ignored.
 *
 * @param source - Mounted runtime options that may inject frame scheduling.
 * @param requestKey - Consumer key receiving the request function.
 * @param cancelKey - Consumer key receiving the cancel function.
 * @returns Both functions under the requested keys, or an empty object.
 */
export function pickMountedUpdateFrames<Request extends string, Cancel extends string>(
  source: MountedUpdateFrameSource | undefined,
  requestKey: Request,
  cancelKey: Cancel
): Partial<Record<Request, (callback: () => void) => number> & Record<Cancel, (handle: number) => void>> {
  if (source?.requestUpdateFrame === undefined || source.cancelUpdateFrame === undefined) return {};
  return { [requestKey]: source.requestUpdateFrame, [cancelKey]: source.cancelUpdateFrame } as
    Record<Request, (callback: () => void) => number> & Record<Cancel, (handle: number) => void>;
}
