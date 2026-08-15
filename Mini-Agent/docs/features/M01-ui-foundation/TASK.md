# M01-P01 — Frontend Foundation & App Shell TASK

## 执行边界

- 只实现 `M01-P01`；完成后停下，不展开 `M01-P02` 或 `M01-P03`。
- 前端固定放在 `frontend/`，使用 React、Vite、TypeScript、npm、CSS Modules 和 CSS Custom Properties（CSS 自定义属性）。
- 只做浅色桌面 UI；不加入 Backend、网络请求、持久化、Router（路由）、真实/异步 Agent Runtime、全局状态库或组件库。
- 两张参考图是视觉事实源：`docs/references/主界面.png`、`docs/references/codex缩小界面.png`。
- P01 的 Sidebar 只需支持由 props 展示展开/折叠两态；不接入点击切换。Composer 只实现外壳几何，不实现完整输入与发送行为。
- 每个 TASK 完成后只运行其必要测试；最后一个 TASK 才执行 P01 全量测试、生产构建和人工视觉检查。

---

## M01-P01-T01 — 初始化前端工程与测试基线

**task_id:** `M01-P01-T01`  
**goal:** 创建可安装、可启动、可测试、可生产构建的最小 React 前端工程。  
**depends_on:** `[]`  
**wave:** `1`  
**status:** `ready`

**write_scope:**

- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/index.html`
- `frontend/tsconfig*.json`
- `frontend/vite.config.ts`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/test/setup.ts`
- `frontend/src/App.test.tsx`

**expected_output:**

- 配置 `dev`、`test`、`build` scripts（脚本）。
- 安装 React、Vite、TypeScript、`lucide-react`、Vitest、React Testing Library、`user-event`、`jest-dom` 和 `jsdom` 所需依赖。
- `main.tsx` 能挂载最小 `App`；Smoke Test（冒烟测试）能证明应用成功渲染。
- 不创建业务数据、Fixture、Timeline、API Client 或 Router。

**verification:**

```powershell
cd frontend
npm install
npm run test -- --run
npm run build
```

---

## M01-P01-T02 — 建立全局样式与 Design Tokens

**task_id:** `M01-P01-T02`  
**goal:** 建立后续 Shell 组件唯一使用的浅色视觉基础。  
**depends_on:** `[M01-P01-T01]`  
**wave:** `2`  
**status:** `pending`

**write_scope:**

- `frontend/src/styles/tokens.css`
- `frontend/src/styles/global.css`
- `frontend/src/styles/tokens.test.ts`
- `frontend/src/main.tsx`（仅接入全局样式）

**expected_output:**

- Token（设计令牌）覆盖 Surface、Text、Border、State、Typography、Spacing、Icon、Radius、Shadow、Layer、Motion 和 Focus。
- 全局样式包含 `box-sizing`、字体栈、`100dvh` 根高度、默认文本/背景、按钮继承字体、可见 `:focus-visible` 和 `prefers-reduced-motion`。
- Token 命名按语义用途，不在组件中散落重复的颜色、字号、圆角或阴影常量。
- Contract Test（契约测试）验证上述 Token 类别均存在。

**verification:**

```powershell
cd frontend
npm run test -- --run src/styles/tokens.test.ts
npm run build
```

---

## M01-P01-T03 — 实现顶部栏与会话 Header

**task_id:** `M01-P01-T03`  
**goal:** 用纯展示组件实现参考图中的顶部窗口栏和 Conversation Header（会话标题栏）。  
**depends_on:** `[M01-P01-T02]`  
**wave:** `3`  
**status:** `pending`

**write_scope:**

- `frontend/src/components/shell/ApplicationTopBar.tsx`
- `frontend/src/components/shell/ApplicationTopBar.module.css`
- `frontend/src/components/shell/ApplicationTopBar.test.tsx`
- `frontend/src/components/shell/ConversationHeader.tsx`
- `frontend/src/components/shell/ConversationHeader.module.css`
- `frontend/src/components/shell/ConversationHeader.test.tsx`

**expected_output:**

- Top Bar 包含 Sidebar Toggle、Back、Forward、文件、编辑、视图、帮助，以及最小化、最大化、关闭视觉按钮。
- Conversation Header 包含 Folder/Workspace、可截断标题、Overflow，以及参考图右侧的文件夹下拉、列表/控制和视图布局按钮。
- 使用 `lucide-react` 的统一线性图标；全部 Icon Button（图标按钮）具有 Accessible Name（可访问名称）。
- 组件只通过 props 接收标题等展示数据；按钮不伪造业务结果，也不接入 Scenario/Runtime 状态。
- 测试按 role/name 验证全部主要控件，并验证长标题具备可截断样式契约。

**verification:**

```powershell
cd frontend
npm run test -- --run src/components/shell/ApplicationTopBar.test.tsx src/components/shell/ConversationHeader.test.tsx
```

---

## M01-P01-T04 — 实现 Sidebar 两种视觉状态

**task_id:** `M01-P01-T04`  
**goal:** 实现与参考图内容密度接近、可由 props 展示 280px/64px 两态的 Sidebar（侧边栏）。  
**depends_on:** `[M01-P01-T02]`  
**wave:** `3`  
**status:** `pending`

**write_scope:**

- `frontend/src/components/shell/Sidebar.tsx`
- `frontend/src/components/shell/Sidebar.module.css`
- `frontend/src/components/shell/Sidebar.test.tsx`

**expected_output:**

- 展开态包含 Codex 品牌/下拉、Search、Notification、New Chat、Pull Request、Sites、Scheduled、Plugins。
- 包含 Pinned、Project、Recent 分组、足量静态列表项、当前项高亮、独立滚动区和用户 Footer。
- 折叠态宽 64px，仅保留必要图标与用户入口；展开态宽 280px；两态不改变当前项数据。
- 列表密度、行高、留白、选中面和分隔关系贴近参考图；长标题截断，不撑宽布局。
- 所有可交互视觉控件有 Accessible Name；P01 不实现点击折叠、搜索或会话切换。
- 测试分别渲染两态，验证分组、当前项、滚动容器、Footer、状态 class/data attribute 和主要 role/name。

**verification:**

```powershell
cd frontend
npm run test -- --run src/components/shell/Sidebar.test.tsx
```

---

## M01-P01-T05 — 组装 App Shell 并通过 P01 Gate

**task_id:** `M01-P01-T05`  
**goal:** 将已有组件组装为完整桌面 App Shell，并完成 P01 的自动验证与人工视觉检查。  
**depends_on:** `[M01-P01-T03, M01-P01-T04]`  
**wave:** `4`  
**status:** `pending`

**write_scope:**

- `frontend/src/app/AppShell.tsx`
- `frontend/src/app/AppShell.module.css`
- `frontend/src/app/AppShell.test.tsx`
- `frontend/src/components/shell/ComposerShell.tsx`
- `frontend/src/components/shell/ComposerShell.module.css`
- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`

**expected_output:**

- 根布局为 `100dvh`，同时显示 Application Top Bar、Sidebar、56px Conversation Header、Main 和 Composer Shell。
- `AppShell` 接受 `sidebarCollapsed` 展示属性；默认应用使用展开态，不在 P01 接线切换交互。
- Main 拥有独立纵向滚动容器和水平居中的 840px Timeline Slot（时间线插槽）；页面根节点不承担会话滚动。
- Composer Shell 位于 Main 底部，具备参考图相近的宽度、圆角、Border、Shadow 和悬浮关系；Main 的底部留白保证未来最后一个 Timeline Item 不会被遮挡。
- 1440×900 下五个 Shell 区域同时可见；1280×720 下 Header/Composer 不重叠，Sidebar/Main 保持独立，长标题不造成横向溢出。
- 集成测试验证 landmarks（语义区域）、主要按钮、展开/折叠 layout state（布局状态）、Main 滚动边界和 Composer Slot；源码与依赖中不存在 M01 禁止项。

**verification:**

```powershell
cd frontend
npm run test -- --run
npm run build
npm run dev
```

人工检查（不是 M01 最终验收）：

1. 在 1440×900 对照两张参考图，依次检查 Layout、Spacing、Typography、Icon、Border/Radius；先修复前三类阻断项。
2. 检查 Top Bar、Sidebar、Conversation Header、Main、Composer Shell 的比例、固定关系、滚动边界和主要控件覆盖。
3. 在 1280×720 检查无区域重叠、无页面级横向溢出、Main 可独立滚动、主要 Shell 控件可见。
4. 用键盘逐一到达主要按钮，确认 Focus 可见且 Accessible Name 正确。
5. 确认应用没有 Backend、网络、持久化、Router、Fixture、Timeline 或真实交互状态机；记录 P01 Gate 结果后停止。

---

# M01-P02 — Conversation UI TASK

## 执行边界

- 仅在 `M01-P01` Gate 通过后执行；复用既有 App Shell 和 Design Tokens，不重做 P01 布局。
- 只实现 `M01-P02`：Presentation Model（展示模型）、Timeline 组件、Run 展示状态、完整 Composer 和静态 Completed 展示。
- 展示组件只接收 props/callback，不导入 Scenario；六个 Fixture、Acceptance Panel、应用级状态重置留给 `M01-P03`。
- UiIntent（界面意图）回调只上报意图，不追加 Timeline、不改变 Run 状态，也不执行网络、持久化或工具行为。
- 每个 TASK 完成后运行其必要测试；最后一个 TASK 执行 P02 全量测试、生产构建和人工视觉检查。

---

## M01-P02-T01 — 定义 Presentation Model 与 UiIntent

- **task_id:** `M01-P02-T01`
- **goal:** 建立所有 Conversation 组件共享的稳定类型和回调契约。
- **depends_on:** `[M01-P01-T05]`
- **wave:** `1`
- **status:** `pending`

**write_scope:**

- `frontend/src/presentation/types.ts`
- `frontend/src/presentation/uiIntent.ts`
- `frontend/src/presentation/index.ts`
- `frontend/src/presentation/presentation.test.ts`

**expected_output:**

- 准确定义 `RunPresentationStatus`、`TimelineItemKind`、`ToolPresentationStatus`、`ToolResultOutcome`、`ComposerMode` 的 SPEC 取值。
- 用 Discriminated Union（可辨识联合）定义六类 `TimelineItem`，保留 SPEC 要求的稳定 `id`、`kind` 和各类必需字段。
- 定义四类 `UiIntent` 及统一 `UiIntentHandler`：`composer.submit`、`run.stop`、`permission.approve`、`permission.deny`。
- `presentation/` 不依赖 `fixtures/`、React、浏览器 API 或 Backend 类型；不创建 `UiScenario` 或 Fixture 数据。
- 类型契约测试覆盖全部允许值、六类 Item 和四类 Intent，错误取值通过 TypeScript 类型检查被拒绝。

**verification:**

```powershell
cd frontend
npm run test -- --run src/presentation/presentation.test.ts
npm run build
```

---

## M01-P02-T02 — 实现 Message 与 Reasoning 组件

- **task_id:** `M01-P02-T02`
- **goal:** 实现 User、Assistant 和 Reasoning 的全部纯展示状态。
- **depends_on:** `[M01-P02-T01]`
- **wave:** `2`
- **status:** `pending`

**write_scope:**

- `frontend/src/components/conversation/UserMessage.tsx`
- `frontend/src/components/conversation/UserMessage.module.css`
- `frontend/src/components/conversation/AssistantMessage.tsx`
- `frontend/src/components/conversation/AssistantMessage.module.css`
- `frontend/src/components/conversation/Reasoning.tsx`
- `frontend/src/components/conversation/Reasoning.module.css`
- `frontend/src/components/conversation/MessageAndReasoning.test.tsx`

**expected_output:**

- User Message 使用右对齐浅灰面板，显示正文、时间和参考图可见的辅助操作。
- Assistant Message 显示正文、时间/耗时、分隔线、反馈/辅助按钮和可识别的 Partial（未完成）状态。
- Reasoning 接收受控 `expanded`、`isActive` 和 toggle callback；具备标题、正文、展开/收起控制、`aria-expanded` 及 Active/Completed 非纯颜色表达。
- 长段落和长 URL 可换行，不扩大 Timeline 或页面宽度；全部 Icon Button 具有 Accessible Name。
- 测试覆盖 User/Assistant 对齐、Assistant Partial、Reasoning 展开/收起/Active/Completed、toggle callback 和长内容契约。

**verification:**

```powershell
cd frontend
npm run test -- --run src/components/conversation/MessageAndReasoning.test.tsx
```

---

## M01-P02-T03 — 实现 Tool 与 Status 组件

- **task_id:** `M01-P02-T03`
- **goal:** 实现工具请求、工具结果和 Run 状态的全部展示变体。
- **depends_on:** `[M01-P02-T01]`
- **wave:** `2`
- **status:** `pending`

**write_scope:**

- `frontend/src/components/conversation/ToolCall.tsx`
- `frontend/src/components/conversation/ToolCall.module.css`
- `frontend/src/components/conversation/ToolResult.tsx`
- `frontend/src/components/conversation/ToolResult.module.css`
- `frontend/src/components/conversation/StatusNotice.tsx`
- `frontend/src/components/conversation/StatusNotice.module.css`
- `frontend/src/components/conversation/ToolAndStatus.test.tsx`

**expected_output:**

- Tool Call 显示名称、摘要、输入、状态；覆盖 `requested`、`waiting_approval`、`running`、`completed`、`failed`、`denied`、`cancelled`。
- `waiting_approval` 且 `requiresApproval` 时显示 Approve/Deny；点击后分别上报带当前 `toolCallId` 的 Permission UiIntent。
- Tool Result 覆盖 `success`、`failed`、`cancelled`，显示耗时和受限的预格式化内容。
- Status Notice 分别表达 Running、Waiting Approval、Failed、Cancelled，状态含义不只依赖颜色。
- Tool Input/Result 在自身容器内换行或横向滚动，并限制高度/宽度；审批按钮可键盘操作且名称明确。
- 测试覆盖全部 Tool 状态、三种 Result outcome、四种 Notice、Permission payload 和长预格式化内容。

**verification:**

```powershell
cd frontend
npm run test -- --run src/components/conversation/ToolAndStatus.test.tsx
```

---

## M01-P02-T04 — 实现完整 Composer

- **task_id:** `M01-P02-T04`
- **goal:** 用完整可测试的 Composer 替代 P01 的几何占位内容。
- **depends_on:** `[M01-P02-T01]`
- **wave:** `2`
- **status:** `pending`

**write_scope:**

- `frontend/src/components/composer/Composer.tsx`
- `frontend/src/components/composer/Composer.module.css`
- `frontend/src/components/composer/Composer.test.tsx`

**expected_output:**

- 实现 `enabled`、`disabled_running`、`disabled_waiting_approval` 三种 `ComposerMode`，禁用原因有可见文本。
- 包含 Textarea、Attachment、Permission/Access、状态指示、Model Selector、Microphone 和 Send/Stop；位置、密度、圆角和阴影贴近参考图。
- `enabled` 下空白不可提交；Enter 提交去除首尾空白后的内容并清空草稿；Shift+Enter 插入换行。
- Running/Waiting Approval 下 Textarea 禁用并显示 Stop；Stop 上报 `run.stop`。Attachment、Model、Microphone 等占位控件不伪造业务结果。
- 所有控件具备 Hover、Focus、Disabled 状态和 Accessible Name；组件只通过 `UiIntentHandler` 上报意图。
- 测试覆盖输入、空白、Enter、Shift+Enter、清空、三种 Mode、Submit/Stop payload 和主要 role/name。

**verification:**

```powershell
cd frontend
npm run test -- --run src/components/composer/Composer.test.tsx
```

---

## M01-P02-T05 — 集成 Timeline、Composer 并通过 P02 Gate

- **task_id:** `M01-P02-T05`
- **goal:** 将六类 Timeline Item 和完整 Composer 集成进既有 App Shell，形成可独立展示的 Completed Conversation。
- **depends_on:** `[M01-P02-T02, M01-P02-T03, M01-P02-T04]`
- **wave:** `3`
- **status:** `pending`

**write_scope:**

- `frontend/src/components/conversation/ConversationTimeline.tsx`
- `frontend/src/components/conversation/ConversationTimeline.module.css`
- `frontend/src/components/conversation/ConversationTimeline.test.tsx`
- `frontend/src/app/completedConversation.ts`
- `frontend/src/app/AppShell.tsx`（仅接入 Timeline/Composer slot）
- `frontend/src/app/AppShell.module.css`（仅调整内容与 Composer 的滚动/留白关系）
- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`

**expected_output:**

- `ConversationTimeline` 按输入顺序分发六类 Item，组件本身不持有 Scenario 或 Runtime 状态。
- 静态 Completed 数据使用固定 ID/时间/中文内容，顺序至少为 User → Reasoning → Tool Call → Tool Result → Assistant；它不是 P03 Fixture Harness。
- Timeline 保持最大 840px、居中、独立滚动和参考图接近的段落密度；完整 Composer 替换 P01 占位内容且不遮挡最后一项。
- 集成后的 callback 只可观察，不改变静态数据；P01 Top Bar、Sidebar、Header 和布局契约保持通过。
- 集成测试覆盖六类 Item 分发、语义阅读顺序、主要会话/Composer 控件、长内容宽度安全和无 Runtime 副作用。
- 若新增动效，提供 `prefers-reduced-motion` 分支；Failed/Cancelled/Partial 等状态保持非纯颜色表达。

**verification:**

```powershell
cd frontend
npm run test -- --run
npm run build
npm run dev
```

人工检查（不是 M01 最终验收）：

1. 在 1440×900 使用静态 Completed 展示，对照参考图检查 User、Reasoning、Tool、Assistant、Composer 的 Layout、Spacing、Typography。
2. 继续检查 Icon、Border/Radius、Hover、Focus、Expanded、Disabled 及各 Run/Tool 状态；修复前三类视觉阻断项。
3. 在 1280×720 检查 Timeline/Composer 无重叠，长消息、长 URL、Tool Input/Result 不造成页面级横向溢出，主要操作仍可到达。
4. 仅用键盘操作 Reasoning、Composer 和审批/停止按钮，确认状态与 Accessible Name 清晰。
5. 确认全量测试和构建通过，且源码中没有 Scenario Harness、Backend、网络、持久化、Router 或异步 Agent Runtime；记录 P02 Gate 后停止。

---

# M01-P03 — Fixture, Interaction & Acceptance TASK

## 执行边界

- 仅在 `M01-P02` Gate 通过后执行；复用 P01 Shell 和 P02 展示组件，不重写既有视觉边界。
- 只实现确定性 Fixture、本地 UI 状态、Acceptance Panel、交互接线、回归验证和最终 M01 Acceptance（里程碑验收）。
- 所有状态变化均为本地同步展示；不使用网络、持久化、Router、计时器驱动流程或真实/异步 Agent Runtime。
- UiIntent 只更新 Intent Monitor；Timeline、Scenario、Run Status 和 Tool 状态保持 Fixture 原值。
- 每个 TASK 完成后运行其必要测试，并仅对 `write_scope` 内新增源码/测试文件执行 `git add`；`dist/`、`node_modules/` 等构建或依赖目录不进入暂存区。
- 前四个 TASK 只做 TASK 级验证；最后一个 TASK 执行 P03 Gate 和唯一一次 M01 Feature Acceptance。

---

## M01-P03-T01 — 建立六个确定性 Fixture Scenario

- **task_id:** `M01-P03-T01`
- **goal:** 实现 SPEC 规定的 Scenario 类型、固定数据和可自动检查的不变量。
- **depends_on:** `[M01-P02-T05]`
- **wave:** `1`
- **status:** `pending`

**write_scope:**

- `frontend/src/presentation/types.ts`（补充 `ScenarioId`、`ConversationFixture`、`UiScenario`）
- `frontend/src/fixtures/scenarios.ts`
- `frontend/src/fixtures/index.ts`
- `frontend/src/fixtures/scenarios.test.ts`

**expected_output:**

- 提供且仅提供 `empty`、`completed`、`running`、`waiting-approval`、`failed`、`cancelled` 六个唯一 Scenario；默认 ID 导出为 `completed`。
- `UiScenario` 准确包含 `id`、`name`、`description`、`runStatus`、`conversations`、`activeConversationId`、`composerMode`。
- 各 Scenario 内容、Run Status 和 Composer Mode 符合 SPEC；`completed` 至少两个会话并完整包含 User → Reasoning → Tool Call → Tool Result → Assistant。
- 使用固定 ID、固定时间文案和固定简体中文内容；不读取当前时间、不使用随机数、网络或计时器。
- 测试验证 ID 完整且唯一、Active Conversation 引用有效、Tool Result 只引用此前出现的 Tool Call、Run/Composer 配对正确以及各场景必需内容存在。

**verification:**

```powershell
cd frontend
npm run test -- --run src/fixtures/scenarios.test.ts
npm run build
git add -- src/presentation/types.ts src/fixtures/scenarios.ts src/fixtures/index.ts src/fixtures/scenarios.test.ts
```

---

## M01-P03-T02 — 实现 Acceptance Panel

- **task_id:** `M01-P03-T02`
- **goal:** 实现可由 Header Overflow 承载的受控验收面板组件。
- **depends_on:** `[M01-P03-T01]`
- **wave:** `2`
- **status:** `pending`

**write_scope:**

- `frontend/src/components/acceptance/AcceptancePanel.tsx`
- `frontend/src/components/acceptance/AcceptancePanel.module.css`
- `frontend/src/components/acceptance/ScenarioSwitcher.tsx`
- `frontend/src/components/acceptance/IntentMonitor.tsx`
- `frontend/src/components/acceptance/AcceptancePanel.test.tsx`

**expected_output:**

- Panel 显示 Scenario Switcher、当前场景名称/说明、Intent Monitor 和关闭按钮；所有状态与事件通过 props/callback 输入输出。
- Scenario Switcher 可用键盘操作，选择后上报准确 `ScenarioId`；不直接修改 Fixture 或应用状态。
- Intent Monitor 使用 `aria-live` 展示最近一次 UiIntent 的类型和 payload；无 Intent 时有明确空态。
- Panel 关闭时不占据主布局空间；打开时不改变 App Shell、Timeline 或 Composer 的尺寸基线。
- 测试覆盖六个选项、场景选择 callback、Intent 四类显示、`aria-live`、关闭 callback 和主要 Accessible Name。

**verification:**

```powershell
cd frontend
npm run test -- --run src/components/acceptance/AcceptancePanel.test.tsx
git add -- src/components/acceptance/AcceptancePanel.tsx src/components/acceptance/AcceptancePanel.module.css src/components/acceptance/ScenarioSwitcher.tsx src/components/acceptance/IntentMonitor.tsx src/components/acceptance/AcceptancePanel.test.tsx
```

---

## M01-P03-T03 — 实现确定性 UI Harness State

- **task_id:** `M01-P03-T03`
- **goal:** 用纯本地状态模型统一管理场景、会话、Sidebar、Reasoning、Composer 重置和最近 Intent。
- **depends_on:** `[M01-P03-T01]`
- **wave:** `2`
- **status:** `pending`

**write_scope:**

- `frontend/src/app/uiHarness.ts`
- `frontend/src/app/uiHarness.test.ts`

**expected_output:**

- 初始状态固定为 `completed`、其默认活动会话、Sidebar 展开、Fixture 默认 Reasoning 展开状态、空 Intent，Acceptance Panel 默认关闭。
- 支持 Scenario 选择、Conversation 选择、Sidebar 折叠、Reasoning 独立切换、Panel 开关和 UiIntent 记录。
- Scenario 切换后恢复目标 Fixture 的默认会话、Sidebar、Reasoning、Composer 草稿和 Intent；提供显式且可测试的 Composer reset key（重置键）或等价机制。
- Conversation 切换不改变 Sidebar 折叠状态；Sidebar 切换不改变当前会话；无效会话/Reasoning ID 不破坏状态。
- 记录 UiIntent 时仅替换最近 Intent，不修改 Scenario、Run Status、Composer Mode、Timeline 数量或 Tool 状态；Fixture 对象保持不可变。
- Reducer/状态测试覆盖所有 action、默认状态、完整重置、不变量和连续切换。

**verification:**

```powershell
cd frontend
npm run test -- --run src/app/uiHarness.test.ts
git add -- src/app/uiHarness.ts src/app/uiHarness.test.ts
```

---

## M01-P03-T04 — 接入全部本地交互与 UiIntent Harness

- **task_id:** `M01-P03-T04`
- **goal:** 将 Fixture、Acceptance Panel 和 Harness State 接入现有 Shell、Timeline 与 Composer。
- **depends_on:** `[M01-P03-T02, M01-P03-T03]`
- **wave:** `3`
- **status:** `pending`

**write_scope:**

- `frontend/src/App.tsx`
- `frontend/src/app/AppShell.tsx`
- `frontend/src/components/shell/ApplicationTopBar.tsx`
- `frontend/src/components/shell/Sidebar.tsx`
- `frontend/src/components/shell/ConversationHeader.tsx`
- `frontend/src/components/conversation/ConversationTimeline.tsx`
- `frontend/src/components/conversation/EmptyConversation.tsx`
- `frontend/src/components/conversation/EmptyConversation.module.css`
- `frontend/src/components/composer/Composer.tsx`（仅补充受控重置接口）
- `frontend/src/app/AppHarness.test.tsx`

**expected_output:**

- 应用默认显示 `completed`，Acceptance Panel 关闭；Header Overflow 打开 Panel，关闭后参考图主布局保持不变。
- 切换六个 Scenario 后 Header、Sidebar、Timeline、Run 状态和 Composer Mode 同步，`empty` 显示可用空态。
- Conversation Switch 同步更新 Sidebar 选中项、Header 标题和 Timeline；Top Bar Toggle 在 280px/64px 间切换 Sidebar。
- Reasoning 可独立展开/收起；Composer 输入、Enter、Shift+Enter、提交/清空以及 Running/Waiting Approval 的 Stop 行为保持 P02 契约。
- Submit、Stop、Approve、Deny 的准确 UiIntent 显示在 Intent Monitor；触发前后的 Scenario、Run Status、Timeline 数量和 Fixture 数据不变。
- Scenario 切换完整重置会话、Sidebar、Reasoning、Composer 和 Intent；所有真实交互可用键盘完成。
- `user-event` 集成测试覆盖上述交互、重置、四类 Intent payload、无 Runtime 副作用和主要 Accessible Name。

**verification:**

```powershell
cd frontend
npm run test -- --run src/app/AppHarness.test.tsx
npm run build
git add -- src/App.tsx src/app/AppShell.tsx src/components/shell/ApplicationTopBar.tsx src/components/shell/Sidebar.tsx src/components/shell/ConversationHeader.tsx src/components/conversation/ConversationTimeline.tsx src/components/conversation/EmptyConversation.tsx src/components/conversation/EmptyConversation.module.css src/components/composer/Composer.tsx src/app/AppHarness.test.tsx
```

---

## M01-P03-T05 — 完成 Regression 与 M01 Feature Acceptance

- **task_id:** `M01-P03-T05`
- **goal:** 补齐跨组件回归证据，完成两档视口检查和 M01 唯一一次正式验收。
- **depends_on:** `[M01-P03-T04]`
- **wave:** `4`
- **status:** `pending`

**write_scope:**

- `frontend/src/test/m01Regression.test.tsx`
- `frontend/src/test/sourceBoundary.test.ts`
- `frontend/src/app/AppShell.module.css`（仅修复验收发现的布局/溢出问题）
- `frontend/src/components/**/*.module.css`（仅修复验收发现的视觉、焦点或 Reduced Motion 问题）
- P03 T01–T04 创建或修改的文件（仅修复失败验证，并在完成报告中说明原因）

**expected_output:**

- Regression Test（回归测试）引用全部 Shell 区域、六类 Timeline Kind、三种 Composer Mode、六个 Scenario 和四类 UiIntent；关键测试不存在 skip/todo。
- Source Boundary Test（源码边界测试）确认依赖和源码没有 Backend Client、网络、持久化、Router、异步 Mock Agent、计时器状态转换、全局状态库或禁止的 UI 技术。
- 默认 `completed` 且 Panel 关闭；六场景切换、状态重置、Conversation/Sidebar/Reasoning/Composer 交互和 UiIntent 不变量全部通过。
- 语义、键盘、Accessible Name、长内容、overflow、Focus、状态非纯颜色表达和 `prefers-reduced-motion` 均有自动或人工证据。
- `M01-R01` 至 `M01-R12` 均有证据；P01、P02、P03 最新测试与生产构建返回退出码 0。

**verification:**

```powershell
cd frontend
npm run test -- --run
npm run build
git add -- src/test/m01Regression.test.tsx src/test/sourceBoundary.test.ts
npm run dev
```

人工验收：

1. 在 1440×900 使用默认 `completed` 且关闭 Panel，对照两张参考图逐区检查全部可见区域和控件。
2. 按 Layout → Spacing → Typography → Icon → Border/Radius → Interaction State → Content Density 评审；验收前清零前三类阻断项。
3. 打开 Panel，逐一检查六个 Scenario，以及 Hover、Focus、Selected、Expanded、Disabled、Running、Waiting Approval、Failed、Cancelled。
4. 在 1280×720 检查 Sidebar 两态、Header/Timeline/Composer 无重叠、长内容裁切/滚动和主要操作可达。
5. 仅用键盘完成场景、会话、Reasoning、Composer 和当前场景操作；确认所有主要 Icon Button 具有 Accessible Name。
6. 检查 `git status --short`，确认新增源码/测试文件已跟踪，构建产物和依赖目录未暂存。
7. 自动与人工证据全部通过后记录 M01 Feature Acceptance；停止，不生成或实现 M02。
