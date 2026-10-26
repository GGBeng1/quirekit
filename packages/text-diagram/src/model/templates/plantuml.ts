import type { TextDiagramTemplate } from "../../types";

/** @param locale - New template language. @returns PlantUML templates that need no external libraries. */
export function plantumlTemplates(locale: string): readonly TextDiagramTemplate[] {
  const english = /^en(?:-|$)/iu.test(locale);
  /** @param zh - Chinese label. @param en - English label. @returns Localized source text. */
  const t = (zh: string, en: string): string => english ? en : zh;
  return [
    { id: "plantuml-sequence", label: t("时序图", "Sequence"), language: "plantuml", source: `@startuml
participant "${t("客户端", "Client")}" as A
participant "${t("服务端", "Service")}" as B
A -> B: ${t("请求", "Request")}
B --> A: ${t("响应", "Response")}
@enduml` },
    { id: "plantuml-class", label: t("类图", "Class diagram"), language: "plantuml", source: `@startuml
class Document {
  +title: String
  +save()
}
class Section {
  +name: String
}
Document "1" *-- "many" Section
@enduml` },
    { id: "plantuml-activity", label: t("活动图", "Activity"), language: "plantuml", source: `@startuml
start
:${t("创建草稿", "Create draft")};
if (${t("审阅通过？", "Approved?")}) then (${t("是", "yes")})
  :${t("发布文档", "Publish document")};
else (${t("否", "no")})
  :${t("修改内容", "Revise content")};
endif
stop
@enduml` },
    { id: "plantuml-usecase", label: t("用例图", "Use case"), language: "plantuml", source: `@startuml
left to right direction
actor "${t("作者", "Author")}" as Author
actor "${t("审阅者", "Reviewer")}" as Reviewer
rectangle "${t("文档系统", "Document system")}" {
  usecase "${t("编辑文档", "Edit document")}" as Edit
  usecase "${t("提交审阅", "Submit for review")}" as Submit
  usecase "${t("审核文档", "Review document")}" as Review
}
Author --> Edit
Author --> Submit
Reviewer --> Review
Submit ..> Review : <<include>>
@enduml` },
    { id: "plantuml-component", label: t("组件图", "Component"), language: "plantuml", source: `@startuml
left to right direction
package "${t("客户端", "Client")}" {
  [${t("编辑器", "Editor")}] as Editor
  [${t("预览器", "Preview")}] as Preview
}
package "${t("服务端", "Server")}" {
  [${t("文档服务", "Document service")}] as Service
  database "${t("文档库", "Documents")}" as Store
}
Editor --> Service : HTTPS
Preview --> Service : HTTPS
Service --> Store : SQL
@enduml` },
    { id: "plantuml-state", label: t("状态图", "State diagram"), language: "plantuml", source: `@startuml
state "${t("草稿", "Draft")}" as Draft
state "${t("审阅中", "In review")}" as Review
state "${t("已发布", "Published")}" as Published
[*] --> Draft
Draft --> Review : ${t("提交", "Submit")}
Review --> Draft : ${t("退回", "Revise")}
Review --> Published : ${t("通过", "Approve")}
Published --> [*]
@enduml` },
    { id: "plantuml-deployment", label: t("部署图", "Deployment"), language: "plantuml", source: `@startuml
left to right direction
node "${t("用户设备", "User device")}" {
  artifact "${t("浏览器", "Browser")}" as Browser
}
node "${t("应用服务器", "Application server")}" {
  component "${t("文档 API", "Document API")}" as API
}
node "${t("数据服务器", "Data server")}" {
  database "PostgreSQL" as DB
}
Browser --> API : HTTPS
API --> DB : SQL
@enduml` },
    { id: "plantuml-object", label: t("对象图", "Object diagram"), language: "plantuml", source: `@startuml
object "document: Document" as Doc {
  title = "${t("项目计划", "Project plan")}"
  status = "${t("草稿", "Draft")}"
}
object "intro: Section" as Intro {
  name = "${t("项目概览", "Overview")}"
}
object "schedule: Section" as Schedule {
  name = "${t("实施计划", "Schedule")}"
}
Doc *-- Intro
Doc *-- Schedule
@enduml` },
    { id: "plantuml-er", label: t("实体关系图", "Entity relationship"), language: "plantuml", source: `@startuml
entity "${t("用户", "User")}" as User {
  * id : integer <<PK>>
  --
  * name : varchar
}
entity "${t("文档", "Document")}" as Document {
  * id : integer <<PK>>
  --
  * owner_id : integer <<FK>>
  title : varchar
}
User ||--o{ Document : ${t("创建", "creates")}
@enduml` },
    { id: "plantuml-mind", label: t("思维导图", "Mind map"), language: "plantuml", source: `@startmindmap
* ${t("项目", "Project")}
** ${t("设计", "Design")}
*** ${t("需求", "Requirements")}
*** ${t("原型", "Prototype")}
** ${t("开发", "Development")}
*** ${t("客户端", "Client")}
*** ${t("服务端", "Server")}
** ${t("测试", "Testing")}
@endmindmap` },
    { id: "plantuml-wbs", label: t("工作分解图", "Work breakdown"), language: "plantuml", source: `@startwbs
* ${t("文档产品", "Document product")}
** ${t("编辑能力", "Editing")}
*** ${t("文本编辑", "Text editing")}
*** ${t("图形编辑", "Diagram editing")}
** ${t("交付能力", "Delivery")}
*** ${t("导入导出", "Import and export")}
*** ${t("质量验证", "Quality checks")}
@endwbs` },
  ];
}
