# Mini-Codex 项目定义

## 1. 项目愿景

Mini-Codex 是一个使用 Node.js 与 TypeScript 自研的轻量 coding-agent harness。项目以 Pi 的最小 Agent Core、工具注册和扩展思路作为设计参考，但不依赖、不 Fork Pi，也不包装 Claude Code 或 Codex CLI。

本项目有两个相互关联的目标：

1. 交付一个可以在 Windows 本地工作区中完成真实编码任务的单 Agent 产品。
2. 用该产品的开发过程验证一套从 `PROJECT → ARCHITECTURE → ROADMAP → SPEC → PLAN → TASKS → 实现 → 人工验收` 的 vibe coding 流程是否可行。

这里的“Codex”描述的是 coding-agent 产品形态，不表示兼容、复刻或封装 OpenAI Codex 的内部协议。

## 2. 目标用户

- 希望理解 coding agent 最小运行机制的开发者。
- 希望用统一接口连接不同模型供应商的 Windows 用户。
- 希望验证结构化 vibe coding 流程是否能持续产出可验收成果的小型研发团队。

## 3. 问题陈述

现有 coding agent 往往能力完整但架构复杂，或者与单一模型、CLI、运行时强绑定，不利于理解最小闭环和验证研发流程。Mini-Codex 需要用尽可能简洁的代码组织回答以下问题：

- 一个模型如何通过流式 Agent Loop 调用本地编码工具并持续推进任务？
- 如何用统一接口切换 Anthropic、OpenAI 和 OpenAI-compatible 模型服务？
- 如何在不声称强沙箱隔离的前提下，为本地文件修改和命令执行提供清晰、可审计的权限边界？
- 如何持久化会话，使用户能够中断、重启并继续工作？
- 如何让每个路线图能力都有对应 feature 和人类可直接验收的结果？

## 4. 设计原则

1. **最小但完整**：优先打通输入、推理、工具、审批、结果和恢复的端到端闭环。
2. **Harness 自主**：Agent 状态机、工具协议、权限、事件和持久化语义由本项目定义。
3. **协议优先**：按 API 协议复用适配器，不为每个兼容厂商复制完整实现。
4. **安全边界诚实**：V1 提供工作区路径限制与用户审批，不将其描述为 OS 或容器级沙箱。
5. **人类可验收**：每个 feature 必须产生可运行、可观察、可复现的人工成果。
6. **保持简单**：采用单 npm 包和清晰的内部模块边界；扩展能力不得污染最小核心。

## 5. V1 产品范围

V1 是仅支持 Windows、本地工作区和单 Agent 的 CLI + TypeScript SDK，包含：

- 交互式命令行和可嵌入 SDK。
- 支持流式输出、工具调用和多轮推进的 Agent Loop。
- 内置目录/文件读取、文本搜索、补丁式修改和 Shell 命令工具。
- 工作区内读取与搜索自动允许；每次补丁修改和 Shell 执行都请求用户批准。
- 拒绝访问工作区之外的文件路径。
- 使用 SQLite 保存 Thread、Turn、Item、事件和审批记录。
- 支持进程中断后的会话恢复。
- 可切换 Anthropic、OpenAI 和 OpenAI-compatible Provider。
- 为 DeepSeek、千问、Kimi、智谱提供配置预设和兼容性验证入口。

## 6. Provider 支持等级

- **Compatible**：Provider 可通过受支持协议和配置预设接入，但尚未完成全部真实 API 验证。
- **Verified**：已使用真实 API 通过流式文本、工具调用、工具结果回传、连续多轮、取消和错误映射测试。

缺少 API Key 时允许跳过真实 Provider 测试，但该 Provider 不得标记为 Verified。API Key 只能通过环境变量提供，不进入会话数据库或日志。

## 7. V1 最终人工验收

验收人员在一个新的空目录中启动 Mini-Codex，要求 Agent 创建一个 Node.js TODO CLI。生成项目必须：

- 支持 TODO 的新增、查询、更新和删除。
- 包含自动化测试。
- 能在 Windows 上安装依赖并运行。
- 所有测试通过。
- 文件修改和命令执行均展示审批流程。
- 关闭 Mini-Codex 后能够恢复原会话并继续追问或修改项目。

## 8. 成功标准

产品满足以下全部条件时，V1 才算交付：

- 用户可通过配置切换模型 Provider，至少一个真实 Provider 完成端到端验收。
- 工作区内修改和命令执行经过批准，拒绝操作时不会产生副作用。
- 工作区外文件访问被阻止，并产生可理解的错误事件。
- 中断进程后可以从 SQLite 恢复线程并继续运行新 Turn。
- 最终生成的 Node.js TODO CLI 可以安装、运行且自动测试通过。
- 每个完成的 feature 都具备 `SPEC.md`、`PLAN.md`、`TASKS.md` 和 `human/<feature-id>.md` 人工验收记录。
- `ROADMAP.md` 中的状态与实际 feature 和验收结果一致。

本项目把上述结果定义为 vibe coding 流程的**可行性验证**：它证明该流程能够交付可运行产品并形成完整文档链，但不证明其效率、成本或质量优于其他开发流程。

## 9. 非目标

V1 明确不包含：

- GUI、Web UI 或 IDE 插件。
- 多 Agent、子 Agent 或远程编排。
- 云端服务、多人实时协作或远程会话。
- macOS 与 Linux 的正式支持。
- OS、虚拟机或容器级强沙箱。
- 生产级安全、租户隔离、合规或密钥托管。
- Hooks、Extensions、Skills、MCP 和 Thread Fork；这些属于 V1 之后的独立 feature。
- 与无结构 vibe coding 的效率对照实验。
