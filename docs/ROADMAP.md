# Mini-Codex 路线图

## 1. 路线图规则

本文件是产品能力状态的唯一来源。每个路线图条目必须绑定唯一 feature 目录；实现细节与进度分别记录在该目录的 `SPEC.md`、`PLAN.md` 和 `TASKS.md` 中。

状态只允许使用：

- `Backlog`：已进入路线图，尚未形成完整规格。
- `Specified`：SPEC 已完成并确认，验收标准明确。
- `Planned`：PLAN 与 TASKS 已完成，可以实施。
- `In Progress`：正在实现或验证。
- `Done`：自动测试、人工演示和验收记录全部完成。

`Done` 的通用门槛：

1. 对应 `SPEC.md`、`PLAN.md`、`TASKS.md` 完整且与实现一致。
2. 自动测试通过，TASKS 中记录验证命令和结果。
3. 人工按约定场景完成演示。
4. `human/<feature-id>.md` 记录环境、步骤、预期、实际结果和结论。

## 2. Feature 路线图

| ID | 交付点 | 依赖 | 状态 | 人类可验收成果 |
| --- | --- | --- | --- | --- |
| `001-minimal-agent-core` | 建立单包双入口、最小 Agent Loop 与统一流式事件；先用确定性 Fake Model 跑通 CLI 和 SDK | 无 | `Backlog` | 在 Windows 终端分别运行 CLI Demo 和 SDK 示例，输入固定任务后可观察文本流、Turn 开始/结束和最终结果 |
| `002-tool-registry` | 实现工具契约、注册表、Schema 校验以及读、搜、补丁、Shell 四类接口；用可控执行器验证工具循环 | `001` | `Backlog` | 列出内置工具；触发一次合法调用、一次参数错误和一次执行错误，并在事件流中看到对应结果 |
| `003-model-adapters` | 实现 Anthropic Messages、OpenAI Responses、OpenAI-compatible Chat Completions，并提供 DeepSeek、千问、Kimi、智谱预设和兼容矩阵 | `001`, `002` | `Backlog` | 使用至少一个真实 Provider 完成流式、多轮工具调用；界面明确展示 Provider 的 Compatible/Verified 状态 |
| `004-permission-workspace-guard` | 实现平衡审批策略、Windows 路径规范化和工作区边界 | `002` | `Backlog` | 分别批准和拒绝补丁/Shell 操作；尝试读取工作区外文件时被阻止且目标文件未受影响 |
| `005-session-event-persistence` | 实现 Thread/Turn/Item、追加式领域事件、SQLite SessionStore 和 Resume | `001`, `002`, `004` | `Backlog` | 运行一轮任务后关闭进程，使用 Thread ID 重启并继续下一轮；历史消息、工具结果和审批记录可恢复 |
| `006-v1-todo-cli-acceptance` | 集成 V1 全部能力，完成固定绿地项目验收 | `003`, `004`, `005` | `Backlog` | 在空目录中让 Agent 生成带 CRUD 与自动测试的 Node.js TODO CLI；安装、运行、测试和恢复会话全部成功 |
| `007-hooks-extension` | 增加生命周期 Hooks 和本地 Extension Host，支持受控订阅事件与注册工具 | `006` | `Backlog` | 加载一个示例 Extension，观察 Hook 触发，并让模型发现和调用该扩展注册的工具 |
| `008-skills-context` | 增加 Skill 发现、指令组装与上下文窗口管理 | `007` | `Backlog` | 在示例项目中放入一个 Skill，确认 Agent 发现并按其流程完成指定任务，事件中可追踪加载来源 |
| `009-mcp-client` | 增加 stdio MCP Client、工具发现、调用映射和审批复用 | `007` | `Backlog` | 连接示例 MCP Server，列出其工具，经批准调用一次并展示成功结果及失败错误 |
| `010-thread-fork` | 从已持久化 Turn 派生新 Thread，保留共同历史并隔离后续事件 | `005` | `Backlog` | 从同一历史节点创建两个分支，分别运行不同任务；共同历史一致，新增 Turn 与工作状态互不污染 |

## 3. 版本边界

### V1：安全单 Agent

`001` 至 `006` 构成 V1。完成后产品应具备 Windows 本地 CLI + SDK、多个模型协议、最小编码工具、审批与工作区限制、SQLite 会话恢复，以及固定 Node.js TODO CLI 端到端验收。

### V1 之后：可扩展 Harness

`007` 至 `010` 在稳定 V1 上依次加入 Hooks/Extensions、Skills/Context、MCP 和 Fork。它们不作为 V1 发布阻塞项，也不得提前增加最小核心的公共接口负担。

## 4. Provider 验证政策

- DeepSeek、千问、Kimi、智谱的预设随 `003-model-adapters` 交付。
- 没有真实 API Key 时，可跳过对应集成测试并保持 `Compatible`。
- 只有流式文本、工具调用、工具结果回传、连续多轮、取消和错误映射全部通过后，才能标记 `Verified`。
- 至少一个真实 Provider 达到 `Verified`，`003` 和 V1 集成验收才能进入 `Done`。

## 5. 流程验证结论边界

当 V1 的六个 feature 全部达到 `Done`，并且 Node.js TODO CLI 验收通过时，可以得出“该 vibe coding 流程能够交付可运行产品并形成完整可追溯文档链”的结论。

该结论不比较无流程开发的时间、成本、缺陷或返工，因此不能用于声称本流程效率更高。
