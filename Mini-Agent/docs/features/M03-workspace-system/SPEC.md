# M03 — Workspace System SPEC

## 1. Document Status（文档状态）

| Field | Value |
|---|---|
| Milestone / Feature | `M03 — Workspace System` |
| Status | Ready for TASK decomposition |
| Depends On | `M02 — Backend Foundation` |
| Source | [PROJECT.md](../../PROJECT.md)、[ARCHITECTURE.md](../../ARCHITECTURE.md)、[ROADMAP.md](../../ROADMAP.md) |

本 SPEC 是 M03 的需求与接口事实源。PLAN 和后续 TASK 可以细化实现步骤，但不得隐式改变本文的 Workspace Ownership（工作区所有权）、Windows Path Contract（Windows 路径契约）、Persistence Schema（持久化模式）、REST API、前端状态或范围边界。

## 2. Goal and Deliverable（目标与交付物）

### 2.1 Goal

在 M02 的 FastAPI、SQLite、Migration 和前端 API Boundary（API 边界）之上，引入第一个业务实体 `Workspace`，建立可供后续 Conversation、Tool 和 Memory 复用的 Local Workspace Root（本地工作区根目录）身份与路径边界，并让用户能够添加、查看、重命名和重新打开已保存的本地项目目录。

### 2.2 Deliverable

M03 完成后必须能够演示以下闭环：

1. 用户在 UI 中输入或粘贴一个绝对 Windows 目录路径，并将它添加为 Workspace。
2. Backend 对路径执行规范化、真实路径解析、存在性、目录类型和基础可访问性检查。
3. Workspace 元数据写入 SQLite；同一路径的大小写、分隔符、`.` / `..` 或 Junction（目录联接）别名不能形成重复记录。
4. UI 展示已保存的 Workspace 列表、当前打开项、路径可用性和安全的错误状态。
5. 用户可以修改 Workspace 的显示名称；重命名不修改磁盘目录名或 Workspace Root。
6. Backend 和 Frontend 重启后，用户仍能从持久列表重新打开该 Workspace。
7. 已保存目录后来缺失、变成文件或不可访问时，列表仍可加载并展示对应状态；重新打开失败且不伪造成功。

## 3. Scope（范围）

### 3.1 In Scope

- `Workspace` Entity（实体）、值约束和 Application Use Case（应用用例）。
- `WorkspaceRepository` Port（仓储端口）及 SQLite Adapter（适配器）。
- Version `2` Workspace Migration，并接入 M02 的有序 Migration Registry（迁移注册表）。
- Windows 绝对路径输入、规范化、真实目标解析、去重、存在性、目录类型和基础读取/列目录能力检查。
- Workspace 创建、列表、重命名和重新打开 REST API。
- 稳定的 Workspace Domain Error（领域错误）代码和 HTTP 映射。
- 前端 Workspace API Client、运行状态、添加表单、列表、重命名、重新打开和刷新/重试交互。
- 可访问的 Loading、Empty、Available、Missing、Not Directory、Inaccessible 和 Request Error 状态。
- Backend pytest、Frontend Vitest/React Testing Library，以及重启后重新打开的人工验收。
- M01 Fixture UI 与 M02 Backend Connection 的累计回归。

### 3.2 Out of Scope

- Conversation、Message、Session、Run、RunEvent、ToolCall、PermissionDecision 或 Memory 的表、实体、Repository 和 API。
- Workspace 删除、归档、收藏、排序设置、分页、搜索、导入/导出或跨设备同步。
- 自动恢复上次打开的 Workspace，或把当前选择持久化为全局 Active Workspace（活动工作区）。
- 浏览器 File System Access API、文件上传、拖放目录、后端驱动的原生 Windows Folder Picker（目录选择器）或系统目录浏览 API。
- Git Repository 检测、分支/状态读取、项目类型识别、Workspace 索引、文件监听或目录内容预览。
- 文件读取、文本搜索、Apply Patch、PowerShell 或任何 Agent Tool；这些能力属于 M09–M11。
- `AGENTS.md` 加载、Context Assembly、Agent Core、DeepSeek、SSE 或 Run Runtime。
- Workspace Root 修改或“移动 Workspace”操作；需要改变路径时，用户添加新的 Workspace。
- UNC Network Share（网络共享）、Windows Device Path（设备路径）或 Extended-length Path Prefix（扩展长度路径前缀）的 v1 支持。
- 通用 Repository Framework、ORM、Unit of Work（工作单元）或跨 Repository 事务抽象。

## 4. Architecture Impact（架构影响）

M03 引入 Architecture 中已经声明的 Workspace 领域能力，不改变既有依赖方向。

| Architecture Area | M03 Decision |
|---|---|
| Entity | 新增 `Workspace`；不新增 Conversation、Session、Run 或 Memory |
| Port | 新增公开业务 Port `WorkspaceRepository` 和 Application 内部 `WorkspacePathResolver`；不创建通用 Repository Base Class 或 Core/Harness Port |
| State Machine | 不修改 Architecture 中的 Session、Run、ToolCall 状态机；前端 Workspace 加载状态不是 Runtime 领域状态机 |
| Event | 不产生 Runtime Event，不引入 SSE 或 Event Store |
| Persistence | 新增 Version `2` Migration 和 `workspaces` 表；保留 M02 Migration 不变量 |
| Public API | 新增 `/api/workspaces` 下的创建、列表、重命名和打开命令 |
| UI | Sidebar 增加真实 Workspace 区域；M01 Conversation Fixture 仍为本地演示数据 |
| Safety | Workspace Root 在进入 Repository 前完成规范化和可访问性检查；API 不提供任意文件读取能力 |

依赖方向固定为：

```text
FastAPI Route / Schema
  → Workspace Application Service
      → WorkspaceRepository Port
      → WorkspacePathResolver Port

SQLiteWorkspaceRepository ──implements──> WorkspaceRepository
WindowsWorkspacePathResolver ──implements──> WorkspacePathResolver
```

- Route 只解析 HTTP 输入、调用用例并映射结果，不直接执行 SQL 或散落路径判断。
- Application Service 编排路径解析、领域不变量和 Repository，不依赖 FastAPI Request/Response。
- `sqlite3.Connection`、`sqlite3.Row` 和 OS Exception（操作系统异常）不得泄漏到 Application/API Contract。
- 路径解析属于 Infrastructure Adapter；Workspace Entity 保存已验证结果，不自行访问文件系统。
- M03 建立的 Workspace Root 身份会被后续 M04 Conversation Ownership 和 M09 Workspace Boundary 复用，但本阶段不预实现这些能力。

## 5. Workspace Domain Contract（工作区领域契约）

### 5.1 Workspace Entity

`Workspace` 至少包含：

| Field | Type | Contract |
|---|---|---|
| `id` | UUID string | Backend 生成的稳定、不透明标识；创建后不变 |
| `name` | string | 用户可修改的显示名称，按 5.2 校验 |
| `root_path` | string | 已解析的绝对 Windows 目录路径；创建后不变 |
| `root_path_key` | string | 仅内部持久化的比较键；不得通过 API 返回 |
| `created_at` | UTC timestamp | 创建时间；创建后不变 |
| `updated_at` | UTC timestamp | 最近一次元数据修改时间 |
| `last_opened_at` | UTC timestamp | 最近一次成功创建/打开时间，用于列表排序 |

Filesystem Availability（文件系统可用性）不是持久化事实，而是读取列表或执行 Open Use Case（打开用例）时从当前文件系统投影：

```text
available | missing | not_directory | inaccessible
```

### 5.2 Entity Invariants（实体不变量）

- `id`、`root_path`、`root_path_key` 和 `created_at` 创建后不可修改。
- `name` 去除首尾空白后长度必须为 `1..80` 个 Unicode Code Point（Unicode 码点）。
- `name` 不允许 C0 Control Character（控制字符）或换行；不同 Workspace 可以同名。
- 未提供 `name` 时，使用规范化目录路径的最后一段作为默认显示名称。
- `updated_at >= created_at`，`last_opened_at >= created_at`；- `created_at`、`updated_at` 和 `last_opened_at` 使用 UTC 时间，并统一序列化为固定毫秒精度的 ISO 8601 字符串：
  `YYYY-MM-DDTHH:mm:ss.SSSZ`
  例如：
  `2026-08-16T08:00:00.000Z`
- Backend 生成和持久化的 Workspace 时间戳必须始终使用该格式，不得混用无小数秒、不同小数秒精度或时区偏移表示。
- 因所有持久化时间均使用同一 UTC 固定宽度格式，SQLite 可以按照 TEXT 值执行时间排序。
- 创建 Workspace 同时视为成功打开一次，因此初始 `last_opened_at` 等于创建时间。
- Rename（重命名）只更新 `name` 和 `updated_at`；不得重命名或移动磁盘目录。
- Open（打开）只在路径重新验证成功后更新 `last_opened_at` 和 `updated_at`。
- List（列表）按 `last_opened_at DESC, created_at DESC, id ASC` 稳定排序。

### 5.3 Ownership Invariants（所有权不变量）

- Workspace 是后续 Conversation 和 Memory 的所有者根，但 M03 不创建这些子实体。
- Workspace Root 不能通过 Rename 或 Open 改变。
- 一个规范化目录在数据库中至多对应一个 Workspace。
- Frontend 当前选择只是 M03 页面运行时状态，不是 Session，也不代表持久授权。

## 6. Windows Path Contract（Windows 路径契约）

### 6.1 Accepted Input

M03 v1 接受 Backend 所在 Windows 主机可访问的 Drive-rooted Absolute Path（盘符绝对路径），例如 `C:\work\mini-agent`。

- 输入先去除首尾空白；内部不展开 `%ENV_VAR%`、`$env:...` 或 `~`。
- 相对路径、空字符串、仅盘符相对路径（如 `C:project`）和 Volume Root（卷根目录，如 `C:\`）拒绝。
- UNC、`\\?\`、`\\.\` 等网络、扩展长度或设备命名空间路径拒绝。
- 不要求目录是 Git Repository，也不要求存在特定项目文件。
- 路径长度、非法字符和保留名称由 Windows/Python 解析结果判定；原始 OS Error 不直接返回给 Client。

### 6.2 Normalization and Identity

路径验证顺序固定为：

```text
Trim input
→ Reject unsupported syntax / non-absolute / volume root
→ Normalize separators and dot segments
→ Resolve existing path and Junction/Symlink target
→ Verify directory type
→ Verify root can be opened for basic listing
→ Build case-insensitive root_path_key
→ Check persistent uniqueness
```

- `root_path` 保存真实解析后的绝对路径，不保存未处理的用户输入。
- 真实目标解析后必须再次确认仍属于受支持的 Drive-rooted Path；指向 UNC 或设备命名空间的别名同样拒绝。
- `root_path_key` 至少统一分隔符、消除尾分隔符并使用 Windows Case-insensitive（大小写不敏感）比较规则。
- 大小写差异、`/` 与 `\` 差异、`.` / `..`、符号链接或 Junction 指向同一最终目录时，必须得到同一 `root_path_key`。
- `root_path_key` 由 Database Unique Constraint（唯一约束）最终保证；Application 层的预检查不能替代数据库约束。
- API 可以返回 `root_path` 供本地用户识别，但不得返回 `root_path_key`。

### 6.3 Availability Check

- `missing`：路径或其解析目标不存在。
- `not_directory`：路径存在，但当前不是目录。
- `inaccessible`：解析或打开根目录进行基础列目录检查时被 OS 拒绝。
- `available`：当前能够解析为目录并打开目录句柄；这不保证每个子文件可读，也不代表具备写权限。
- List 对每条记录独立检查。某一 Workspace 失效不能使整个列表失败。
- Create 和 Open 必须要求 `available`；Rename 不要求路径当前可用。
- 文件系统状态可能在检查后变化。M09+ 的每次文件操作仍必须重新执行 Workspace Boundary（工作区边界）与操作级检查。

## 7. Persistence and Repository Contract（持久化与仓储契约）

### 7.1 Version 2 Migration

M03 在 M02 Version `1` 后注册 `002_workspaces`，最终 Production Schema Version（生产模式版本）为 `2`。

`workspaces` 最小逻辑 Schema：

```text
id               TEXT PRIMARY KEY
name             TEXT NOT NULL
root_path        TEXT NOT NULL
root_path_key    TEXT NOT NULL UNIQUE
created_at       TEXT NOT NULL
updated_at       TEXT NOT NULL
last_opened_at   TEXT NOT NULL
```

- Migration 必须通过既有 Descriptor、Checksum、Registry 和 Runner 执行，不修改已应用的 Version `1` 文件。
- Version `2` DDL 与 `schema_versions` 记录必须遵守 M02 的单 Migration 原子事务。
- 不创建 `conversations`、`sessions`、`messages`、`runs`、`memories` 或未来字段/表。
- Schema 可以使用必要的 `CHECK` 或 Index（索引）保障当前不变量，但不得预设计未来查询体系。

### 7.2 WorkspaceRepository Port

Repository 提供当前用例所需的最小操作：

```text
create(workspace)
list_all()
get_by_id(workspace_id)
get_by_root_path_key(root_path_key)
rename(workspace_id, name, updated_at)
touch_opened(workspace_id, opened_at)
```

Contract Rules（契约规则）：

- SQL 只存在于 SQLite Adapter；Application Service 只依赖 Port。
- Row 必须完整映射为 Workspace；损坏或缺字段的数据不得被静默补默认值。
- `create` 在单个事务中写入完整记录；唯一约束冲突映射为 `workspace_already_exists`。
- `rename` 和 `touch_opened` 必须区分成功与不存在，不能把零行更新伪装成功。
- Repository 不执行路径访问、HTTP 错误映射或 UI 文案生成。
- 每个操作复用 M02 Database Boundary（数据库边界）的短连接和事务语义。

## 8. Application and REST API Contract（应用与 REST API 契约）

### 8.1 Application Use Cases

M03 暴露四个用例：

| Use Case | Behavior |
|---|---|
| Create Workspace | 校验名称与路径，构造 Workspace，持久化，并返回 `available` |
| List Workspaces | 读取稳定排序记录，为每条记录投影当前 Availability；单条失败不影响列表 |
| Rename Workspace | 校验显示名称并更新元数据；不以路径可用性作为成功条件，响应中的 Availability 只做独立投影 |
| Open Workspace | 按 ID 读取，重新校验持久化 Root，成功后更新时间并返回 Workspace |

ID Generator（标识生成器）和 Clock（时钟）必须可注入，以便自动测试确定性验证；生产实现使用 UUID 和 UTC Clock。

### 8.2 HTTP Endpoints

所有 Endpoint 位于 `/api/workspaces`：

| Method | Path | Success | Purpose |
|---|---|---|---|
| `GET` | `/api/workspaces` | `200` | 获取持久 Workspace 列表和实时 Availability |
| `POST` | `/api/workspaces` | `201` | 添加并打开一个 Workspace |
| `PATCH` | `/api/workspaces/{workspace_id}` | `200` | 修改显示名称 |
| `POST` | `/api/workspaces/{workspace_id}/open` | `200` | 重新验证并打开已保存 Workspace |

Create Request：

```json
{
  "root_path": "C:\\work\\mini-agent",
  "name": "Mini Agent"
}
```

`name` 可省略；Rename Request 只允许：

```json
{
  "name": "Mini Agent"
}
```

Workspace Response：

```json
{
  "id": "0db31d98-e622-4ee9-a699-7ab6cfba48f3",
  "name": "Mini Agent",
  "root_path": "C:\\work\\mini-agent",
  "availability": "available",
  "created_at": "2026-08-16T08:00:00.000Z",
  "updated_at": "2026-08-16T08:00:00.000Z",
  "last_opened_at": "2026-08-16T08:00:00.000Z"
}
```

List Response 固定为 `{ "items": WorkspaceResponse[] }`，不直接返回裸 Array（数组），为后续兼容性保留信封，但 M03 不实现分页字段。

### 8.3 Error Contract

Workspace 领域失败使用稳定信封：

```json
{
  "error": {
    "code": "workspace_already_exists",
    "message": "The workspace has already been added.",
    "field": "root_path",
    "workspace_id": "0db31d98-e622-4ee9-a699-7ab6cfba48f3"
  }
}
```

| HTTP | Code | Condition |
|---|---|---|
| `404` | `workspace_not_found` | ID 不存在 |
| `409` | `workspace_already_exists` | 规范化路径已保存；响应必须携带已有 `workspace_id` |
| `422` | `workspace_name_invalid` | 名称为空、过长或包含控制字符 |
| `422` | `workspace_path_invalid` | 路径语法无效、非绝对、卷根或属于不支持的命名空间 |
| `422` | `workspace_path_missing` | 路径不存在 |
| `422` | `workspace_path_not_directory` | 路径不是目录 |
| `403` | `workspace_path_inaccessible` | 解析或基础目录访问被拒绝 |
| `500` | `workspace_persistence_failed` | 非预期持久化失败；响应不包含 SQL、路径或堆栈 |

- Pydantic 的 Malformed JSON / Shape Validation（畸形 JSON / 结构校验）可以保持 FastAPI 标准 `422`；上表只约束 Workspace 领域失败。
- Domain Error Message 使用稳定、安全、可展示文案，不返回原始 `OSError`、SQL、绝对数据库路径或 Traceback（堆栈）。
- Open 失败不得更新 `last_opened_at`；Create 失败不得留下部分记录。
- Rename 不接受 `root_path` 等额外字段；Request/Response Schema 均拒绝未知字段。

### 8.4 HTTP and CORS Evolution

- M02 `/api/health` Contract 保持不变，成功响应的 `schema_version` 累计变为 `2`。
- CORS Allow Methods 从 M02 的 `GET` 扩展到 Workspace UI 必需的 `GET`、`POST`、`PATCH` 和 Preflight `OPTIONS`；JSON Command 的 Request Header 只额外允许 `Content-Type`。仍使用显式 Origin Allowlist 且不启用 Credentials（凭据）。
- Workspace Command 使用 JSON `Content-Type`；不增加文件上传或表单编码。
- API Route 从 App Factory 注入 Workspace Service；测试可以替换为 Fake/Stub，不连接真实用户目录。

## 9. Frontend Workspace Contract（前端工作区契约）

### 9.1 Ownership and Boundaries

```text
frontend/src/
  api/                         # Workspace DTO validation and HTTP client
  app/                         # Workspace lifecycle and App composition
  components/workspaces/      # 纯展示表单、列表、状态和对话框
  components/shell/           # Sidebar 接入点
```

- 只有 `api/` 直接调用 `fetch`、拼接 Workspace URL 或解释 HTTP Status/Payload。
- Component 接收类型化 View Model（视图模型）和 Callback，不导入 API Client。
- App/Application Controller 负责加载、过期请求保护、选择和错误投影，不把逻辑塞入 Sidebar。
- 不使用 `localStorage`、`sessionStorage`、IndexedDB、Router 或全局状态库保存当前 Workspace。
- M01 Fixture/Presentation Types 不混入 Workspace DTO；M03 不伪造 Conversation 与 Workspace 所有权。

### 9.2 Frontend Runtime State

Frontend 至少能表达：

```text
collection: idle | loading | ready | error
items: WorkspaceSummary[]
active_workspace_id: string | null
operation: idle | creating | renaming | opening | refreshing
operation_error: safe user-facing error | null
```

Behavior Rules（行为规则）：

- Backend Connection 首次变为 `connected` 后加载 Workspace 列表一次。
- M03 不轮询。用户可以显式刷新；Backend Retry 成功后重新加载。
- 页面刷新或应用重启后不自动选择旧记录；用户从持久列表显式重新打开。
- Frontend 本地集合必须使用与 Backend List 相同的稳定排序规则：`last_opened_at DESC, created_at DESC, id ASC`。
- Create 成功后，将服务器返回的 Workspace 合并进当前集合，设为当前 Workspace，并重新按上述规则排序；不额外执行 List 请求。
- Open 成功后，将服务器返回的 Workspace 合并进当前集合，设为当前 Workspace，并重新按上述规则排序；不额外执行 List 请求。
- Rename 成功后，将服务器返回的 Workspace 合并进当前集合，保留当前选择，并重新按上述规则排序；不额外执行 List 请求。
- 显式 Refresh、首次加载和 Backend Retry 恢复后的重新加载仍通过 List API 获取服务器完整集合。
- 旧请求、重复点击或组件卸载后的结果不得覆盖较新的状态；提交期间相关按钮需防重复触发。
- API Failure 不清空最近一次成功列表；Error 可重试且不显示原始 HTML、路径堆栈或内部异常。

### 9.3 Required UI

- Sidebar 的“项目”区域演进为真实 Workspace 列表，提供“添加工作区”操作。
- 添加 UI 使用明确标注的绝对路径输入框和可选显示名称输入框，展示支持格式示例。
- M03 不显示不可工作的“浏览文件夹”按钮；目录选择方式明确为输入或粘贴绝对路径。
- 每条 Workspace 显示名称，并可在展开 Sidebar 中查看或通过 Tooltip/Accessible Description（工具提示/可访问描述）获得 Root Path。
- 当前 Workspace 使用 `aria-current` 或等价语义标识，不能只依赖颜色。
- Available 项可以打开；Missing、Not Directory、Inaccessible 项显示具体状态，并提供“重新检查并打开”操作。
- Rename 使用 Dialog 或 Inline Form（对话框或行内表单），具有 Label、初始值、确认、取消、键盘 Focus 和校验错误。
- Loading、Empty、Collection Error 和 Operation Error 均有可见文本；Empty 状态直接引导添加路径。
- Sidebar 折叠时仍能通过 Accessible Name 或 Tooltip 识别当前 Workspace 与添加入口。

### 9.4 Fixture Coexistence（夹具共存）

- M03 Workspace 选择不改变 M01 六个 Agent 状态 Fixture、Timeline 或四类 UiIntent（界面意图）。
- 在 M04 引入真实 Conversation 前，既有 Conversation 内容继续作为展示 Fixture；UI 不宣称其已归属当前 Workspace。
- Workspace Request 失败不禁用 M01 Fixture 浏览或 M02 Backend Retry。
- Composer 仍不发送真实消息；M03 不提前实现 Conversation 或 Run。

## 10. Failure, Privacy and Observability（失败、隐私与可观察性）

- Path Error 必须区分 Invalid、Missing、Not Directory 和 Inaccessible，便于用户修复。
- List 中单个失效目录转换为 Item Availability，不返回整个请求失败。
- Database Failure、损坏记录或未知异常返回稳定的安全错误，不返回 SQL、数据库路径或 Traceback。
- Backend 日志记录 Workspace Operation、Workspace ID、结果和安全错误代码；默认不记录用户输入的完整 Root Path。
- API 返回 Root Path 是 Local-first 产品的必要功能，仅通过明确 Workspace Endpoint 返回；Health 和无关错误响应不得泄漏路径。
- 不缓存目录内容，不递归扫描，不访问 Workspace 子文件，也不验证写权限。
- Create/Open 的检查只证明当时根目录可访问，不构成后续 Tool Permission（工具权限）或 Sandbox（沙箱）授权。

## 11. Requirements and Acceptance Matrix（需求与验收矩阵）

| ID | Requirement | Automated Evidence | Human Evidence |
|---|---|---|---|
| `M03-R01` | Workspace Entity、名称、时间和不可变 Root 满足领域不变量 | Domain unit tests | 创建后检查显示名称与元数据 |
| `M03-R02` | Windows 路径规范化、真实目标解析和比较键稳定 | Path resolver tests | 用大小写/分隔符变化添加同一目录 |
| `M03-R03` | Invalid、Missing、Not Directory、Inaccessible 被正确区分 | Path/error mapping tests | 输入不存在路径和文件路径 |
| `M03-R04` | Version `2` Migration 创建且只创建 `workspaces`，重复启动幂等 | Migration/schema tests | 从 M02 数据库升级并检查版本为 2 |
| `M03-R05` | Repository CRUD 子集、稳定排序、唯一约束与事务语义正确 | Repository integration tests | 重启 Backend 后列表仍存在 |
| `M03-R06` | Create/List/Rename/Open API 与 Error Envelope 符合契约 | API contract/integration tests | 通过 UI 或命令行执行四个用例 |
| `M03-R07` | Open 重新验证路径；失效失败不更新时间，列表单项失效不拖垮整体 | Service/API tests | 临时移走目录后刷新和重新打开 |
| `M03-R08` | Frontend Client 校验成功/失败 Payload，只通过统一 API Boundary 请求 | Client/source boundary tests | 切换后端可用/不可用状态 |
| `M03-R09` | UI 完成加载、空态、添加、选择、重命名、刷新、重新打开和失效状态 | Component/App integration tests | 添加当前仓库、重命名并重启重开 |
| `M03-R10` | M01 Fixture 与 M02 Health/Connection 不回归，未引入 M04+ 能力 | Backend/frontend regression + architecture inspection | 抽查 Fixture、连接重试和 Schema |
| `M03-R11` | 路径隐私、CORS 方法和安全错误响应满足本地产品边界 | CORS/error/log assertions | 检查错误 UI 与 Network Response |

## 12. Definition of Done（完成定义）

M03 只有同时满足以下条件才可以提交 Feature Acceptance：

- `M03-R01` 至 `M03-R11` 全部具有自动或人工证据。
- 三个 Plan 的 Exit Gate 均已通过，且每个 Plan 完成时 Backend 可启动、已有前端可构建。
- 全新数据库与从 M02 Version `1` 升级的数据库都正确到达 Schema Version `2`。
- `workspaces` 是 M03 唯一新增业务表，没有提前创建 Conversation、Session、Run、Tool 或 Memory 能力。
- 当前仓库可以通过绝对路径添加，重复路径别名返回 Conflict，显示名称可以修改。
- Backend/Frontend 重启后，持久列表仍可加载，用户可以显式重新打开 Workspace。
- 目录缺失、变成文件或不可访问时，UI 显示准确状态；失败 Open 不改变 `last_opened_at`。
- Backend pytest、Frontend Vitest 和 Frontend Production Build（生产构建）均返回退出码 `0`。
- M01 六个 Fixture、四类 UiIntent、主要视觉/键盘行为和 M02 Backend Connection 继续工作。
- API、日志和错误 UI 不泄漏 SQL、数据库路径、Traceback 或原始 OS Error。
- 自动验证、人工验收和 Architecture Inspection（架构检查）确认 M03 没有越界到 M04+。
