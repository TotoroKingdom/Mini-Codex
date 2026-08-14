1. Project Vision（项目愿景）
	构建一个自己可以完全理解、修改和扩展的轻量 Agent Harness（Agent 执行框架），通过真实产品形态理解 Agent 从 UI、Agent Core 到 Harness Runtime 的完整运行机制。

2. Project Goals（项目目标）
	1. 构建一个精美、完整的 Codex-like Agent UI。
	2. 从零实现一个最小但完整的 Agent Core：
		Context Assembly
		 Agent Loop
		Tool System
		Memory
	3. 在 Agent Core 外逐步实现轻量 Harness：
		 Runtime
		Permission
		Safety

3. Product Definition（产品定义）
	Mini-Harness 是一个完整的 Agent 产品。

项目内部为了方便设计，将系统划分为三个层次：

UI Layer
    提供用户交互和 Agent 执行过程展示。

Agent Core
    负责 Agent 的核心智能循环。

Harness Layer
    负责 Agent 的运行、权限、安全以及执行环境。

三者属于同一个系统，不作为独立产品开发。

4. Scope（范围）
	In Scope（范围内）
		Codex-like UI

Conversation / Session

LLM Streaming

Context Assembly

Agent Loop

Tool Registry / Dispatch / Execution

Memory

Agent Runtime

Permission

Safety

基础 Execution Environment
	Out of Scope（暂不考虑）
		Multi-Agent Orchestration（多 Agent 编排）

Distributed Runtime（分布式运行时）

复杂 RBAC

OAuth

完整 Container Sandbox

复杂 Prompt Injection Detection

企业级 Observability

Plugin Marketplace

Workflow Engine

5. Design Principles（设计原则）
	① Small Core（小核心）
		Agent Core 只保留：

Context Assembly
Agent Loop
Tool System
Memory
	② Harness Outside Agent
		Agent Core
    负责思考和行动

Harness
    负责控制 Agent 怎么运行
	③ Vertical Increment（纵向增量）
		可运行 UI
↓
可模拟聊天
↓
真实聊天
↓
Agent
↓
Tools
↓
Memory
↓
Harness
	④ Deliverable First（可交付优先）
		每个 Roadmap
必须产生一个可运行、可展示的产品增量。

每个 Plan
必须存在明确的人工验收方式。
	⑤ YAGNI
		只实现当前阶段真正需要的能力。

6. Technology Baseline（技术基线）
	Frontend
    TypeScript

Backend / Agent
    Python

Persistence
    SQLite

目标运行环境
    Local-first（本地优先）

7. Success Criteria（项目成功标准）
	用户可以启动 Mini-Harness。

用户可以通过 Codex-like UI 创建和管理会话。

用户消息可以实时发送给 Python Agent。

Agent 可以调用真实 LLM。

Agent 能够组装上下文并执行 Agent Loop。

Agent 可以自主选择和调用工具。

Agent 具有基础记忆能力。

Harness 可以管理 Agent Run 生命周期。

工具执行受到 Permission 和 Safety 控制。

UI 能看到 Agent 的消息、工具调用和运行状态。

整个系统可以作为一个完整产品独立运行。
