import type { TextDiagramTemplate } from "../../types";

/** @param locale - New template language. @returns Common Mermaid diagrams with editable source. */
export function mermaidTemplates(locale: string): readonly TextDiagramTemplate[] {
  const english = /^en(?:-|$)/iu.test(locale);
  /** @param zh - Chinese label. @param en - English label. @returns Localized source text. */
  const t = (zh: string, en: string): string => english ? en : zh;
  const start = t("开始", "Start"), review = t("审阅", "Review"), done = t("发布", "Publish");
  return [
    { id: "mermaid-flow", label: t("流程图", "Flowchart"), language: "mermaid", source: `flowchart LR
  A[${start}] --> B{${review}}
  B -->|${t("通过", "Pass")}| C[${done}]
  B -->|${t("修改", "Revise")}| A` },
    { id: "mermaid-sequence", label: t("时序图", "Sequence"), language: "mermaid", source: `sequenceDiagram
  participant A as ${t("客户端", "Client")}
  participant B as ${t("服务端", "Service")}
  A->>B: ${t("请求", "Request")}
  B-->>A: ${t("响应", "Response")}` },
    { id: "mermaid-mind", label: t("思维导图", "Mind map"), language: "mermaid", source: `mindmap
  root((${t("项目", "Project")}))
    ${t("设计", "Design")}
    ${t("开发", "Build")}
    ${t("测试", "Test")}` },
    { id: "mermaid-class", label: t("类图", "Class diagram"), language: "mermaid", source: `classDiagram
  class Document {
    +String title
    +save()
  }
  class Section {
    +String name
  }
  Document "1" *-- "1..*" Section : ${t("包含", "contains")}` },
    { id: "mermaid-state", label: t("状态图", "State diagram"), language: "mermaid", source: `stateDiagram-v2
  state "${t("草稿", "Draft")}" as Draft
  state "${t("审阅中", "In review")}" as Review
  state "${t("已发布", "Published")}" as Published
  [*] --> Draft
  Draft --> Review : ${t("提交", "Submit")}
  Review --> Draft : ${t("退回", "Revise")}
  Review --> Published : ${t("通过", "Approve")}
  Published --> [*]` },
    { id: "mermaid-er", label: t("实体关系图", "Entity relationship"), language: "mermaid", source: `erDiagram
  USER ||--o{ DOCUMENT : ${t("创建", "creates")}
  DOCUMENT ||--|{ SECTION : ${t("包含", "contains")}
  USER {
    int id PK
    string name "${t("用户名", "User name")}"
  }
  DOCUMENT {
    int id PK
    int owner_id FK
    string title "${t("文档标题", "Document title")}"
  }
  SECTION {
    int id PK
    int document_id FK
  }` },
    { id: "mermaid-gantt", label: t("甘特图", "Gantt chart"), language: "mermaid", source: `gantt
  title ${t("项目计划", "Project plan")}
  dateFormat YYYY-MM-DD
  axisFormat %m-%d
  todayMarker off
  section ${t("设计", "Design")}
  ${t("需求确认", "Requirements")} :done, requirements, 2026-01-05, 3d
  ${t("原型设计", "Prototype")} :active, design, after requirements, 4d
  section ${t("交付", "Delivery")}
  ${t("开发实现", "Implementation")} :build, after design, 5d
  ${t("验收测试", "Acceptance")} :test, after build, 3d` },
    { id: "mermaid-pie", label: t("饼图", "Pie chart"), language: "mermaid", source: `pie showData
  title ${t("工作量分配", "Work allocation")}
  "${t("设计", "Design")}" : 25
  "${t("开发", "Development")}" : 50
  "${t("测试", "Testing")}" : 25` },
    { id: "mermaid-journey", label: t("用户旅程", "User journey"), language: "mermaid", source: `journey
  title ${t("文档协作旅程", "Document collaboration journey")}
  section ${t("创作", "Authoring")}
    ${t("创建草稿", "Create draft")}: 5: ${t("作者", "Author")}
    ${t("补充内容", "Add content")}: 4: ${t("作者", "Author")}
  section ${t("协作", "Collaboration")}
    ${t("评审反馈", "Review feedback")}: 3: ${t("作者", "Author")}, ${t("审阅者", "Reviewer")}
    ${t("确认发布", "Approve release")}: 5: ${t("审阅者", "Reviewer")}` },
    { id: "mermaid-git", label: t("Git 分支图", "Git graph"), language: "mermaid", source: `gitGraph
  commit id: "${t("初始化", "Initial")}"
  branch feature
  checkout feature
  commit id: "${t("功能开发", "Feature")}"
  commit id: "${t("测试", "Tests")}"
  checkout main
  merge feature id: "${t("合并发布", "Release")}"` },
  ];
}
