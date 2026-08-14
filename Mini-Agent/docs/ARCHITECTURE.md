1. Architecture Goals（架构目标）
	## Architecture Goals

Mini-Harness 的架构目标：

1. 保持 Agent Core 足够小。
2. UI、Agent Core、Harness Layer 职责清晰。
3. Agent Core 不直接承担权限、安全和 Runtime 职责。
4. 各模块通过明确接口通信，减少模块耦合。
5. 优先支持单机、本地、单 Agent 场景。
6. 能够通过逐步增加模块能力演进，而不需要重写核心架构。

2. System Overview（系统总览）
	UI / MiniAgent / MiniHarness 不是三个程序目标，而是一个产品内部的三个逻辑层次。

3. Layer Responsibilities（分层职责）
	UI Layer
		UI Layer

Conversation UI
Session UI
Message Rendering
Streaming Rendering
Tool Call Rendering
Run Status
User Interaction
	Agent Core
		Agent Core
├── Context Assembly
├── Agent Loop
├── Tool System
└── Memory
	Context Assembly（上下文组装）
		System Prompt
Conversation History
Memory
Tool Definitions
Runtime Context
        ↓
最终 LLM Messages
	Agent Loop（Agent 循环）
		Context
 ↓
LLM
 ↓
Response
 ↓
Tool Call?
 ├── No → Final Response
 └── Yes
      ↓
     Tool Result
      ↓
     下一轮
	Tool System（工具系统）
		Tool System
├── Tool Definition
├── Tool Registry
├── Tool Discovery
├── Tool Dispatcher
└── Tool Executor
		Tool Definition
      ↓
Tool Registry
      ↓
LLM 获取 Tool Schema
      ↓
产生 Tool Call
      ↓
Dispatcher
      ↓
Permission / Safety
      ↓
Executor
      ↓
Tool Result
	Memory（记忆）
		Memory
├── Working Memory
├── Conversation Memory
└── Long-term Memory
		SQLite
  ↓
Memory
  ↓
Context Assembly
  ↓
LLM

4. Harness Layer
	Runtime（运行时）
		Runtime
├── Session
├── Run
├── Run State
├── Lifecycle
└── Cancellation
		CREATED
   ↓
RUNNING
   ├── COMPLETED
   ├── FAILED
   └── CANCELLED
	Permission（权限）
		Tool Call
   ↓
Permission
   ├── ALLOW
   ├── DENY
   └── ASK
	Safety（安全）
		Safety
├── Path Safety
├── Command Safety
└── Tool Input Safety

5. Application/API Layer
	API
├── Conversation API
├── Session API
├── Run API
└── Streaming API
	UI 换掉，Agent Core 不受影响

6. Core Data Flow（核心数据流）
	User
 ↓
UI Composer
 ↓
POST Message
 ↓
Application API
 ↓
Session / Run
 ↓
Context Assembly
 ↓
Agent Loop
 ↓
LLM
 ↓
Response
	not use Tool call
		LLM
 ↓
Assistant Message
 ↓
SQLite
 ↓
Stream Event
 ↓
UI
	Tool call
		LLM
 ↓
Tool Call
 ↓
Tool Registry
 ↓
Permission
 ↓
Safety
 ↓
Tool Executor
 ↓
Tool Result
 ↓
Context Assembly
 ↓
Agent Loop
 ↓
LLM

7. Persistence Architecture（持久化架构）
	SQLite
│
├── conversations
├── messages
├── runs
├── tool_calls
└── memories

8. Event / Streaming Architecture（事件与流式架构）
	从一开始就把返回数据抽象成 Event（事件）。

9. Dependency Rules（依赖规则）
	UI
   ↓
API
   ↓
Runtime
   ↓
Agent Core
   ↓
Infrastructure
	上层知道下层接口，下层不知道上层。

10. Technology Architecture（技术架构）
	Frontend
    TypeScript
    Web UI

Backend
    Python

Persistence
    SQLite

Communication
    HTTP
    Streaming

LLM
    Provider abstraction

Runtime
    Local Python Process
