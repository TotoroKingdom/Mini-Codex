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
