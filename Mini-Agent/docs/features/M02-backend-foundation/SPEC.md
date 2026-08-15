# M02 — Backend Foundation SPEC

## 1. Document Status（文档状态）

| Field | Value |
|---|---|
| Milestone / Feature | `M02 — Backend Foundation` |
| Status | Ready for TASK decomposition |
| Depends On | `M01 — UI Foundation` |
| Source | [PROJECT.md](../../PROJECT.md)、[ARCHITECTURE.md](../../ARCHITECTURE.md)、[ROADMAP.md](../../ROADMAP.md) |

本 SPEC 是 M02 的需求与接口事实源。PLAN 和后续 TASK 可以细化实现步骤，但不得隐式改变本文的 API Contract（接口契约）、Configuration Contract（配置契约）、Migration Invariant（迁移不变量）、前端连接状态或架构边界。

## 2. Goal and Deliverable（目标与交付物）

### 2.1 Goal

在不引入 Agent、Workspace、Conversation、Session 或 Run 业务能力的前提下，建立可独立启动和测试的 Python/FastAPI 服务基础、集中配置、SQLite 连接与事务边界、有序 Migration Runner（迁移执行器），并让 M01 UI 显示真实后端连接状态。

### 2.2 Deliverable

M02 完成后必须能够演示以下闭环：

1. 从一个空的数据目录启动 Python 服务。
2. 应用启动阶段创建 SQLite 数据库、初始化 `schema_versions` 并运行所有待执行 Migration。
3. `GET /api/health` 返回服务、数据库和当前 Schema Version（模式版本）的稳定状态。
4. React UI 通过真实 HTTP Client 探测后端，显示 Checking、Connected 或 Disconnected，并允许失败后手动重试。
5. 关闭并重复启动服务不会重复应用 Migration，也不会破坏现有 Schema。

## 3. Scope（范围）

### 3.1 In Scope

- 位于 `backend/` 的 Python Project（Python 项目）与 `pyproject.toml`。
- FastAPI Application Factory（应用工厂）、Lifespan（生命周期）和本地启动入口。
- 基于 Pydantic Settings（Pydantic 配置）的环境变量加载、默认值和启动校验。
- FastAPI CORS（跨域资源共享）配置，仅允许明确配置的前端 Origin（源）。
- `GET /api/health` 健康检查及其成功/降级响应 Schema。
- 基于标准库 `sqlite3` 的 Connection Factory（连接工厂）、事务 Context Manager（上下文管理器）和健康探测。
- `schema_versions`、Migration Descriptor（迁移描述）、有序 Runner、Checksum（校验和）和启动时自动迁移。
- 前端 API Base URL 配置、Health Client、连接状态模型、首次探测和手动重试。
- 后端 pytest、前端 Vitest/React Testing Library，以及空目录启动和重复启动的人工验收。
- 运行时数据库、`.env`、缓存和构建产物的 Git Ignore（忽略）规则。

### 3.2 Out of Scope

- Workspace、Conversation、Message、Session、Run、RunEvent、ToolCall、PermissionDecision 或 Memory 的表、Entity（实体）、Repository（仓储）和 API。
- Agent Core、Context Assembly、LLM Provider、DeepSeek、Agent Loop 或 Tool System。
- SSE、WebSocket、流式事件、后台任务、Run Lock 或取消机制。
- 用户认证、OAuth、RBAC、远程部署、HTTPS 终止或通用生产运维方案。
- 通用 ORM、异步数据库 Driver、Repository Base Class（仓储基类）或 Unit of Work Framework（工作单元框架）。
- 自动重试、定时轮询、离线队列或由连接状态驱动的 Fixture/Conversation 变化。
- M03 及以后使用的领域表预创建。

## 4. Architecture Impact（架构影响）

M02 遵守 ARCHITECTURE 的依赖方向，只建立 API 与 Infrastructure 的地基。

| Architecture Area | M02 Decision |
|---|---|
| Entity | 不新增领域 Entity；`schema_versions` 是基础设施元数据，不是领域实体 |
| Port | 不新增公开 Core/Harness Port；SQLite Connection 与 Migration 是 Infrastructure 内部边界 |
| State Machine | 不新增或修改 Session、Run、ToolCall 状态机 |
| Event | 不产生 Runtime Event，不引入 SSE 或 Event Store |
| Persistence | 仅创建 `schema_versions`；后续领域表必须由所属 Milestone 的 Migration 创建 |
| Public API | 新增 `GET /api/health`，不新增业务 CRUD |
| UI | 保留 M01 Fixture Harness，仅增加独立的 Backend Connection Projection（后端连接投影） |
| Safety | 配置和响应不泄露秘密或本地绝对路径；CORS 使用显式 Origin Allowlist（来源白名单） |

Python 服务根目录固定为 `backend/`。它承载未来 API、Application、Harness、Agent Core 与 Infrastructure 多个逻辑层，因此不使用容易与逻辑层 Agent Core 混淆的仓库根目录 `core/` 作为整个服务根目录。M02 只创建当前需要的包，不为未来层创建空占位模块。

## 5. Technical Baseline and Boundaries（技术基线与边界）

### 5.1 Runtime Baseline

- Python：`>=3.11`。
- Web：FastAPI + Uvicorn。
- Validation / Settings：Pydantic + `pydantic-settings`。
- Persistence：Python 标准库 `sqlite3`。
- Backend Tests：pytest + FastAPI/HTTPX Test Client。
- Frontend：沿用 M01 的 React、Vite、TypeScript、Vitest 和 React Testing Library。
- Local Baseline：Windows 优先，默认仅监听 Loopback（回环地址）。

依赖及测试配置以 `backend/pyproject.toml` 为单一事实源。正常测试不依赖网络、不启动真实 Uvicorn 子进程，也不写入仓库内的默认数据目录。

### 5.2 Intended Backend Layout（后端预期布局）

```text
backend/
  pyproject.toml
  src/
    mini_agent/
      __init__.py
      __main__.py             # 本地启动入口
      config.py               # Settings 与路径解析
      api/
        app.py                # create_app 与 lifespan
        routes/
          health.py
        schemas/
          health.py
      infrastructure/
        sqlite/
          database.py         # connection / transaction / probe
          migrations/
            model.py          # Migration descriptor
            runner.py
            versions/
  tests/
    unit/
    integration/
```

目录可以在 TASK 中按测试边界进一步拆分，但责任必须保持：

- `api/` 只处理 HTTP、Schema 和依赖装配，不包含 SQL。
- `config.py` 是后端配置的唯一入口；业务代码不直接散读环境变量。
- `infrastructure/sqlite/` 持有 `sqlite3` 类型、PRAGMA 和 Migration 细节。
- 当前不创建通用 Repository 抽象；M03 以具体 `WorkspaceRepository` 需求引入第一个领域 Repository。
- 模块 Import（导入）不得创建目录、打开数据库或运行 Migration；副作用只发生在显式启动/Lifespan 中。

## 6. Configuration Contract（配置契约）

### 6.1 Backend Settings

所有后端环境变量使用 `MINI_AGENT_` 前缀。M02 的最小配置如下：

| Setting | Environment Variable | Default | Rules |
|---|---|---|---|
| Environment | `MINI_AGENT_ENV` | `development` | 允许 `development`、`test`、`production` |
| Host | `MINI_AGENT_HOST` | `127.0.0.1` | 本地默认不暴露到局域网 |
| Port | `MINI_AGENT_PORT` | `8000` | 整数 `1..65535` |
| Data Directory | `MINI_AGENT_DATA_DIR` | `backend/.data` | 相对路径基于 `backend/` Project Root，而非进程当前目录 |
| CORS Origins | `MINI_AGENT_CORS_ORIGINS` | `http://localhost:5173`、`http://127.0.0.1:5173` | 规范化为无尾斜杠的显式 HTTP(S) Origin；不接受路径、Query 或通配符 `*` |
| Log Level | `MINI_AGENT_LOG_LEVEL` | `INFO` | 允许标准日志级别 |

数据库文件固定为 `<resolved-data-dir>/mini-agent.db`，M02 不再增加第二个 Database Path 配置，避免 Data Directory 与 Database Path 冲突。测试通过显式 Settings 注入临时目录。

配置优先级为：显式测试/工厂注入 > Process Environment（进程环境变量）> `backend/.env` > 默认值。`.env` 仅用于本地开发且不得提交；仓库可以提供不含秘密的 `.env.example`。

### 6.2 Configuration Invariants

- Settings 创建时完成类型、枚举、端口和 Origin 校验；无效配置在服务监听前失败。
- Data Directory 在配置解析时只解析路径，不创建目录；目录创建属于 Lifespan 启动阶段。
- 相对 Data Directory 的解析不受启动命令当前 Working Directory（工作目录）影响。
- Health Response、异常消息和普通日志不得返回 `.env` 内容、环境变量全集或 Data Directory/Database 的绝对路径。
- M02 不包含 LLM API Key；未来 Secret（秘密）配置沿用同一集中边界。

### 6.3 Frontend Settings

前端只读取 `VITE_API_BASE_URL`，默认值为 `http://127.0.0.1:8000`。Client 在内部追加固定 `/api` 路径：

- 配置值去除尾斜杠。
- 配置值必须是合法的 `http` 或 `https` Origin，不包含 Path、Query 或 Fragment。
- Production Source（生产源码）不得在组件中散落后端 URL。
- 测试可以注入 Base URL 和 Fetch Implementation（Fetch 实现）。

## 7. Application Lifecycle and HTTP Contract（应用生命周期与 HTTP 契约）

### 7.1 Application Factory and Lifespan

后端必须提供 `create_app(settings: Settings | None = None) -> FastAPI`，以便测试隔离配置和数据库。模块级 `app` 或 `python -m mini_agent` 只能调用该工厂，不维护第二套装配逻辑。

Lifespan 启动顺序固定为：

```text
Resolve and validate Settings
→ Create Data Directory
→ Construct SQLite database boundary
→ Run pending Migrations
→ Verify database readiness
→ Publish dependencies to app.state
→ Accept HTTP requests
```

关闭阶段释放应用持有的资源。M02 默认采用短生命周期 SQLite Connection，因此不得依赖一个跨线程共享的全局 Connection。

以下任一步骤失败时，应用启动失败且不开始监听；不得通过返回伪造的 Healthy Response 掩盖启动错误。

### 7.2 Health Endpoint

`GET /api/health` 是 M02 唯一公开 API。它无需认证、无副作用、禁止缓存，并使用以下响应。

成功：HTTP `200`

```json
{
  "status": "ok",
  "service": "mini-agent-backend",
  "api_version": "v1",
  "database": {
    "status": "ready",
    "schema_version": 1
  }
}
```

服务已运行但数据库探测失败：HTTP `503`

```json
{
  "status": "degraded",
  "service": "mini-agent-backend",
  "api_version": "v1",
  "database": {
    "status": "unavailable",
    "schema_version": null
  }
}
```

Contract Rules（契约规则）：

- `status` 仅为 `ok | degraded`。
- `database.status` 仅为 `ready | unavailable`。
- `schema_version` 是当前已应用的最大 Migration Version；无可用数据库时为 `null`。
- M02 Baseline Migration 完成后版本为 `1`。
- Response 不包含当前时间、进程 ID、堆栈、数据库路径、配置全集或依赖版本。
- 未知 `/api/*` 路由保持 FastAPI 标准 `404`；M02 不提前设计全局业务 Error Envelope（错误信封）。

### 7.3 CORS Contract

- 只允许 Settings 中的 Origin。
- M02 只需要 `GET` 和健康检查所需的 Preflight（预检）行为。
- 不启用 Credential（凭据）传输。
- 非 Allowlist Origin 不获得允许跨域读取响应的 Header。
- CORS 只影响浏览器读取权限，不替代网络访问控制或认证。

## 8. SQLite Connection and Transaction Contract（SQLite 连接与事务契约）

### 8.1 Connection Boundary

Infrastructure 必须提供统一的连接入口，未来 Repository 不自行重复连接配置。每个新 Connection 至少设置：

- `PRAGMA foreign_keys = ON`。
- 有限的 `busy_timeout`，避免锁冲突无限等待。
- `sqlite3.Row` 或等价的 Name-based Row Access（按名称访问行）。
- 明确的事务控制，不依赖调用者猜测隐式提交行为。

WAL（Write-Ahead Logging，预写日志）可以在数据库初始化时启用，以支持后续本地读写；测试必须确认实际 Journal Mode（日志模式），而不是假设所有环境都成功切换。

### 8.2 Transaction Semantics

- Read Connection（读连接）离开上下文后关闭。
- Transaction Context（事务上下文）正常返回时 Commit（提交），抛出异常时 Rollback（回滚），最后始终关闭。
- Transaction 不自动吞掉或替换原始异常。
- Repository 后续可以接收当前事务 Connection，但 M02 不建立嵌套事务或跨请求 Unit of Work。
- Health Probe 使用独立短连接执行轻量查询，并读取当前最大 Schema Version。
- 测试必须证明 Commit、Rollback、Foreign Key Enforcement（外键约束）和连接关闭行为。

### 8.3 Filesystem Rules

- Lifespan 可以创建已解析的 Data Directory 及其父目录。
- Database、WAL 和 Shared Memory 文件属于运行时数据，不进入 Git。
- 无法创建或写入 Data Directory 时启动失败，并给出不包含秘密的可操作错误。
- M02 不允许 API 选择任意数据库路径。

## 9. Migration Contract（迁移契约）

### 9.1 Schema Version Table

`schema_versions` 最小 Schema：

```text
version       INTEGER PRIMARY KEY
name          TEXT NOT NULL UNIQUE
checksum      TEXT NOT NULL
applied_at    TEXT NOT NULL
```

- `version` 是从 `1` 开始、连续递增的整数。
- `name` 是稳定的 Migration 名称。
- `checksum` 是规范化 Migration 内容的 SHA-256，用于检测已应用 Migration 被修改。
- `applied_at` 是 UTC ISO 8601 时间，由 Runner 写入；业务逻辑不依赖该时间排序。

Runner 唯一允许的 Unversioned DDL（未版本化 DDL）是幂等创建 `schema_versions` 元数据表；随后立即应用并记录 `001_schema_versions` Baseline Migration（基线迁移）。后续所有 Schema 变化都必须通过版本化 Migration。

### 9.2 Migration Descriptor

每个 Migration 至少包含：

```text
version
name
checksum source
upgrade(connection)
```

Migration Registry（迁移注册表）是运行顺序的单一事实源。M02 不实现 Downgrade（降级）或自动回滚已成功的历史版本。

### 9.3 Runner Invariants

1. 注册版本必须从 `1` 连续递增，且 Version、Name 唯一。
2. 数据库已应用记录必须是当前 Registry 的完整前缀。
3. 已应用 Version 的 Name 或 Checksum 不匹配时立即失败，禁止静默覆盖。
4. 数据库出现 Registry 未知版本，或版本中间存在缺口时立即失败。
5. Pending Migration（待执行迁移）严格按 Version 升序执行。
6. 每个 Migration 的 Schema 变化与 `schema_versions` 插入在同一个 `BEGIN IMMEDIATE` Transaction（即时事务）内完成。
7. 当前 Migration 失败时回滚该 Migration，保留此前已经成功提交的版本，并拒绝应用启动。
8. 没有 Pending Migration 时不修改 Schema 或历史记录；重复启动是幂等的。
9. Runner 不使用会绕过既定事务边界的隐式提交 API。

### 9.4 M02 Baseline

M02 只注册 `001_schema_versions`，最终 Schema Version 为 `1`，不创建未来领域表。Runner 的顺序、失败和漂移能力通过测试内 Migration Fixture（迁移夹具）验证；生产 Registry 保持最小。

## 10. Frontend API and Connection Contract（前端 API 与连接契约）

### 10.1 Ownership

```text
frontend/src/
  api/                  # HTTP types, validation and client
  app/                  # connection lifecycle / composition
  components/shell/     # connection status presentation
```

- 只有 `api/` 可以直接调用 `fetch`。
- React Component 不拼 URL、不解释 HTTP Response 细节。
- API Response Type（响应类型）独立于 M01 Presentation Model；不得把 Health DTO 混入 Fixture。
- M01 `presentation/` 与 `fixtures/` 继续保持无网络依赖。

### 10.2 Connection States

| State | Meaning | Required UI |
|---|---|---|
| `checking` | 初次探测或用户触发重试正在进行 | 可见文本“正在连接后端”，非仅动画 |
| `connected` | 收到 HTTP 200 且响应符合 Health Contract，数据库为 `ready` | 可见文本“后端已连接” |
| `disconnected` | 网络错误、超时、非 200、响应不合法或数据库非 Ready | 可见文本“后端未连接”与“重试”操作 |

Behavior Rules（行为规则）：

- App Mount（应用挂载）后执行一次探测。
- M02 不做后台轮询和自动重试；失败后由用户显式重试。
- 单次探测有有限超时，并可在组件卸载或下一次重试时取消；旧请求结果不得覆盖新请求状态。
- Error Detail（错误详情）可以用于开发测试，但 UI 不显示堆栈、绝对路径或原始 HTML Response。
- Backend Connection 不改变当前 Scenario、Timeline、Composer、UiIntent 或 M01 本地交互。
- 状态在 Sidebar Footer（侧边栏页脚）或同等 Shell 区域紧凑展示；Sidebar 折叠时仍提供可访问名称和非纯颜色状态。

### 10.3 M01 Boundary Test Evolution

M01 的 Source Boundary Test 曾禁止所有生产 HTTP Client。M02 必须把该历史断言演进为新的依赖边界：

- `fetch` 仅允许出现在 `frontend/src/api/`。
- `presentation/`、`fixtures/` 和纯展示 Component 保持无 Backend Import。
- 不删除 M01 对 Router、浏览器持久化、全局状态库、计时器驱动 Agent 和不安全 HTML 的保护。

## 11. Failure and Observability Rules（失败与可观察性规则）

- 配置无效、Data Directory 不可用、Migration 漂移或 Migration 失败：服务启动失败，进程返回非成功结果。
- 服务已启动后数据库探测失败：Health 返回 `503 degraded`；不伪造 Ready。
- 前端无法连接：UI 保持可用并显示 Disconnected；M01 Fixture 不被清空或锁死。
- 日志至少记录服务启动阶段、Migration 起止/版本和失败摘要；不得记录环境变量全集或未来 Secret 值。
- 正常健康检查不打印堆栈；意外异常保留服务端日志，Public Response 保持稳定 Schema。
- M02 不引入 Metrics、Tracing（链路追踪）或结构化 Event Store。

## 12. Requirements and Acceptance Matrix（需求与验收矩阵）

| ID | Requirement | Automated Evidence | Human Evidence |
|---|---|---|---|
| `M02-R01` | `backend/` 可安装、测试并通过统一入口启动 FastAPI | Import/startup tests、pytest | Windows 本地启动 Smoke Check |
| `M02-R02` | Settings 集中加载、默认值稳定、环境覆盖和无效值失败 | Config unit tests | 使用默认值与一次环境覆盖启动 |
| `M02-R03` | Lifespan 按配置→目录→Migration→Ready 顺序完成，失败时拒绝启动 | Lifespan integration tests | 从不可写/无效路径观察可理解失败 |
| `M02-R04` | `/api/health` 的 200/503、Schema 和 CORS 符合契约 | API contract/CORS tests | 浏览器或命令行检查响应 |
| `M02-R05` | SQLite 连接统一设置 PRAGMA，事务 Commit/Rollback/Close 正确 | Database unit/integration tests | 检查数据库可正常重新打开 |
| `M02-R06` | 空库初始化、Migration 顺序、Checksum、失败回滚和重复执行满足不变量 | Temp database migration tests | 空目录启动两次并检查版本仍为 1 |
| `M02-R07` | 前端 Client 只从统一配置调用 Health API，并校验响应 | API client tests、source boundary tests | 切换正确/错误 Base URL |
| `M02-R08` | UI 展示 Checking/Connected/Disconnected 和 Retry，状态非纯颜色表达 | Component/integration tests | 启动、停止、重启后端并手动重试 |
| `M02-R09` | Backend Connection 不改变 M01 Fixture 和 UiIntent 行为 | M01 regression + App integration tests | 六场景和主要本地交互抽查 |
| `M02-R10` | 运行时数据、`.env`、缓存和构建产物不被 Git 跟踪，响应/日志不暴露敏感路径 | Ignore/source/response assertions | `git status --short` 检查 |
| `M02-R11` | M02 未引入领域实体、业务 Repository、Agent、SSE 或未来表 | Dependency/schema inspection | Architecture 一致性审查 |

## 13. Definition of Done（完成定义）

M02 只有同时满足以下条件才可以提交 Feature Acceptance：

- `M02-R01` 至 `M02-R11` 全部具有自动或人工证据。
- 三个 Plan 的 Exit Gate 均已通过，且每个 Plan 完成时前后端仍可独立启动。
- 全新临时 Data Directory 首次启动后生成数据库，`schema_versions` 只有一条 Version `1` 记录。
- 同一 Data Directory 重复启动后 Schema 和版本记录不变。
- Migration 顺序、Checksum Drift（校验漂移）、失败回滚和事务行为测试通过。
- `GET /api/health` 在 Ready 时返回 `200` 和 Version `1`，数据库不可用时返回稳定的 `503` Schema。
- UI 能从 Checking 进入 Connected；后端不可达时进入 Disconnected，后端恢复后可通过 Retry 回到 Connected。
- Backend Connection 不改变 M01 的六个 Fixture、四类 UiIntent 或主要视觉/键盘行为。
- Backend pytest、Frontend Vitest 和 Frontend Production Build（生产构建）均返回退出码 `0`。
- 运行时数据库、`.env`、Python/Node Cache 和 Frontend Build 不在 Git 暂存区。
- Schema 仅包含 M02 基础设施元数据，没有提前实现 M03 及以后能力。
