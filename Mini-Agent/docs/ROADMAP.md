UI Foundation（UI 基础）
	Codex 风格主界面、Sidebar、Header、Composer、按钮、基础交互状态
		一个高完成度、可启动的静态 Codex-like UI

Conversation System（对话系统）
	前端消息状态、Session、消息列表、Python API、Mock Streaming
		能真正发送消息并看到后端流式回复

Persistence & Real LLM（持久化与真实模型）
	SQLite、Conversation/Message 存储、历史会话、真实 LLM Streaming
		刷新不丢会话，并能与真实模型连续聊天

Context & Agent Loop（上下文与 Agent 循环）
	Context Assembly、System Prompt、历史消息拼接、Agent Loop
		从普通 Chat 变成真正可循环运行的 MiniAgent

Tool System（工具系统）
	Tool Schema、Registry、Dispatch、Tool Call、Tool Result、基础工具
		Agent 能自主选择并执行 Tool

Memory System（记忆系统）
	Working Memory、短期记忆、长期记忆、SQLite Memory、上下文注入
		Agent 能跨轮次/跨 Session 使用记忆

Agent UX（Agent 交互体验）
	Tool Call 展示、运行状态、Thinking/Executing、错误展示、停止操作
		UI 能完整展示 Agent 的执行过程

Agent Runtime（Agent 运行时）
	Session、Run、Lifecycle、Running/Completed/Failed/Cancelled、Cancel
		Agent 运行不再只是一个函数，而是受 Runtime 管理

Permission & Safety（权限与安全）
	ALLOW/DENY/ASK、人工确认、Path Safety、Command Safety、参数校验
		Agent 的工具执行受到权限和安全控制

Mini-Harness Integration（完整集成）
	Workspace、基础 Execution Environment、错误恢复、测试、整体打磨
		一个完整、可演示、可实际使用的 Mini-Harness
