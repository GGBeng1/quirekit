/** Shared player interface text; recording names remain host content. */
export interface Messages {
  /** Start playback. */ readonly play: string;
  /** Pause or cancel requested playback. */ readonly pause: string;
  /** Start again after the end. */ readonly replay: string;
  /** Seek slider accessible name. */ readonly seek: string;
  /** Volume popover and slider. */ readonly volume: string;
  /** Mute action. */ readonly mute: string;
  /** Restore audible playback. */ readonly unmute: string;
  /** Speed selection. */ readonly speed: string;
  /** Enter fullscreen. */ readonly fullscreen: string;
  /** Exit fullscreen. */ readonly exitFullscreen: string;
  /** Fullscreen request rejected. */ readonly fullscreenFailed: string;
  /** Pending playback or buffering. */ readonly loading: string;
  /** Network or decoding failure. */ readonly failed: string;
  /** Browser refused a play request. */ readonly blocked: string;
  /** Reload the resource. */ readonly retry: string;
}
/** Simplified Chinese. */
export const zhCN: Messages = {
  play: "播放", pause: "暂停", replay: "重新播放", seek: "播放进度", volume: "音量", mute: "静音", unmute: "取消静音",
  speed: "播放速度", fullscreen: "全屏", exitFullscreen: "退出全屏", fullscreenFailed: "暂时无法进入全屏，请重试。",
  loading: "正在缓冲…", failed: "无法播放此文件，请检查文件或网络连接。", blocked: "浏览器阻止了播放，请再次点击播放。", retry: "重新加载"
};
/** English. */
export const en: Messages = {
  play: "Play", pause: "Pause", replay: "Replay", seek: "Playback position", volume: "Volume", mute: "Mute", unmute: "Unmute",
  speed: "Playback speed", fullscreen: "Fullscreen", exitFullscreen: "Exit fullscreen", fullscreenFailed: "Fullscreen is unavailable. Please try again.",
  loading: "Buffering…", failed: "Unable to play this file. Check the file or connection.", blocked: "Playback was blocked. Please press Play again.", retry: "Reload"
};
