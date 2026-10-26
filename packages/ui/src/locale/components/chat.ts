/** Display states shared by messages, parts, tools and processes. */
export interface StatusMessages {
  /** Message waiting for a reply. */
  readonly pending: string;
  /** Message or reasoning still being received. */
  readonly streaming: string;
  /** Part finished. */
  readonly complete: string;
  /** Generation stopped with partial content kept. */
  readonly stopped: string;
  /** Generation failed. */
  readonly error: string;
  /** Tool queued. */
  readonly queued: string;
  /** Tool running. */
  readonly running: string;
  /** Tool waiting for outside input. */
  readonly waiting: string;
  /** Tool succeeded. */
  readonly succeeded: string;
  /** Tool failed. */
  readonly failed: string;
  /** Tool cancelled. */
  readonly cancelled: string;
}

/** Composer, ComposerInput, ComposerSubmit and RichInput text. */
export interface ComposerMessages {
  /** Default accessible name of the input. */
  readonly label: string;
  /** Default empty-draft hint. */
  readonly placeholder: string;
  /** Send action. */
  readonly submit: string;
  /** Stop action. */
  readonly stop: string;
  /** Accessible name of the mention and command suggestion list. */
  readonly candidates: string;
}

/** Message, MessageActions and MessageBranch text. */
export interface MessageMessages {
  /** Copy action of a reply. */
  readonly copy: string;
  /** Copy succeeded. */
  readonly copied: string;
  /** Copy failed. */
  readonly copyError: string;
  /** Overflow action menu. */
  readonly more: string;
  /** Previous branch action. */
  readonly previousBranch: string;
  /** Next branch action. */
  readonly nextBranch: string;
  /** Selected branch is missing. */
  readonly branchUnavailable: string;
  /** Position of the selected branch, 1-based. */
  readonly branchPosition: (current: number, total: number) => string;
}

/** MessagePart fallbacks. */
export interface PartMessages {
  /** Markdown shown as source because no renderer is configured. */
  readonly markdownFallback: string;
  /** Part kind that has no presentation. */
  readonly unsupported: string;
}

/** Reasoning text. */
export interface ReasoningMessages {
  /** Default disclosure title. */
  readonly title: string;
}

/** Tool text. */
export interface ToolMessages {
  /** Accessible name of the tool input. */
  readonly input: string;
  /** Accessible name of the tool output. */
  readonly output: string;
  /** No input or output to show yet. */
  readonly empty: string;
}

/** MessageList text. */
export interface ListMessages {
  /** Default accessible name of the scroll area. */
  readonly label: string;
  /** Load older messages. */
  readonly loadOlder: string;
  /** Jump back to the latest message. */
  readonly latest: string;
  /** No messages yet. */
  readonly empty: string;
}

/** Confirmation text. */
export interface ConfirmationMessages {
  /** Approve action. */
  readonly approve: string;
  /** Reject action. */
  readonly reject: string;
  /** Waiting for a decision. */
  readonly pending: string;
  /** Decision being submitted. */
  readonly submitting: string;
  /** Request approved. */
  readonly approved: string;
  /** Request rejected. */
  readonly rejected: string;
  /** Request expired. */
  readonly expired: string;
  /** Submission failed without a host-supplied reason. */
  readonly failed: string;
}

/** Question text. */
export interface QuestionMessages {
  /** Open the host-owned answer surface. */
  readonly open: string;
  /** Submit action. */
  readonly submit: string;
  /** Answers being submitted. */
  readonly submitting: string;
  /** Request answered. */
  readonly answered: string;
  /** Request expired. */
  readonly expired: string;
  /** Required question left empty. */
  readonly required: string;
  /** Optional question left empty, in the answer summary. */
  readonly unanswered: string;
  /** Selected custom option without text. */
  readonly customRequired: string;
  /** Default hint of the custom answer field. */
  readonly customPlaceholder: string;
  /** Reveal completed answers. */
  readonly showAnswers: string;
  /** Collapse completed answers. */
  readonly hideAnswers: string;
  /** Submission failed without a host-supplied reason. */
  readonly failed: string;
  /** Position of a question within the request, 1-based. */
  readonly position: (current: number, total: number) => string;
}

/** Chat interface text, grouped by sub-component. */
export interface Messages {
  /** Shared display states. */
  readonly status: StatusMessages;
  /** Input and send controls. */
  readonly composer: ComposerMessages;
  /** Message footer, copy and branch navigation. */
  readonly message: MessageMessages;
  /** Part fallbacks. */
  readonly part: PartMessages;
  /** Reasoning disclosure. */
  readonly reasoning: ReasoningMessages;
  /** Tool disclosure. */
  readonly tool: ToolMessages;
  /** Message list. */
  readonly list: ListMessages;
  /** Approval request. */
  readonly confirmation: {
    /** Authorizing a tool or action to run. */
    readonly permission: ConfirmationMessages;
    /** Reviewing proposed content changes. */
    readonly review: ConfirmationMessages;
  };
  /** Question request. */
  readonly question: QuestionMessages;
}

/** Simplified Chinese. */
export const zhCN: Messages = {
  status: {
    pending: "正在等待回复", streaming: "正在生成", complete: "已完成", stopped: "已停止生成", error: "生成失败",
    queued: "等待执行", running: "执行中", waiting: "等待确认", succeeded: "已完成", failed: "执行失败", cancelled: "已取消"
  },
  composer: { label: "消息", placeholder: "输入消息…", submit: "发送", stop: "停止", candidates: "输入候选" },
  message: {
    copy: "复制回复", copied: "已复制", copyError: "复制失败，请重试或手动复制", more: "更多操作",
    previousBranch: "上一个版本", nextBranch: "下一个版本", branchUnavailable: "分支不可用",
    branchPosition: (current, total) => `${current} / ${total}`
  },
  part: { markdownFallback: "未配置 Markdown renderer，暂以源文本显示", unsupported: "暂不支持此内容类型" },
  reasoning: { title: "思考过程" },
  tool: { input: "输入", output: "输出", empty: "暂无可展示的详情" },
  list: { label: "消息列表", loadOlder: "加载更早消息", latest: "回到最新", empty: "暂无消息" },
  confirmation: {
    permission: {
      approve: "允许", reject: "拒绝", pending: "等待确认", submitting: "正在提交",
      approved: "已允许", rejected: "已拒绝", expired: "请求已过期", failed: "提交失败，可重试"
    },
    review: {
      approve: "批准", reject: "拒绝", pending: "等待确认", submitting: "正在提交",
      approved: "已批准", rejected: "已拒绝", expired: "已失效", failed: "提交失败，可重试"
    }
  },
  question: {
    open: "回答问题", submit: "提交回答", submitting: "正在提交", answered: "已回答", expired: "问题已过期",
    required: "请回答这一项", unanswered: "未回答", customRequired: "请填写自定义回答", customPlaceholder: "输入你的回答…",
    showAnswers: "查看回答", hideAnswers: "收起回答", failed: "提交失败，回答已保留",
    position: (current, total) => `${current} / ${total}`
  }
};

/** English. */
export const en: Messages = {
  status: {
    pending: "Waiting for a reply", streaming: "Generating", complete: "Done", stopped: "Generation stopped", error: "Generation failed",
    queued: "Queued", running: "Running", waiting: "Awaiting confirmation", succeeded: "Done", failed: "Failed", cancelled: "Cancelled"
  },
  composer: { label: "Message", placeholder: "Type a message…", submit: "Send", stop: "Stop", candidates: "Suggestions" },
  message: {
    copy: "Copy reply", copied: "Copied", copyError: "Copy failed. Try again or copy manually.", more: "More actions",
    previousBranch: "Previous version", nextBranch: "Next version", branchUnavailable: "Version unavailable",
    branchPosition: (current, total) => `${current} / ${total}`
  },
  part: { markdownFallback: "No Markdown renderer configured; showing source text", unsupported: "This content type is not supported" },
  reasoning: { title: "Reasoning" },
  tool: { input: "Input", output: "Output", empty: "No details to show yet" },
  list: { label: "Messages", loadOlder: "Load earlier messages", latest: "Jump to latest", empty: "No messages yet" },
  confirmation: {
    permission: {
      approve: "Allow", reject: "Deny", pending: "Awaiting confirmation", submitting: "Submitting",
      approved: "Allowed", rejected: "Denied", expired: "Request expired", failed: "Submission failed. You can retry."
    },
    review: {
      approve: "Approve", reject: "Reject", pending: "Awaiting review", submitting: "Submitting",
      approved: "Approved", rejected: "Rejected", expired: "Expired", failed: "Failed. Try again."
    }
  },
  question: {
    open: "Answer", submit: "Submit answers", submitting: "Submitting", answered: "Answered", expired: "Question expired",
    required: "Please answer this question", unanswered: "Not answered", customRequired: "Please enter your own answer",
    customPlaceholder: "Type your answer…", showAnswers: "Show answers", hideAnswers: "Hide answers",
    failed: "Submission failed. Your answers are kept.",
    position: (current, total) => `${current} of ${total}`
  }
};
