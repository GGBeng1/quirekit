/** One public player renders either an audio recording or a video. */
export type QuireKitMediaKind = "audio" | "video";

/** Portable input for the shared audio/video player. */
export interface QuireKitMediaPlayerProps {
  /** Directly playable resource URL; storage and authentication belong to the host. */
  readonly src: string;
  /** Accessible, visible name of the recording. */
  readonly title: string;
  /** Audio uses a compact card; video also provides a picture and fullscreen. */
  readonly kind?: QuireKitMediaKind;
  /** Optional video artwork displayed before playback. */
  readonly poster?: string;
  /** Native preload policy; metadata does not start playback. */
  readonly preload?: "none" | "metadata" | "auto";
}

/** Playback observations; these are ephemeral and do not belong in document history. */
export interface QuireKitMediaPlaybackState {
  /** True only when the native element is playing. */
  playing: boolean;
  /** A play request has not completed yet. */
  pending: boolean;
  /** Playback is waiting for media data. */
  waiting: boolean;
  /** Native playback reached the end. */
  ended: boolean;
  /** Current time in seconds. */
  time: number;
  /** Finite duration in seconds, or zero when unknown. */
  duration: number;
  /** Effective volume, from zero to one. */
  volume: number;
  /** Native mute state, separate from volume. */
  muted: boolean;
  /** Current playback speed. */
  rate: number;
  /** Decoding/network failure or a browser-refused play request. */
  error: "load" | "blocked" | null;
}
