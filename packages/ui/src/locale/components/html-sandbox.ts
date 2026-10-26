/** Localized text of the HTML sandbox component. */
export interface Messages {
  /** HTML preview. */ readonly title: string;
  /** Run. */ readonly run: string;
  /** Run again. */ readonly rerun: string;
  /** Stop. */ readonly stop: string;
  /** Logs. */ readonly logs: string;
  /** Interact. */ readonly enter: string;
  /** Leave interaction. */ readonly leave: string;
  /** Waiting for complete source. */ readonly incomplete: string;
  /** Execution disabled. */ readonly disabled: string;
  /** Source changed; showing previous run. */ readonly dirty: string;
  /** Run to preview. */ readonly idle: string;
  /** Starting. */ readonly starting: string;
  /** Running. */ readonly running: string;
  /** Stopped. */ readonly stopped: string;
  /** Failed; see logs. */ readonly failed: string;
  /** Disposed. */ readonly disposed: string;
}
/** Simplified Chinese. */
export const zhCN: Messages = {
  "title": "HTML 预览",
  "run": "运行",
  "rerun": "重新运行",
  "stop": "停止",
  "logs": "运行日志",
  "enter": "进入交互",
  "leave": "退出交互",
  "incomplete": "等待内容完整",
  "disabled": "运行已禁用",
  "dirty": "源码已更新，当前显示上次运行",
  "idle": "点击运行以预览",
  "starting": "正在启动",
  "running": "运行中",
  "stopped": "已停止",
  "failed": "运行失败，请查看日志",
  "disposed": "已释放"
};
/** English. */
export const en: Messages = {
  "title": "HTML preview",
  "run": "Run",
  "rerun": "Run again",
  "stop": "Stop",
  "logs": "Logs",
  "enter": "Interact",
  "leave": "Leave interaction",
  "incomplete": "Waiting for complete source",
  "disabled": "Execution disabled",
  "dirty": "Source changed; showing previous run",
  "idle": "Run to preview",
  "starting": "Starting",
  "running": "Running",
  "stopped": "Stopped",
  "failed": "Failed; see logs",
  "disposed": "Disposed"
};
