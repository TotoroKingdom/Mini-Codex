# Mini-Codex 技术架构

## 1. 架构目标

Mini-Codex 采用 Node.js 22+、TypeScript strict 和 ESM，实现一个 Windows 优先、单进程、单 Agent、本地优先的 coding-agent harness。Pi 仅作为最小核心和扩展机制的设计参考；核心运行时、公共接口和持久化语义均由本项目自行实现。

架构优先保证三个性质：

- CLI 与 SDK 使用同一个 Core Harness，不形成两套行为。
- 模型、工具、权限和存储通过窄接口解耦。
- V1 之外的 Hooks、Extensions、Skills、MCP 与 Fork 可以增量加入，而不改变 Agent Loop 的基本职责。

## 2. 总体分层

```text
CLI / TypeScript SDK
        │
        ▼
Core Harness
├── Agent Loop
├── Context Manager
├── Tool Registry
├── Permission & Workspace Guard
├── Event Bus
└── Session Service
        │
        ├── ModelAdapter
        ├── SessionStore
        ├── Extension Host
        └── MCP Client
```

- **CLI / SDK**：两个产品入口，只负责输入输出、配置装配和用户交互。
- **Core Harness**：协调模型、上下文、工具、权限、事件和会话生命周期。
- **ModelAdapter**：把不同模型协议归一为统一流式事件。
- **SessionStore**：隐藏 SQLite 细节，为 Core 提供持久化契约。
- **Extension Host / MCP Client**：后续 feature 的扩展边界，V1 不实现。

## 3. 单包代码组织

项目发布为一个 npm 包，同时提供：

- `mini-codex` 命令行入口。
- TypeScript SDK 导出入口。

内部按职责组织：

```text
src/
├── core/        # Agent Loop、上下文与统一事件
├── models/      # 模型协议适配器与 Provider 预设
├── tools/       # 工具契约、注册表与内置工具
├── security/    # 审批策略和工作区路径守卫
├── sessions/    # Thread/Turn/Item 与 SQLite 存储
├── extensions/  # 后续 Hooks、Skills 与 Extension Host
├── cli/         # 交互式 CLI
└── sdk/         # 公共 TypeScript API
```

模块只能通过公开接口跨层调用，CLI 不直接访问 SQLite 或厂商 SDK，模型适配器也不执行工具。

## 4. Core Harness

### 4.1 Agent Loop

每个 `thread.run(input)` 创建一个 Turn。Agent Loop 将上下文发送给当前 ModelAdapter，消费流式响应，记录 Item；遇到工具调用时依次完成参数校验、权限判断、工具执行、结果记录和模型回传，直到模型给出最终响应、用户取消或发生错误。

V1 默认同一 Thread 同时只运行一个 Turn，同一 Turn 内工具按顺序执行，避免并发修改工作区导致不可预测状态。

### 4.2 Context Manager

Context Manager 从系统指令、历史 Turn、当前用户输入、工具定义和工具结果组装模型上下文。V1 只实现确定性的历史重放和上下文窗口保护；自动压缩和 Skill 注入由后续 feature 实现。

### 4.3 Tool Registry

每个工具包含唯一名称、说明、输入 Schema 和异步执行函数。注册表负责：

- 拒绝重复名称。
- 向模型输出统一工具定义。
- 在执行前验证参数。
- 将成功、失败、拒绝和取消映射为统一 Tool Item。

V1 内置工具为目录/文件读取、文本搜索、补丁式修改和 Shell 命令执行。文件修改必须使用结构化补丁工具，不通过 Shell 隐式写文件。

## 5. 模型适配

### 5.1 统一契约

`ModelAdapter` 接收统一的消息、工具、取消信号和模型配置，返回异步流式事件。事件至少覆盖文本增量、工具调用增量、工具调用完成、使用量、完成、取消和错误。

协议适配器分为：

1. **Anthropic Messages**：面向 Anthropic 原生 API。
2. **OpenAI Responses**：面向 OpenAI 原生 Responses API。
3. **OpenAI-compatible Chat Completions**：面向兼容服务和自定义端点。

DeepSeek、千问、Kimi、智谱不各自复制 Agent Adapter，而是在兼容协议上提供 `baseURL`、API Key 环境变量名、默认 Header 和能力标记等 Provider 预设。只有出现无法在通用层表达的差异时，才允许加入小型 quirk 转换。

### 5.2 兼容性等级

Provider 预设必须声明 `compatible` 或 `verified`。标记为 `verified` 前，真实 API 必须通过：

- 流式文本。
- 工具调用和工具结果回传。
- 连续多轮。
- AbortSignal 取消。
- 鉴权、限流、超时和协议错误映射。

API Key 只从环境变量读取，禁止写入 SQLite、配置快照、事件 payload 或日志。

## 6. 公共 SDK 接口

SDK 的最小使用模型为：

```ts
const client = createMiniCodex(options);
const thread = await client.startThread(threadOptions);
const result = await thread.run(input, runOptions);

const resumed = await client.resumeThread(threadId);
const unsubscribe = resumed.onEvent(listener);
```

公共能力包括：

- `startThread`：使用工作区、Provider、模型和权限配置创建 Thread。
- `resumeThread`：从 SQLite 加载既有 Thread。
- `thread.run`：开始新的 Turn，并返回最终结果。
- `thread.onEvent`：订阅 Thread、Turn、Item、审批及错误事件。

CLI 必须使用这些公共能力，不建立独立的 Agent 执行路径。

## 7. 会话、事件与持久化

内部统一采用 `Thread → Turn → Item`：

- **Thread**：一个可恢复的长期工作上下文，绑定工作区与默认模型配置。
- **Turn**：一次用户输入触发的完整 Agent 运行，状态为运行中、完成、失败或取消。
- **Item**：Turn 内可观察的工作单元，例如用户消息、模型消息、工具调用、工具结果、审批和错误。

所有状态变化先形成追加式领域事件，再由 Event Bus 分发给 CLI/SDK 订阅者并由 SessionStore 持久化。SQLite 至少保存 Thread、Turn、Item、事件顺序和审批记录；写入使用事务保证一个状态转换不会留下部分记录。

SessionStore 是可替换接口，Core Harness 不依赖 SQL。V1 采用单进程本地 SQLite，不引入 ORM、服务端数据库或分布式并发。

这一概念模型参考 [Codex App Server](https://learn.chatgpt.com/docs/app-server) 的 Thread、Turn、Item 与事件生命周期，但 Mini-Codex 不承诺请求、响应、事件名称或持久化格式与其兼容。

## 8. 权限与工作区边界

V1 的默认平衡策略：

| 操作 | 默认行为 |
| --- | --- |
| 工作区内目录/文件读取 | 自动允许 |
| 工作区内文本搜索 | 自动允许 |
| 工作区内补丁修改 | 每次请求批准 |
| Shell 命令 | 每次请求批准 |
| 工作区外文件访问 | 直接拒绝 |

所有文件路径必须解析为绝对规范路径，并验证最终目标仍位于 Thread 的工作区根目录内。补丁和 Shell 审批必须展示可理解的操作摘要；拒绝后不执行工具并记录结果。

Shell 使用 Windows PowerShell 适配层。工作区路径守卫无法限制已批准进程自身可访问的所有 OS 资源，因此它只是应用层路径与权限防护，不是强隔离沙箱。V1 不声称能够防御恶意命令或不可信代码。

## 9. 后续扩展边界

- **Hooks / Extension**：订阅生命周期事件，并通过受控 API 注册工具或修改上下文。
- **Skills**：发现项目 Skill、组装指令并按需注入上下文。
- **MCP**：通过 stdio 连接 MCP Server，将远端工具转换为注册表工具并复用审批链。
- **Fork**：从已持久化 Turn 派生新 Thread，共享历史前缀但独立追加后续事件。

这些能力分别通过独立 feature 实现。在对应 feature 完成前，公共 API 不承诺其具体形状。
