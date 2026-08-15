# Mini-Agent Project（项目定义）

## 1. Project Vision（项目愿景）

构建一个可以完全理解、修改和扩展的轻量 Agent Harness，通过真实产品形态理解 Agent 从 UI、Agent Core 到 Harness Runtime 的完整运行机制。

## 2. Project Goals（项目目标）

1. 构建精美、完整的 Codex-like Agent UI。
2. 从零实现最小但完整的 Agent Core：Context Assembly、Agent Loop、Tool System 和 Memory。
3. 在 Agent Core 外逐步实现轻量 Harness Runtime、Permission 和 Safety。

## 3. Product Definition（产品定义）

`Mini-Agent` 是完整产品。系统内部按职责划分为：

- **UI Layer**：提供用户交互和 Agent 执行过程展示。
- **Agent Core**：负责上下文组装、模型调用与智能循环。
- **Harness Runtime**：负责 Run 生命周期、权限、安全与执行环境。

三者属于同一个模块化单体，不作为独立产品开发。`Harness Runtime` 是 Mini-Agent 的内部子系统，不是产品名称。

## 4. Scope（范围）

### In Scope

- Codex-like UI。
- Workspace、Conversation 与 Session。
- LLM Streaming、Context Assembly 与 Agent Loop。
- Tool Registry、Dispatch 与 Execution。
- Workspace Memory。
- Agent Runtime、Permission 与 Safety。
- 本地基础执行环境。

### Out of Scope

- Multi-Agent Orchestration。
- Distributed Runtime。
- 复杂 RBAC 与 OAuth。
- 完整 Container Sandbox。
- 复杂 Prompt Injection Detection。
- 企业级 Observability。
- Plugin Marketplace 与 Workflow Engine。

## 5. Design Principles（设计原则）

### Small Core

Agent Core 只保留 Context Assembly、Agent Loop、Tool System 和 Memory 协议。

### Harness Outside Agent

Agent Core 负责思考和行动；Harness Runtime 负责控制 Agent 如何运行。

### Vertical Increment

每个 Milestone/Feature 都交付一个可运行增量：UI → 模拟聊天 → 真实聊天 → Agent Loop → Tools → Memory → Harness。

### Deliverable First

每个 Milestone/Feature 必须产生可运行、可展示的产品增量；每个 Plan 必须存在自动验证和人工验收路径。

### YAGNI

只实现当前阶段真正需要的能力。

## 6. Technology Baseline（技术基线）

- Frontend：React、TypeScript。
- Backend / Agent：Python。
- Persistence：SQLite。
- Runtime：Local-first，Windows 优先。

## 7. Success Criteria（成功标准）

- 用户可以按文档启动 Mini-Agent。
- 用户可以通过 Codex-like UI 创建和管理会话。
- 用户消息可以实时发送给 Python Agent。
- Agent 可以调用真实 LLM、组装上下文并执行 Agent Loop。
- Agent 可以自主选择和调用工具，并使用 Workspace 级显式记忆。
- Harness Runtime 可以管理 Run 生命周期，并通过 Permission 和 Safety 控制工具执行。
- UI 可以展示消息、Reasoning、Tool Call、Tool Result 和 Run 状态。
- 整个系统可以作为一个完整产品独立运行。
