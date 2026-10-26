# Ark Vue 5.39.1 Presence 事件声明补丁

`../@ark-ui__vue@5.39.1.patch` 只为 Ark 已经发送的 `enterComplete` 事件补齐 Root 声明，避免 Vue 开发模式报告未声明事件。运行时状态机、Presence 回调、RootProvider 与 Quire 组件 API 保持原有行为。

## 范围与安装

`pnpm-workspace.yaml` 以精确键 `@ark-ui/vue@5.39.1` 登记补丁，`pnpm-lock.yaml` 保存同一补丁路径与内容 hash。正常 frozen 安装会应用它；不配置忽略补丁不匹配或应用失败的选项。

补丁覆盖以下 12 个 family 的 72 个发布文件：color-picker、combobox、date-picker、dialog、drawer、floating-panel、hover-card、menu、popover、select、tooltip、tour。

每个 family 仅更新：

- Root 的 ESM/CJS runtime emits 数组。
- RootEmits 的 `.d.ts` / `.d.cts` 事件 tuple。
- Root 生成声明的事件签名及 `onEnterComplete` listener props。Combobox/Select 保留原有泛型签名。

原始问题在 [Ark 5.39.1](https://github.com/chakra-ui/ark/releases/tag/@ark-ui/vue@5.39.1) 的 Root 声明中存在。上游修复并发布新版本后，先验证这些回归，再删除旧版本补丁与登记；不要把同一补丁键放宽到未来版本。

## 可重复验证

从仓库根目录，使用 `.nvmrc` 指定的 Node 22：

```sh
pnpm exec vitest run --config patches/ark-ui-vue/vitest.config.ts
pnpm exec tsc -p patches/ark-ui-vue/tsconfig.json
pnpm --filter @quirekit/ui typecheck
pnpm --filter @quirekit/ui test
```

`metadata.test.ts` 直接加载已安装包的 ESM/CJS 入口，检查 12 个 Root 的两项完成事件各声明一次。`types.mts` 与 `types.cts` 分别检查发布的 ESM/CJS 声明入口，以及 RootEmits、生成的 listener props。Drawer 的上游入口没有导出 `DrawerRootEmits`，该 family 的 tuple 检查使用其原有发布类型文件；补丁没有扩大它的出口。

`presence.test.ts` 直接挂载 Ark Menu，不经过 Quire wrapper。它覆盖 retained/unmountOnExit，以及有动画、无动画、0s 动画三种路径；第一次状态转换后继续完成两轮进入/退出，检查回调不会因重复完成事件而重复发送，内容能正确隐藏/卸载，Vue 没有产生告警。诊断 spy 保留 console 的真实输出，没有日志过滤或空事件监听器。

有动画用例显式发送 `AnimationEvent`，用于验证 Presence 监听生命周期；0s 用例覆盖减少动效策略的样式结果。这些测试不代替浏览器对 CSS 动画、`prefers-reduced-motion` 或辅助技术的实际验收。上游对初始挂载的事件策略保持原样。

## 发布边界

`@quirekit/ui` 将 Ark 作为 peer dependency，构建也将其保留为外部依赖。因此本仓的 pnpm patch **不会随已发布的 Quire 包自动传给下游项目**。下游若仍使用未修复的 Ark 版本，需要在自己的依赖管理中应用相应补丁；普遍修复需要上游发布后再调整支持版本。此补丁不宣称已修复所有消费者的安装环境。
