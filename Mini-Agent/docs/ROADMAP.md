# Mini-Agent Roadmap（路线图）

## 1. Roadmap Purpose（路线图目标）

本 Roadmap 按照 [ARCHITECTURE.md](./ARCHITECTURE.md) 中的实体、依赖、状态机和安全边界，将 Mini-Agent 拆分为 14 个可交付 Milestone。

Roadmap 只定义：

- Milestone 目标和依赖。
- 候选 Feature。
- 累计可交付结果。
- 自动验证和人工验收方式。

Roadmap 不提前生成未来 Feature 的 SPEC、PLAN 或 TASK。任何时刻只展开和执行一个 Feature。

## 2. Delivery Model（交付模型）

```text
PROJECT
  → ARCHITECTURE
  → ROADMAP Milestone
  → Current Feature SPEC
  → Sequential PLANs
  → TASK Waves inside current PLAN
  → Feature Human Acceptance
  → Next Feature
```

层级定义：

| Level | Definition of Done |
|---|---|
| Task | 一个边界明确、可以独立验证的代码或文档变化 |
| Wave | 当前 Plan 中所有无未满足依赖的 Task 已并行完成并集成 |
| Plan | 一个完整集成、测试通过、应用仍可启动的实现增量 |
| Feature | SPEC 中的行为和验收场景全部通过，并完成人工验收 |
| Milestone | 所有候选 Feature 完成，形成可运行、可演示的累计产品能力 |

## 3. Milestone Overview（里程碑总览）

| ID | Milestone | Depends On | Cumulative Deliverable |
|---|---|---|---|
| M01 | UI Foundation | — | 高完成度、可启动、能用 Fixture 展示 Agent 全状态的 Codex-like UI |
| M02 | Backend Foundation | M01 | UI 连接真实 FastAPI，SQLite 可自动初始化和迁移 |
| M03 | Workspace System | M02 | 用户可以选择、保存并重新打开本地项目目录 |
| M04 | Conversation & Session | M03 | 用户可以创建、打开、关闭和恢复对话 |
| M05 | Run & Event Runtime | M04 | 用户可以观看 Mock Agent 流式执行并取消 Run |
| M06 | DeepSeek Conversation | M05 | 用户可以与真实 DeepSeek 连续聊天并恢复完整内容 |
| M07 | Context Assembly | M06 | 每次模型请求都使用明确、可测试和可观察的上下文 |
| M08 | Agent Loop | M07 | Agent 能调用安全演示工具并继续生成最终答案 |
| M09 | Workspace Read Tools | M08 | Agent 能自主读取和分析当前 Workspace |
| M10 | Patch & Approval | M09 | Agent 能提出 Patch，经人工批准后修改文件 |
| M11 | Controlled PowerShell | M10 | Agent 能经审批运行 PowerShell 命令并展示结果 |
| M12 | Workspace Memory | M11 | Agent 能在同一 Workspace 的不同 Conversation 间使用显式记忆 |
| M13 | Recovery & Hardening | M12 | 断线、刷新、API 失败和进程重启不会留下悬空状态 |
| M14 | Integration & Delivery | M13 | 可独立启动、演示和验收的完整 Mini-Agent |

## 4. Milestones（里程碑详情）

### M01 — UI Foundation

**Goal**

建立高完成度的 Codex-like UI，并使用固定 Fixture 提前验证所有重要执行状态的呈现方式。

**Candidate Features**

- React/Vite/TypeScript 应用骨架和 Design Tokens。
- Sidebar、Header、Conversation View 和 Composer。
- User、Assistant、Reasoning、ToolCall、ToolResult 消息组件。
- Running、Waiting Approval、Failed、Cancelled 等 Fixture 状态。
- 响应式布局、空状态和基础可访问性。

**Deliverable**

一个可启动、可交互的静态 UI，可以通过 Fixture 展示完整 Agent Run 的视觉过程。

**Verification**

- Vitest 与 React Testing Library 覆盖核心组件状态。
- 人工切换全部 Fixture，检查布局、滚动、输入和状态渲染。

### M02 — Backend Foundation

**Depends on:** M01

**Goal**

建立可启动的 FastAPI、配置、SQLite Repository 和 Migration 基础。

**Candidate Features**

- FastAPI 应用生命周期和健康检查。
- Pydantic 配置与环境变量加载。
- `sqlite3` Connection/Transaction 管理。
- `schema_versions` 和有序 Migration Runner。
- 前端 API Client 与后端连接状态。

**Deliverable**

UI 可以连接真实 Python 服务；空数据库会自动初始化，重复启动不会破坏 Schema。

**Verification**

- pytest 覆盖配置、健康检查、Migration 首次与重复执行。
- 人工从空数据目录启动前后端并看到连接成功状态。

### M03 — Workspace System

**Depends on:** M02

**Goal**

引入 Local Workspace 领域实体和本地项目目录边界。

**Candidate Features**

- Workspace Entity、Repository 和 REST API。
- Windows 路径规范化、存在性和目录检查。
- Workspace 选择、列表、重命名和重新打开 UI。
- 缺失、无权限或失效目录的错误状态。

**Deliverable**

用户可以选择一个本地目录作为 Workspace，重启后仍能从 UI 重新打开。

**Verification**

- pytest 覆盖合法路径、重复路径、缺失路径和无效路径。
- 人工添加当前仓库为 Workspace，重启并重新打开。

### M04 — Conversation & Session

**Depends on:** M03

**Goal**

实现 `Workspace 1:N Conversation 1:N Session` 的持久化和用户交互。

**Candidate Features**

- Conversation CRUD、标题和时间排序。
- Message 基础数据模型。
- Session 创建、激活、关闭和 STALE 状态。
- Sidebar 会话管理和历史消息恢复。
- Conversation 与 Workspace 所有权约束。

**Deliverable**

用户可以在 Workspace 内创建、打开、关闭和恢复多个 Conversation；每次打开形成新的 Runtime Session。

**Verification**

- pytest 覆盖所有权关系、Session 状态和重启修复。
- 前端测试覆盖 Sidebar 与 Conversation 切换。
- 人工创建两个 Conversation，刷新并验证历史仍存在。

### M05 — Run & Event Runtime

**Depends on:** M04

**Goal**

建立统一 Run 状态机、全局活动 Run 锁和 REST + SSE Event 管道。

**Candidate Features**

- Run Entity、状态转换和全局单 Run Guard。
- Event Envelope、sequence、内存 Buffer 和 Event Store。
- REST 创建/取消 Run 与 SSE `after_sequence` 订阅。
- Mock Agent 的 reasoning/text 流。
- UI Event Reducer、运行状态和停止操作。

**Deliverable**

用户发送消息后可以看到 Mock Agent 的流式 reasoning 和回复，可以取消执行；第二个并发 Run 被拒绝。

**Verification**

- pytest 覆盖状态转换、事件顺序、冲突、取消和 SSE 续传。
- 前端测试覆盖 Event 去重和 Run 状态投影。
- 人工断开并重连 SSE，确认事件顺序正确。

### M06 — DeepSeek Conversation

**Depends on:** M05

**Goal**

用真实 DeepSeekProvider 替换 Mock Agent，同时保持 Core 与 Provider SDK 解耦。

**Candidate Features**

- `LLMProvider` Port 和统一流式响应类型。
- `DeepSeekProvider` 配置、错误映射和取消。
- Text 与 reasoning delta 转换。
- 完整 Assistant Message/reasoning 持久化。
- 多轮 Conversation History 请求。

**Deliverable**

用户可以与真实 DeepSeek 连续聊天；reasoning 和答案实时显示，完成后刷新仍可恢复。

**Verification**

- Fake Provider 自动测试文本、reasoning、错误和取消。
- Repository 测试确认只保存完成内容，不逐 token 保存 delta。
- 使用真实 DeepSeek API 进行可选 Smoke Test。

### M07 — Context Assembly

**Depends on:** M06

**Goal**

把模型输入集中到可测试的 Context Assembly，而不是在 Provider 或 API 中拼接 Prompt。

**Candidate Features**

- 内置 System Prompt。
- Workspace、Session 和 Run Runtime Context。
- Conversation History 选择和顺序。
- Tool Definition 注入接口。
- 上下文预算、截断和可观察摘要。

**Deliverable**

每次 DeepSeek 请求都使用确定顺序和预算的上下文，并可通过测试或调试信息确认实际组成。

**Verification**

- pytest 覆盖组装顺序、空历史、长历史和截断边界。
- 人工进行依赖历史信息的多轮对话，确认连续性。

### M08 — Agent Loop

**Depends on:** M07

**Goal**

把单次 Chat Completion 演进为可终止、可取消的 Agent Loop。

**Candidate Features**

- Tool Definition、Tool Request 和 Tool Result 领域类型。
- Tool Registry 视图与 `ToolInvoker` Port。
- 多步 LLM → Tool → LLM 循环。
- 最大步数、完成条件和结构化失败。
- 一个无副作用的安全演示工具。

**Deliverable**

Agent 可以自主请求演示工具，消费 Tool Result，并继续生成最终答案。

**Verification**

- pytest 覆盖无 Tool、单 Tool、多步 Tool、达到上限、Provider 失败和取消。
- 人工触发演示 ToolCall，观察完整事件序列。

### M09 — Workspace Read Tools

**Depends on:** M08

**Goal**

让 Agent 在严格 Workspace 边界内自主读取和搜索项目内容。

**Candidate Features**

- Tool Schema Validation 和 Input Normalization。
- Windows Path Safety 与 Workspace Boundary。
- `list_files`、`read_file`、`search_text`。
- 只读工具默认 ALLOW 的 Permission Policy。
- 文件和搜索结果大小限制。

**Deliverable**

Agent 可以列出、读取、搜索当前 Workspace，并根据真实项目内容回答问题。

**Verification**

- pytest 覆盖路径穿越、绝对越界路径、失效路径和结果限制。
- 人工让 Agent 定位并解释当前项目中的一个文档内容。

### M10 — Patch & Approval

**Depends on:** M09

**Goal**

实现可审查的文件修改和单 ToolCall 人工审批闭环。

**Candidate Features**

- 结构化 Apply Patch Parser 和 Executor。
- ToolCall 与 PermissionDecision 持久化。
- ASK、ALLOW、DENY 和 WAITING_APPROVAL 状态。
- Patch Preview、批准、拒绝和取消 UI。
- Permission 与 Tool Event 审计。

**Deliverable**

Agent 可以提出 Workspace 内的 Patch；只有用户批准后才修改文件，拒绝不会产生变化。

**Verification**

- pytest 覆盖有效 Patch、冲突 Patch、越界 Patch、批准、拒绝和取消。
- 人工分别批准和拒绝一次文件修改，并检查实际 Diff。

### M11 — Controlled PowerShell

**Depends on:** M10

**Goal**

在每次调用人工审批和 Runtime 控制下，以 Workspace Root 为工作目录执行 PowerShell 命令。

**Candidate Features**

- Shell Tool Schema 和 Command Safety。
- 单 ToolCall ASK 审批。
- 完整 Command Preview 和非 Sandbox 风险提示。
- PowerShell Process Executor 和输出流。
- 超时、最大输出和 Windows 进程树取消。
- Shell Result 与失败信息展示。

**Deliverable**

Agent 可以提出测试或构建命令，经批准后在 Workspace Root 执行并展示结果。

**Verification**

- pytest 覆盖审批、工作目录、超时、输出截断、失败码和取消。
- 人工批准一个安全命令并拒绝另一个命令，确认行为与审计一致。

### M12 — Workspace Memory

**Depends on:** M11

**Goal**

实现 Workspace 级、显式、可审计的长期记忆。

**Candidate Features**

- Memory Entity 和 Repository。
- `memory_save`、`memory_search`、`memory_delete`。
- Workspace 隔离和跨 Conversation 查询。
- Memory Tool Result 注入当前 Agent Loop。
- Memory 查看和删除 UI。

**Deliverable**

Agent 可以显式保存项目记忆，并在同一 Workspace 的另一个 Conversation 中查询和使用；其他 Workspace 不可见。

**Verification**

- pytest 覆盖 CRUD、Workspace 隔离和无结果查询。
- 人工在两个 Conversation 间复用记忆，并验证跨 Workspace 隔离。

### M13 — Recovery & Hardening

**Depends on:** M12

**Goal**

处理刷新、断线、Provider 失败、工具失败和后端重启后的状态一致性。

**Candidate Features**

- SSE 重连、事件去重和最终状态恢复。
- 启动时 ACTIVE Session → STALE 修复。
- 启动时未终止 Run → FAILED 修复。
- API、Provider、Tool 和 Persistence 错误映射。
- Event、Run 和数据库事务一致性检查。

**Deliverable**

常见故障不会留下永久 RUNNING、WAITING_APPROVAL 或无法恢复的 UI 状态。

**Verification**

- 故障注入测试覆盖断线、重启、SQLite 失败、Provider 失败和工具取消。
- 人工在运行中刷新页面和重启后端，确认最终状态可理解、可继续使用。

### M14 — Integration & Delivery

**Depends on:** M13

**Goal**

完成端到端验证、启动体验、文档和架构一致性检查。

**Candidate Features**

- 一致的前后端开发与启动流程。
- 完整 Playwright 用户旅程。
- 示例 Workspace 与演示场景。
- 配置、密钥、数据库和故障排查文档。
- Architecture、Roadmap 和实际实现一致性审查。

**Deliverable**

用户可以按文档独立启动 Mini-Agent，完成从 Workspace 到 DeepSeek、Tool、Approval、Memory 和恢复的完整演示。

**Verification**

- pytest、Vitest 和 Playwright 全部通过。
- 在干净环境执行安装与启动演练。
- 按 PROJECT Success Criteria 和 Architecture Invariants 逐项人工验收。

## 5. Feature Execution Rules（Feature 执行规则）

### 5.1 Progressive Elaboration

- Roadmap 可以列出候选 Feature 名称，但不提前生成未来 Feature 文档。
- 只为当前 Milestone 的当前 Feature 生成 SPEC。
- 当前 Feature 未经人工验收，不生成下一个 Feature。
- 一个 Milestone 可以包含多个 Feature，按顺序完成。

### 5.2 SPEC → PLAN → TASK

- SPEC 固定 Feature 行为、范围、接口影响和验收标准。
- SPEC 稳定后生成约 5 个顺序 Plan；数量由复杂度决定，不强制凑数。
- 每个 Plan 生成约 5 个 Task；Task 必须有独立输出和验证方式。
- Plan 必须是可集成增量，不能把所有集成工作留到 Feature 最后。

### 5.3 Wave Parallelism

- 并行只发生在当前 Plan 内。
- Task 使用 `depends_on` 显式记录依赖。
- 同一 Wave 中的 Task 必须没有未满足依赖，并尽量避免修改相同文件或公共接口。
- 公共类型、Schema 和接口必须在依赖它们的并行 Task 之前完成。
- Wave 完成后立即集成和验证，不单独维护另一份 DAG 文件。

推荐的 Task 描述字段：

```text
task_id
goal
depends_on
write_scope
expected_output
verification
wave
status
```

### 5.4 Gates

每个 Task：

- 输出满足 Task 描述。
- 相关测试通过。
- 不修改未授权范围或上游决策。

每个 Wave：

- 所有 Task 已集成。
- 没有遗漏依赖或未解决冲突。
- 当前 Plan 的相关测试通过。

每个 Plan：

- 应用可以启动。
- 自动测试保持通过。
- 实现仍符合 SPEC 和 Architecture。

每个 Feature：

- SPEC 验收项全部有证据。
- 完成人工验收。
- 更新 Feature 与 Roadmap 状态。
- 验收通过后才能生成下一个 Feature。

每个 Milestone：

- 所有 Feature 已完成人工验收。
- 累计 Deliverable 可以独立演示。
- 自动测试、人工演示和架构一致性检查通过。

## 6. Test Baseline（测试基线）

- Python：pytest。
- React：Vitest + React Testing Library。
- End-to-End：Playwright。
- DeepSeek 自动测试：Fake Provider。
- DeepSeek 真实 API：可选 Smoke Test，不作为常规测试的硬依赖。
- 每个 Milestone 都增加当前能力对应的测试；M14 不负责集中补齐前面阶段的测试债务。
