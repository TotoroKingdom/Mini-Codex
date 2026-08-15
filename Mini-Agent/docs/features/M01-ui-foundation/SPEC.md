# M01 — UI Foundation SPEC

## 1. Document Status（文档状态）

| Field | Value |
|---|---|
| Milestone / Feature | `M01 — UI Foundation` |
| Status | Ready for PLAN and TASK decomposition |
| Depends On | None |
| Source | [PROJECT.md](../../PROJECT.md)、[ARCHITECTURE.md](../../ARCHITECTURE.md)、[ROADMAP.md](../../ROADMAP.md) |
| Target Runtime | Local-first，Windows 优先 |

本 SPEC 是 M01 的需求事实源。PLAN 和 TASK 可以细化实现步骤，但不得隐式改变本文的范围、公共展示契约或验收标准。若后续需要改变本文决策，必须先更新 SPEC，再更新关联 PLAN 和 TASK。

## 2. Goal and Deliverable（目标与交付物）

### 2.1 Goal

建立高完成度、可启动、可交互的 Codex-like React UI，并通过固定 Fixture（演示数据）验证 Agent 执行过程中所有重要展示状态。

M01 只验证 UI 信息架构、视觉层级、组件边界和交互意图，不连接 Backend，也不实现真实 Agent Runtime。

### 2.2 Deliverable

交付一个位于 `frontend/` 的静态单页应用。用户可以：

- 在桌面工作台中浏览 Sidebar、Header、Conversation View 和 Composer。
- 通过应用内 Scenario Switcher 切换六个固定场景。
- 查看 User、Assistant、Reasoning、Tool Call、Tool Result 和 Run 状态。
- 执行会话选择、Sidebar 折叠、Reasoning 展开收起和 Composer 输入等本地展示交互。
- 触发发送、停止、批准和拒绝 UI Intent，并看到最近一次 Intent 的可读反馈。

### 2.3 Success Definition

M01 完成时，静态 UI 能在 1440×900 和 1280×720 两种桌面视口独立演示；核心组件状态具有自动测试；全部 SPEC Requirement（需求）均有自动或人工验收证据。

## 3. Scope（范围）

### 3.1 In Scope

- React、Vite、TypeScript 前端工程与 npm scripts。
- 仅浅色主题的 Design Tokens（设计令牌）和全局基础样式。
- 桌面 App Shell、Sidebar、Header、Conversation View 和 Composer。
- User Message、Assistant Message、Reasoning、Tool Call、Tool Result、Status Notice。
- 六个固定 Fixture 场景和应用内 Scenario Switcher。
- 无外部副作用的本地展示状态与 UI Intent 回调。
- Vitest、React Testing Library、`user-event`、`jest-dom` 测试基线。
- 1440×900 和 1280×720 人工布局验收。
- 基础键盘操作、语义结构、焦点可见性和状态播报。

### 3.2 Out of Scope

- Python Backend、FastAPI、REST、SSE 和任何网络请求。
- SQLite、Local Storage 或其他持久化。
- Workspace、Conversation、Session、Run 等真实领域实体和 CRUD。
- Backend API Schema、Event Envelope、Event Reducer 和流式重连。
- 真实或异步 Mock Agent、计时器驱动的 Run 状态转换。
- Router、深链接和多页面导航。
- 深色主题、主题切换和系统主题检测。
- 移动端、平板布局以及宽度低于 1280px 的响应式适配。
- Storybook、Playwright、Tailwind、第三方组件库和全局状态库。
- Permission、Patch Preview 或工具执行的真实业务行为。

## 4. Architecture Alignment（架构对齐）

M01 只实现 [ARCHITECTURE.md](../../ARCHITECTURE.md) 中 UI Layer 的静态展示基础，不改变或提前实现其他层的职责。

| Architecture Area | M01 Impact |
|---|---|
| Entity | 无变更；Fixture 中的会话和消息只是假数据，不是领域实体 |
| Port | 无变更 |
| Runtime State Machine | 无变更；只渲染状态快照，不执行状态转换 |
| Event Schema | 无变更；UI Intent 不是 Runtime Event |
| Persistence | 无变更 |
| Permission / Safety | 无变更；批准和拒绝只产生 UI Intent |
| Dependency Direction | UI 不直接访问 DeepSeek、SQLite、本地文件系统或操作系统进程 |

Fixture 展示类型只服务 M01 前端组件。M02–M05 可以通过 Adapter（适配器）把真实 API 与 Event 数据转换为这些展示类型，但不得把 Fixture 类型反向当作 Backend 公共契约。

## 5. Technology and Dependency Constraints（技术与依赖约束）

### 5.1 Required Stack

- Application：React + Vite + TypeScript。
- Package manager：npm。
- Styling：CSS Modules + CSS Custom Properties（CSS 自定义属性）。
- Icons：`lucide-react`。
- Unit / Component Test：Vitest + React Testing Library。
- Interaction Test：`user-event`。
- DOM Assertions：`jest-dom`。

不固定依赖的补丁版本；首次创建 `package-lock.json` 后由 lockfile 固定可重复安装版本。

### 5.2 Dependency Limits

M01 不引入：

- Tailwind 或其他 Utility CSS Framework。
- Storybook 或独立组件预览服务。
- Redux、Zustand、MobX 等全局状态库。
- React Router 或其他 Router。
- Material UI、Ant Design、Chakra UI 等组件库。
- Playwright 或其他 E2E 工具。

增加计划外运行时依赖前，必须更新本 SPEC 并说明其不可由现有技术栈满足的理由。

### 5.3 npm Script Contract

前端工程至少提供以下命令：

| Command | Responsibility |
|---|---|
| `npm run dev` | 启动本地 Vite 开发服务 |
| `npm run test -- --run` | 单次运行全部 Vitest 测试并返回进程状态 |
| `npm run build` | 执行 TypeScript 检查并生成生产构建 |

## 6. Visual System（视觉系统）

### 6.1 Theme

M01 仅交付浅色主题。CSS Custom Properties 必须使用语义名称，组件禁止直接散落未命名的颜色、间距、圆角、阴影和层级值。

Token 至少覆盖：

- Canvas、Surface、Elevated Surface。
- Primary、Secondary、Muted Text。
- Border、Divider、Focus Ring。
- Accent、Success、Warning、Danger、Running。
- Font Family、Font Size、Line Height、Font Weight。
- Spacing、Radius、Shadow、Z-index、Motion Duration。

Token 结构允许未来增加深色值，但 M01 不实现第二套主题或切换逻辑。

### 6.2 Language and Copy

- 所有 Fixture 用户可见文案使用简体中文。
- 必要的英文状态或技术名词附中文含义，例如 `Running（运行中）`。
- 按钮文案必须直接表达动作，例如“发送”“停止”“批准”“拒绝”，不使用仅图标且无可访问名称的控件。
- 错误和取消文案必须说明当前结果，不使用无法行动的模糊提示。

## 7. Layout Contract（布局契约）

### 7.1 Desktop Workspace

- 根布局高度为 `100dvh`，页面本身不得产生纵向滚动条。
- Sidebar 默认宽度 280px，折叠后宽度 64px。
- Header 高度 56px。
- Conversation View 和 Composer 位于主内容区域。
- 消息内容列最大宽度 840px，并在主区域中水平居中。
- Conversation View 独立纵向滚动；Header、Sidebar 和 Composer 不随消息滚动离开视口。
- Composer 固定在主区域底部，但不得覆盖最后一条 Timeline Item。
- 代码、命令、长 URL、Tool Input 和 Tool Result 必须在自身容器中换行或横向滚动，不得扩大页面整体宽度。

### 7.2 Supported Viewports

| Viewport | Acceptance Purpose |
|---|---|
| 1440×900 | 标准桌面视觉、留白、内容密度和长会话检查 |
| 1280×720 | 最低支持尺寸、纵向空间、Composer 和滚动边界检查 |

宽度低于 1280px 时不要求重排、抽屉 Sidebar 或移动端导航；实现可以保持最小宽度。不得为了未纳入范围的视口牺牲两个目标视口的可用性。

## 8. Component Responsibilities（组件职责）

| Component | Responsibility | Must Not Own |
|---|---|---|
| App Shell | 组合 Sidebar、Header、主内容和 Fixture Harness | Backend 状态、网络生命周期 |
| Sidebar | 品牌区、会话列表、选中状态、折叠控制 | 会话持久化、CRUD |
| Header | 当前会话标题、Run 状态、Scenario Switcher | Router、Run 状态推断 |
| Conversation View | 渲染当前会话 Timeline、空状态和滚动容器 | Fixture 选择、网络读取 |
| Composer | 草稿输入、发送 Intent、禁用态和运行控制 | 消息持久化、Agent 调用 |
| User Message | 展示用户文本和时间标签 | Markdown 解析策略 |
| Assistant Message | 展示助手文本、部分输出和时间标签 | Streaming 数据拼接 |
| Reasoning | 展示标题、正文、Active 状态和折叠控制 | Reasoning 生成与保存 |
| Tool Call | 展示工具名、摘要、输入、状态和审批操作 | Tool 执行、Permission 决策 |
| Tool Result | 展示成功、失败或取消结果 | 结果截断和持久化策略 |
| Status Notice | 展示 Running、Failed、Cancelled 等说明 | Runtime 状态转换 |
| Scenario Switcher | 切换固定 Scenario 并显示名称与说明 | 修改 Fixture 定义 |
| Intent Monitor | 以 `aria-live` 显示最近一次 UI Intent | 执行业务操作 |

## 9. Presentation Contracts（前端展示契约）

本节固定名称、取值和最小字段，供 M01 组件与测试共同使用。它们不是 Backend API Schema。

### 9.1 Scalar Unions

| Contract | Allowed Values |
|---|---|
| `ScenarioId` | `empty`、`completed`、`running`、`waiting-approval`、`failed`、`cancelled` |
| `RunPresentationStatus` | `idle`、`running`、`waiting_approval`、`completed`、`failed`、`cancelled` |
| `TimelineItemKind` | `user-message`、`assistant-message`、`reasoning`、`tool-call`、`tool-result`、`status-notice` |
| `ToolPresentationStatus` | `requested`、`waiting_approval`、`running`、`completed`、`failed`、`denied`、`cancelled` |
| `ToolResultOutcome` | `success`、`failed`、`cancelled` |
| `NoticeTone` | `info`、`warning`、`danger`、`neutral` |
| `ComposerMode` | `enabled`、`disabled_running`、`disabled_waiting_approval` |

### 9.2 Timeline Items

每个 Timeline Item 必须包含稳定 `id` 和 `kind`。各变体的最小字段如下：

| Kind | Required Fields |
|---|---|
| `user-message` | `id`、`kind`、`content`、`createdAtLabel` |
| `assistant-message` | `id`、`kind`、`content`、`createdAtLabel`、`isPartial` |
| `reasoning` | `id`、`kind`、`title`、`content`、`defaultExpanded`、`isActive` |
| `tool-call` | `id`、`kind`、`toolCallId`、`toolName`、`summary`、`input`、`status`、`requiresApproval` |
| `tool-result` | `id`、`kind`、`toolCallId`、`outcome`、`content`、`durationLabel` |
| `status-notice` | `id`、`kind`、`tone`、`title`、`description` |

`tool-result.toolCallId` 必须引用同一 Timeline 中已出现的 `tool-call.toolCallId`。Timeline 顺序就是视觉和语义阅读顺序，组件不得按 Kind 重新排序。

### 9.3 Conversation Fixture

每个 `ConversationFixture` 包含：

- `id`：稳定字符串 ID。
- `title`：Sidebar 与 Header 使用的简体中文标题。
- `updatedAtLabel`：只用于展示的确定性时间文本。
- `timeline`：按展示顺序排列的 Timeline Item 列表。

Fixture 不使用运行时生成的当前时间、随机数或网络数据。

### 9.4 UiScenario

每个 `UiScenario` 包含：

- `id: ScenarioId`。
- `name`：用户可见的简体中文名称。
- `description`：说明该场景验证的状态。
- `runStatus: RunPresentationStatus`。
- `conversations: ConversationFixture[]`。
- `activeConversationId: string | null`。
- `composerMode: ComposerMode`。

若 `activeConversationId` 非空，它必须引用 `conversations` 中存在的会话。`empty` 是唯一允许 `activeConversationId` 为 `null` 的场景。

### 9.5 UiIntent

UI 组件只产生以下 Intent：

| Intent Type | Payload | Trigger |
|---|---|---|
| `composer.submit` | `content`：去除首尾空白后的非空文本 | Composer 提交 |
| `run.stop` | 无 | Running 或 Waiting Approval 场景点击“停止” |
| `permission.approve` | `toolCallId` | 待审批 Tool Call 点击“批准” |
| `permission.deny` | `toolCallId` | 待审批 Tool Call 点击“拒绝” |

Fixture Harness 接收 Intent 后只更新 Intent Monitor。它不得增加消息、执行工具、启动计时器、修改 `runStatus` 或模拟后续 Event。

## 10. Fixture Catalog（场景目录）

| Scenario | Required Content | Run Status | Composer |
|---|---|---|---|
| `empty` | 无活动会话；展示产品说明和开始输入提示 | `idle` | `enabled` |
| `completed` | 至少两个可选择会话；活动会话完整展示 User → Reasoning → Tool Call → Tool Result → Assistant | `completed` | `enabled` |
| `running` | User Message、默认展开且 Active 的 Reasoning、Running Status Notice、停止操作 | `running` | `disabled_running` |
| `waiting-approval` | User Message、Reasoning、`waiting_approval` Tool Call、批准/拒绝/停止操作 | `waiting_approval` | `disabled_waiting_approval` |
| `failed` | 已产生的过程内容、失败 Tool Result 或 Assistant Partial Content、Danger Status Notice | `failed` | `enabled` |
| `cancelled` | 已产生的过程内容、Assistant Partial Content、Neutral Status Notice | `cancelled` | `enabled` |

所有场景必须在应用初次加载时可用，不依赖 URL 参数、开发者工具或外部服务。默认场景为 `completed`，以便启动后立即展示 M01 的完整能力。

## 11. Interaction Rules（交互规则）

### 11.1 Scenario Switching

- Scenario Switcher 必须始终可通过键盘访问，并显示当前名称。
- 切换场景后，活动会话恢复为该 Scenario 的 `activeConversationId`。
- Sidebar 恢复展开状态，Composer 草稿清空，Reasoning 恢复 Fixture 中的默认展开值，Intent Monitor 清空。
- 切换不得修改 Fixture 常量。

### 11.2 Conversation Selection

- 选择 Sidebar 会话后，Header 标题和 Conversation View 必须同步更新。
- 选中状态必须同时具有视觉指示和可访问语义。
- 会话选择只存在于当前 Scenario；切换 Scenario 后不保留。

### 11.3 Sidebar

- 折叠按钮在 280px 和 64px 两种状态之间切换。
- 折叠状态隐藏文字但保留图标、可访问名称和当前会话指示。
- 折叠不得改变当前会话或 Timeline。

### 11.4 Reasoning

- `defaultExpanded` 决定场景加载时的初始状态。
- 用户可以独立展开或收起每个 Reasoning Item。
- Active Reasoning 必须具有可理解的运行指示，但动效不能成为传达状态的唯一方式。

### 11.5 Composer

- `enabled` 模式允许输入；仅空白内容时发送按钮禁用。
- `Enter` 提交非空内容，`Shift+Enter` 插入换行。
- 提交时发出 `composer.submit`，Intent payload 使用去除首尾空白后的文本，并清空草稿。
- `disabled_running` 和 `disabled_waiting_approval` 模式禁止编辑和提交，并提供说明当前原因的禁用文案。
- M01 不把提交内容追加到 Timeline。

### 11.6 Run and Permission Controls

- `running` 和 `waiting-approval` 场景显示“停止”；触发后只发出 `run.stop`。
- 待审批 Tool Call 显示“批准”和“拒绝”；触发后分别发出对应 Permission Intent。
- Intent 发出后场景和按钮状态保持不变，用户通过 Scenario Switcher 查看其他状态快照。

## 12. Empty, Error, Overflow and Motion Rules（空态、错误、溢出与动效）

- Empty State 必须说明用户可以在 Composer 中开始输入，不能只显示空白区域。
- Failed State 必须保留失败前已展示的内容，并用标题与描述说明失败结果。
- Cancelled State 必须与 Failed 使用不同语义和视觉强度。
- Tool Input、Tool Result、代码块和长单词必须限制在 840px 内容列内。
- Timeline 为空、内容极长或只有一个 Item 时，Composer 与滚动容器仍保持正确位置。
- 动效只用于反馈状态变化，必须支持 `prefers-reduced-motion`；禁用动效后不能丢失状态含义。

## 13. Accessibility Requirements（可访问性要求）

- Sidebar 使用 `nav`，Header 使用 `header`，主要内容使用 `main`，Composer 使用 `form`。
- 所有交互元素可以只用键盘访问和触发。
- 所有 Icon Button 具有明确 Accessible Name（可访问名称）。
- 焦点样式在浅色背景和交互表面上清晰可见。
- 当前会话、当前 Scenario、折叠状态和展开状态具有程序化语义。
- Intent Monitor 和 Run 状态说明使用适当的 `aria-live`，但场景初次渲染不得产生重复播报。
- 不只依赖颜色区分 Running、Waiting Approval、Failed 和 Cancelled。
- 文本和关键控件的 Token 组合以 WCAG AA 对比度为验收目标。

## 14. Requirements and Acceptance Matrix（需求与验收矩阵）

| ID | Requirement | Automated Evidence | Human Evidence |
|---|---|---|---|
| `M01-R01` | `frontend/` 可以通过 npm 安装、启动、测试和构建 | Smoke Test；`npm run test -- --run`；`npm run build` | 启动后可打开应用 |
| `M01-R02` | 使用 CSS Modules、语义化浅色 Token 和规定的最小依赖 | Token / Style Import 测试或静态检查；构建通过 | 检查浅色视觉一致性 |
| `M01-R03` | 桌面 App Shell 满足固定尺寸和独立滚动契约 | 壳层组件与 class/state 测试 | 1440×900、1280×720 检查 |
| `M01-R04` | Sidebar、Header、Conversation View、Composer 和 Empty State 完整可用 | RTL 组件测试 | 检查布局与内容层级 |
| `M01-R05` | 六类 Timeline Item 均按展示契约渲染 | 每个 Kind 的组件状态测试 | Completed 场景逐项检查 |
| `M01-R06` | 六个固定 Scenario 可确定性切换并重置局部状态 | Scenario 切换与重置测试 | 逐个切换并核对说明 |
| `M01-R07` | 会话选择、Sidebar 折叠、Reasoning 展开和 Composer 规则正确 | `user-event` 交互测试 | 键盘和鼠标操作检查 |
| `M01-R08` | 四类 UiIntent payload 正确且无 Runtime 副作用 | Intent callback 与 Harness 集成测试 | Intent Monitor 逐项检查 |
| `M01-R09` | Running、Waiting Approval、Failed、Cancelled 具有不同且明确的状态表达 | 状态组件测试 | 场景间视觉与文案检查 |
| `M01-R10` | 长消息、代码和 Tool 内容不破坏整体宽度或 Composer 位置 | Overflow Fixture 组件测试 | 两档视口滚动检查 |
| `M01-R11` | 语义结构、键盘、焦点、Accessible Name 和状态播报满足基础要求 | 语义查询与键盘交互测试 | 完整键盘遍历与焦点检查 |
| `M01-R12` | M01 不包含 Backend、网络、持久化、Router、真实状态机或异步 Mock | 依赖与源码静态检查 | 架构一致性审查 |

自动验证的统一命令：

```powershell
cd frontend
npm run test -- --run
npm run build
```

## 15. Definition of Done（完成定义）

M01 只有同时满足以下条件才可以进入人工验收：

- `M01-R01` 至 `M01-R12` 均有与矩阵一致的证据。
- 六个 Scenario 可以从应用内切换，且没有外部服务依赖。
- `npm run test -- --run` 和 `npm run build` 返回成功状态。
- 1440×900 和 1280×720 人工检查通过。
- 应用在键盘操作、焦点可见性、长内容和独立滚动方面没有阻断问题。
- 实际依赖和实现范围符合本 SPEC，没有提前实现 M02–M05 能力。
- PLAN 和 TASK 对 Requirement ID 的引用与本文件一致。
