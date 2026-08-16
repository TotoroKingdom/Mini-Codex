# M02-P01 — Python Service & HTTP Foundation TASK

## 执行边界

- 仅实现 `M02-P01`：可安装的 Python/FastAPI Service（服务）、集中 Settings（配置）、Application Factory（应用工厂）、Lifespan（生命周期）装配结构、CORS（跨域资源共享）、Health HTTP Contract（健康检查 HTTP 契约）与统一启动入口。
- P01 不实现 SQLite Connection、Transaction、Migration Runner、`schema_versions` 或任何 Migration；这些内容全部留给 `M02-P02`。
- P01 可通过可注入的 Database Probe Stub（数据库探测桩）测试最终 Health `200/503` Schema，但默认启动不得伪造 Database Ready 或 Schema Version `1`。
- 不修改 M01 Fixture，不引入 Workspace、Conversation、Session、Run、Agent、Repository、SSE 或其他 M03+ 能力。
- 自动测试保持离线、确定性，不启动真实 Uvicorn 子进程，不读取开发者真实环境配置，也不写入仓库内默认数据目录。
- 每个 TASK 完成后运行其必要测试；最后一个 TASK 执行 P01 全量测试、真实启动 Smoke（冒烟检查）、Git 范围检查和 Exit Gate，Gate 通过后停止，不展开 P02/P03。

---

## M02-P01-T01 — 建立可安装的 Backend Project

- **task_id:** `M02-P01-T01`
- **goal:** 创建 `backend/` 的 Python `src` Layout（源码布局），固定依赖、测试配置和无副作用 Package Import（包导入）基线。
- **depends_on:** `[]`
- **write_scope:**
  - `backend/pyproject.toml`
  - `backend/src/mini_agent/__init__.py`
  - `backend/tests/unit/test_package_import.py`
- **expected_output:**
  - `backend/pyproject.toml` 作为 Runtime/Dev/Test Dependencies（运行/开发/测试依赖）和 pytest 配置的单一事实源，声明 Python `>=3.11`、FastAPI、Uvicorn、Pydantic、`pydantic-settings`、pytest 与 FastAPI/HTTPX Test Client 所需依赖。
  - 项目可在干净 Virtual Environment（虚拟环境）中安装，`mini_agent` 可从 `src` Layout 导入。
  - 导入 Package 不创建目录、数据库或其他运行时文件，不启动服务，也不读取第二套配置入口。
  - 建立最小 Unit Test（单元测试）目录与可重复执行的 Backend 测试命令，不创建未来逻辑层的空占位模块。
- **verification:**
  ```powershell
  cd backend
  python -m pip install -e ".[dev]"
  python -m pytest tests/unit/test_package_import.py
  ```
- **wave:** `1`
- **status:** `pending`

---

## M02-P01-T02 — 实现集中 Settings 与本地配置边界

- **task_id:** `M02-P01-T02`
- **goal:** 实现 SPEC 定义的全部 Backend Settings、校验、优先级和与 Working Directory（工作目录）无关的路径解析。
- **depends_on:** `[M02-P01-T01]`
- **write_scope:**
  - `backend/src/mini_agent/config.py`
  - `backend/tests/unit/test_config.py`
  - `backend/.env.example`
  - `.gitignore`
- **expected_output:**
  - `config.py` 是 Environment、Host、Port、Data Directory、CORS Origins 和 Log Level 的唯一读取入口；所有环境变量使用 `MINI_AGENT_` 前缀。
  - 默认值、允许的枚举/日志级别、Port `1..65535`、CORS 显式 HTTP(S) Origin 规范化与拒绝 Path/Query/通配符的规则严格符合 SPEC。
  - 相对 Data Directory 始终基于 `backend/` Project Root（项目根目录）解析；Settings 只解析路径，不创建目录或数据库。
  - 配置优先级为显式工厂/测试注入 > Process Environment（进程环境变量）> `backend/.env` > 默认值；测试隔离 Process Environment 和 `.env`，不受开发者本机配置影响。
  - `.env.example` 不包含秘密；Git Ignore（忽略）规则覆盖 `.env`、`.data`、SQLite/WAL/SHM、Virtual Environment、Python Cache 和测试/构建产物，且不误忽略 `.env.example`。
  - 测试覆盖默认值、全部环境覆盖、优先级、无效 Environment/Port/Origin/Log Level，以及从不同 Working Directory 创建 Settings 时得到相同 Data Directory。
- **verification:**
  ```powershell
  cd backend
  python -m pytest tests/unit/test_config.py
  ```
- **wave:** `2`
- **status:** `pending`

---

## M02-P01-T03 — 固定 Health Schema 与 Probe 依赖契约

- **task_id:** `M02-P01-T03`
- **goal:** 定义最终 Health Response Model（健康响应模型）和 Route（路由）的可注入 Database Probe（数据库探测）边界，不接入真实数据库。
- **depends_on:** `[M02-P01-T01]`
- **write_scope:**
  - `backend/src/mini_agent/api/schemas/health.py`
  - `backend/src/mini_agent/api/routes/health.py`
  - `backend/tests/unit/test_health_contract.py`
- **expected_output:**
  - `GET /api/health` 的类型化模型严格限定 Service `status: ok | degraded`、Database `status: ready | unavailable` 和 `schema_version: int | null`，并固定 `service: mini-agent-backend`、`api_version: v1`。
  - Route 无认证、无副作用、禁止缓存；API 层不包含 SQL，不直接打开数据库，只通过可替换依赖取得 Probe 结果。
  - Ready Stub 生成 SPEC 的 HTTP `200`/`ready` Shape；Unavailable 或 Probe Failure 生成稳定的 HTTP `503`/`degraded` Shape，且不泄露堆栈、绝对路径、配置全集或依赖版本。
  - P01 Production Path（生产路径）不提供硬编码 Ready Probe、不声称 Schema Version `1`，也不新增临时公开 Endpoint（端点）。
  - 单元测试使用 Stub/Fake 覆盖 `200`、`503`、字段枚举、禁止缓存和敏感字段边界，不依赖 SQLite、网络或真实 Uvicorn。
- **verification:**
  ```powershell
  cd backend
  python -m pytest tests/unit/test_health_contract.py
  ```
- **wave:** `2`
- **status:** `pending`

---

## M02-P01-T04 — 集成 App Factory、Lifespan、Health 与 CORS

- **task_id:** `M02-P01-T04`
- **goal:** 将 Settings、Health Route 和明确 CORS Allowlist 装配到唯一 App Factory，并建立 P02 可接入真实数据库启动步骤的 Lifespan Seam（生命周期接缝）。
- **depends_on:** `[M02-P01-T02, M02-P01-T03]`
- **write_scope:**
  - `backend/src/mini_agent/api/app.py`
  - `backend/tests/integration/test_app_factory.py`
  - `backend/tests/integration/test_health_api.py`
  - `backend/tests/integration/test_cors.py`
- **expected_output:**
  - 提供 `create_app(settings: Settings | None = None) -> FastAPI`；显式 Settings 可注入，未注入时只通过集中配置入口解析。
  - Lifespan 明确承载启动装配与 `app.state` 依赖发布，Import/App Factory 创建本身不创建 Data Directory、不打开数据库、不运行 Migration；P02 可在该接缝加入目录创建、Migration、Probe 和 Ready 发布而无需重写 HTTP/Config 层。
  - 默认 P01 启动不会伪造 Database Ready；集成测试通过依赖覆盖或 Stub 分别验证最终 Health `200/503` Contract。
  - Health 响应为 JSON、禁止缓存，未知 `/api/*` 保持 FastAPI 标准 `404`，响应不包含时间、PID、堆栈、数据库路径或配置全集。
  - CORS 只允许 Settings 中的显式 Origin，只支持 Health 所需 `GET`/Preflight，不启用 Credentials；Denied Origin 不获得允许跨域读取的 Header。
  - 测试覆盖 Factory 注入隔离、Lifespan 装配边界、Allowed/Denied Origin、Preflight、Health `200/503`、Content Type、敏感字段和未知 API `404`。
- **verification:**
  ```powershell
  cd backend
  python -m pytest tests/integration/test_app_factory.py tests/integration/test_health_api.py tests/integration/test_cors.py
  ```
- **wave:** `3`
- **status:** `pending`

---

## M02-P01-T05 — 完成统一启动入口与 P01 Exit Gate

- **task_id:** `M02-P01-T05`
- **goal:** 用同一 Settings/App Factory 完成本地启动入口，并执行 P01 完整自动验证、Windows 启动 Smoke、Git 范围检查和 Exit Gate。
- **depends_on:** `[M02-P01-T04]`
- **write_scope:**
  - `backend/src/mini_agent/__main__.py`
  - `backend/tests/integration/test_startup_entry.py`
  - `M02-P01-T01` 至 `M02-P01-T04` 的 `write_scope`（仅修复 P01 Gate 发现的问题）
- **expected_output:**
  - `python -m mini_agent` 与测试使用同一个 `create_app` 和 Settings 入口，不维护第二套装配逻辑；默认监听 `127.0.0.1:8000`，Host/Port 环境覆盖生效。
  - 启动入口测试在不启动真实 Uvicorn 子进程的条件下证明 Factory、Host、Port 和 Log Level 接线正确；无效配置在监听前失败。
  - Backend 全量 pytest 返回退出码 `0`，关键测试无 skip/todo；单纯 Import 不产生 `.data`、数据库或其他 Filesystem Side Effect（文件系统副作用）。
  - Windows Smoke 能启动并正常停止服务；P01 默认 Health 明确为 `503 degraded/unavailable`，不得伪造 `200 ready`，允许 Origin/Loopback/稳定 JSON Schema 符合契约。
  - `M02-R01`、`M02-R02` 具有完整自动证据；`M02-R03` 的 App Factory/Lifespan 边界和 `M02-R04` 的 HTTP/CORS Contract 已固定，P02 的真实依赖注入点有测试证据。
  - Git 范围检查确认 P01 新增源码/测试已跟踪，且 Virtual Environment、`.env`、`.data`、Database/WAL/SHM、Cache、测试产物及其他运行时文件未进入暂存区；没有 P02/P03 或 M03+ 实现。
- **verification:**
  ```powershell
  cd backend
  python -m pytest
  ```

  Windows Smoke 与 Exit Gate 检查：

  1. 在干净 Virtual Environment 中按 `pyproject.toml` 安装项目，执行 Backend 全量 pytest。
  2. 使用默认配置启动 `python -m mini_agent`，确认仅监听 Loopback；携带允许 Origin 请求 `/api/health`，确认 P01 的稳定 `503 degraded/unavailable` JSON 和 CORS Header，然后正常停止服务。
  3. 使用一次合法 Host/Port 环境覆盖启动；再分别使用非法 Port、非法 CORS Origin，确认均在监听前产生可理解的 Validation Failure（校验失败）。
  4. 从不同 Working Directory 执行 Import/启动检查，确认 Import 不创建 `.data` 或数据库，且路径解析不随当前目录变化。
  5. 在仓库根目录执行 `git status --short` 与暂存区检查，确认新增源码/测试已跟踪，忽略项未暂存，改动仅属于 P01。
  6. 确认 P01 Exit Gate 全部通过后停止，不生成或实现 P02/P03 TASK，不实现 SQLite Migration。
- **wave:** `4`
- **status:** `pending`

---

# M02-P02 — SQLite & Migration Lifecycle TASK

## 执行边界

- 仅在 `M02-P01` Exit Gate 通过后执行；复用既有 Settings、App Factory、Lifespan、Health Schema、CORS 和统一启动入口，不重写 P01 HTTP/Config 边界。
- 仅实现 `M02-P02`：标准库 `sqlite3` Connection/Transaction Boundary（连接/事务边界）、Database Probe（数据库探测）、Migration Descriptor/Registry/Runner（迁移描述/注册表/执行器）、`001_schema_versions` Baseline（基线迁移）和 Lifespan 接入。
- Production Registry（生产迁移注册表）只包含 Version `1`，Production Schema（生产模式）只包含 `schema_versions`；不创建 Workspace、Conversation、Session、Run 或其他未来领域表。
- 不实现 Frontend Health Client、连接状态 UI、Retry 或 M01 回归演进，不展开 `M02-P03`。
- 测试只使用临时 Data Directory/Database 和测试内 Migration Fixture（迁移夹具），保持离线、确定性，不污染默认 `backend/.data`。
- 每个 TASK 完成后运行其必要测试；最后一个 TASK 执行 P02 全量测试、空目录与重复启动 Smoke（冒烟检查）、Git 范围检查和 Exit Gate，Gate 通过后停止。

---

## M02-P02-T01 — 实现 SQLite Connection、Transaction 与 Probe 边界

- **task_id:** `M02-P02-T01`
- **goal:** 建立统一、短生命周期且可测试的 SQLite 连接、读上下文、事务上下文和健康探测边界。
- **depends_on:** `[M02-P01-T05]`
- **write_scope:**
  - `backend/src/mini_agent/infrastructure/sqlite/database.py`
  - `backend/tests/unit/test_database.py`
- **expected_output:**
  - Database File（数据库文件）固定为 `<resolved-data-dir>/mini-agent.db`，不新增第二个路径配置，也不允许 API 选择任意数据库路径。
  - 每个新 Connection 统一启用 `PRAGMA foreign_keys = ON`、有限 `busy_timeout`、`sqlite3.Row` Name-based Access（按名称访问）和明确事务控制；不依赖跨线程共享的全局 Connection。
  - Read Context（读上下文）离开时关闭 Connection；Transaction Context 正常返回时 Commit，异常时 Rollback，始终关闭且保留原始异常。
  - Probe 使用独立短连接执行轻量查询并读取当前最大 Schema Version；探测失败可由上层稳定映射为 Database Unavailable，不泄露 Database 绝对路径。
  - 测试覆盖 PRAGMA、Row Access、Busy Timeout、实际 Journal Mode、Commit、Rollback、异常传播、Foreign Key Enforcement（外键约束）、Read/Transaction Close 和 Probe 的版本/失败路径。
- **verification:**
  ```powershell
  cd backend
  python -m pytest tests/unit/test_database.py
  ```
- **wave:** `1`
- **status:** `pending`

---

## M02-P02-T02 — 定义 Migration Descriptor、Registry 与 Baseline

- **task_id:** `M02-P02-T02`
- **goal:** 固定 Migration 的描述、Checksum（校验和）、注册顺序和 M02 唯一 Production Baseline 契约。
- **depends_on:** `[M02-P01-T05]`
- **write_scope:**
  - `backend/src/mini_agent/infrastructure/sqlite/migrations/model.py`
  - `backend/src/mini_agent/infrastructure/sqlite/migrations/registry.py`
  - `backend/src/mini_agent/infrastructure/sqlite/migrations/versions/v001_schema_versions.py`
  - `backend/tests/unit/test_migration_model.py`
- **expected_output:**
  - Migration Descriptor 至少包含稳定的 `version`、`name`、规范化 Checksum Source（校验和来源）和 `upgrade(connection)`；Checksum 使用 SHA-256 且同一规范化内容结果稳定。
  - Registry 是 Migration 运行顺序的单一事实源，能够在执行前拒绝非从 `1` 连续递增、Duplicate Version（重复版本）或 Duplicate Name（重复名称）。
  - Production Registry 只注册 `001_schema_versions`，Version 为 `1`，不包含 Downgrade（降级）或自动回滚历史版本能力。
  - Baseline Descriptor 可由 Runner 应用并记录为 Version `1`，不创建 `schema_versions` 之外的表，也不预建任何 M03+ Schema。
  - 模块 Import 不打开数据库、不创建目录、不运行 Migration；Clock（时钟）与 Connection 等运行输入不在 Descriptor Import 阶段产生副作用。
  - 测试覆盖 Descriptor 必需字段、Checksum 稳定性/内容变化、Registry 顺序/连续性/唯一性和 Production Registry 仅含 Version `1`。
- **verification:**
  ```powershell
  cd backend
  python -m pytest tests/unit/test_migration_model.py
  ```
- **wave:** `1`
- **status:** `pending`

---

## M02-P02-T03 — 实现最小 Migration Runner

* **task_id:** `M02-P02-T03`
* **goal:** 实现当前 M02 所需的最小 Migration Runner，支持首次初始化、顺序执行、重复启动幂等、漂移检测和事务回滚；不设计通用 Migration Framework。
* **depends_on:** `[M02-P02-T01, M02-P02-T02]`
* **write_scope:**

  * `backend/src/mini_agent/infrastructure/sqlite/migrations/runner.py`
  * `backend/tests/integration/test_migration_runner.py`
* **expected_output:**

  * Runner 可在空数据库中初始化 `schema_versions`，并按 Registry 的 Version 顺序执行 Pending Migration。
  * 已成功执行的 Migration 不重复执行；重复运行不得修改已有 Version、Name、Checksum 或 `applied_at`。
  * 已记录 Migration 的 Version、Name 或 Checksum 与当前 Registry 不一致时立即失败，不自动修复或覆盖历史。
  * 单个 Migration 的 Schema/Data 修改与对应 `schema_versions` 记录处于同一事务；执行失败时完整 Rollback 当前 Migration，并保留原始异常。
  * `applied_at` 使用可测试的 UTC 时间来源。
  * 当前 Production Registry 仅需正确支持 `001_schema_versions`；测试可使用少量 Test Migration Fixture 验证顺序和回滚。
  * 只实现当前 SPEC 所需的最小 Runner，不新增 Migration Manager、Planner、Strategy、Repository 等未来抽象，不实现 Downgrade、自动修复、分布式锁或其他通用迁移能力。
  * 模块 Import 不打开数据库、不创建目录、不自动执行 Migration。
* **verification:**

  ```powershell
  cd backend
  python -m pytest tests/integration/test_migration_runner.py
  ```
* **wave:** `2`
* **status:** `pending`

---

## M02-P02-T04 — 将 SQLite/Migration 接入 Lifespan 与 Health

- **task_id:** `M02-P02-T04`
- **goal:** 按 SPEC 固定顺序把真实 Database Boundary、Migration Runner 和 Probe 接入 App Lifespan，使服务只在数据库初始化成功后 Ready。
- **depends_on:** `[M02-P02-T03]`
- **write_scope:**
  - `backend/src/mini_agent/api/app.py`
  - `backend/src/mini_agent/api/routes/health.py`
  - `backend/tests/integration/test_sqlite_lifespan.py`
  - `backend/tests/integration/test_health_api.py`
- **expected_output:**
  - Lifespan 严格执行 Resolve/Validate Settings → Create Data Directory → Construct SQLite Boundary → Run Pending Migrations → Verify Database Readiness → Publish Dependencies to `app.state` → Accept Requests。
  - 全新临时 Data Directory 启动时创建父目录、`mini-agent.db` 和 `schema_versions`；Migration/Probe 完成前不发布 Ready，任一启动步骤失败时拒绝应用启动。
  - 成功启动后的真实 Probe 使 `GET /api/health` 返回 HTTP `200`、Database `ready`、`schema_version: 1`；运行期间 Probe 失败返回稳定的 HTTP `503 degraded/unavailable` 和 `schema_version: null`。
  - Health Route 仍只通过依赖访问 Probe，不包含 SQL；响应与日志不泄露 Data Directory/Database 绝对路径、堆栈、配置全集或秘密。
  - 无法创建/写入 Data Directory、Migration Drift 或 Migration Failure 产生可理解的启动失败，且不通过伪造 Healthy Response 掩盖错误。
  - 关闭阶段释放应用持有资源；短连接模型不引入跨线程全局 Connection。测试全部注入临时 Settings，不写入默认 `.data`。
  - 集成测试覆盖启动顺序/Ready 发布、空目录初始化、成功 Health `200`、Runtime Probe Failure `503`、不可用 Data Directory、Migration Failure 拒绝启动和重复 Lifespan 启动幂等。
- **verification:**
  ```powershell
  cd backend
  python -m pytest tests/integration/test_sqlite_lifespan.py tests/integration/test_health_api.py
  ```
- **wave:** `3`
- **status:** `pending`

---

## M02-P02-T05 — 完成 P02 Regression、启动 Smoke 与 Exit Gate

- **task_id:** `M02-P02-T05`
- **goal:** 补齐 P02 累计回归证据，并执行 Backend 全量测试、空目录/重复启动 Smoke、Schema/Git 范围检查和 P02 Exit Gate。
- **depends_on:** `[M02-P02-T04]`
- **write_scope:**
  - `backend/tests/integration/test_p02_regression.py`
  - `M02-P02-T01` 至 `M02-P02-T04` 的 `write_scope`（仅修复 P02 Gate 发现的问题）
- **expected_output:**
  - Regression Test（回归测试）证明全新临时 Data Directory 首次启动后只产生 `mini-agent.db`、最小 `schema_versions` 和唯一 Version `1` 记录，Health 由真实 Probe 返回 `200 ready`。
  - 同一 Data Directory 第二次及后续启动不重复插入 Version，不改写 Name/Checksum/`applied_at`，不改变 Schema；数据库可在服务停止后正常重新打开。
  - Schema Inspection（模式检查）确认 Production Schema 只有允许的 SQLite 内部对象和 `schema_versions`，没有 Workspace、Conversation、Session、Run 或其他未来领域表。
  - Backend 全量 pytest 返回退出码 `0`，关键测试无 skip/todo；P01 的 Settings、HTTP、CORS、Import 和启动入口契约继续通过。
  - `M02-R03`、`M02-R05`、`M02-R06` 具有完整自动证据，`M02-R04` Health Contract 已由真实 SQLite Probe 支撑；首次、重复、漂移和失败路径可区分且事务一致。
  - Git 范围检查确认 P02 新增源码/测试已跟踪，Database/WAL/SHM、`.data`、`.env`、Virtual Environment、Cache、测试产物和日志未进入暂存区；没有 P03 Frontend 或 M03+ 实现。
- **verification:**
  ```powershell
  cd backend
  python -m pytest
  ```

  Windows Smoke 与 Exit Gate 检查：

  1. 指向全新临时 Data Directory 启动 `python -m mini_agent`，确认创建 `mini-agent.db` 和 Version `1`，调用 `/api/health` 得到 `200`、`ready`、`schema_version: 1`。
  2. 正常停止服务，使用同一 Data Directory 再次启动并请求 Health；确认响应一致，`schema_versions` 仍只有一条记录且 Name/Checksum/`applied_at` 未变化。
  3. 使用只读/不可创建目录或受控测试 Migration Failure 演示启动失败，确认服务不监听且没有伪造 Healthy 状态。
  4. 检查 Database Schema，确认只有 `schema_versions`，不存在 Workspace、Conversation、Session、Run 等未来表；确认数据库停止后可正常重新打开。
  5. 在仓库根目录执行 `git status --short` 与暂存区检查，确认新增源码/测试已跟踪，运行时数据库、日志、依赖和缓存未暂存，改动仅属于 P01/P02 累计范围。
  6. 确认 P02 Exit Gate 全部通过后停止，不生成或实现 P03 TASK，不修改 Frontend。
- **wave:** `4`
- **status:** `pending`

---

# M02-P03 — Frontend Connection & Feature Acceptance TASK

## 执行边界

- 仅在 `M02-P02` Exit Gate 通过后执行；复用真实 `/api/health`、SQLite/Migration Lifespan 和 M01 Fixture Harness（夹具测试框架），不重写 P01/P02 后端边界。
- 仅实现 `M02-P03`：Frontend API Base URL、Health DTO Validation（健康数据传输对象校验）与 Client、`checking | connected | disconnected` 连接生命周期、手动 Retry（重试）、Shell 状态展示、M01 边界演进和 M02 累计验收。
- Backend Connection（后端连接）只影响连接提示，不改变 Scenario、Timeline、Composer、UiIntent、Sidebar 本地状态或 Acceptance Panel；M02 不添加 Polling（轮询）、自动重试、离线队列或连接驱动的 Fixture 变化。
- 只有 `frontend/src/api/` 可以直接调用 `fetch`；Health DTO 不进入 M01 Presentation/Fixture，React Component 不拼 URL、不解释 HTTP Response。
- 自动测试使用可注入 Base URL、Fetch、Abort Signal（取消信号）和 Mock/Fake，保持离线、确定性，不依赖真实 Backend；真实前后端联动只进入最后一个 TASK 的人工验收。
- 每个 TASK 完成后运行其必要测试；最后一个 TASK 执行 Backend pytest、Frontend Vitest、Frontend Build、联合启动 Smoke、Git 范围检查和唯一一次 M02 Feature Acceptance，完成后停止。

---

## M02-P03-T01 — 建立 Frontend Health API Boundary

- **task_id:** `M02-P03-T01`
- **goal:** 固定 `VITE_API_BASE_URL`、Health DTO Runtime Validation（运行时校验）和唯一可注入的 HTTP Client 边界。
- **depends_on:** `[M02-P02-T05]`
- **write_scope:**
  - `frontend/src/api/config.ts`
  - `frontend/src/api/health.ts`
  - `frontend/src/api/index.ts`
  - `frontend/src/api/health.test.ts`
- **expected_output:**
  - Frontend 只读取 `VITE_API_BASE_URL`，默认值为 `http://127.0.0.1:8000`；配置去除尾斜杠，只接受无 Path、Query、Fragment 的合法 HTTP(S) Origin。
  - Client 在内部追加固定 `/api/health`，Production Source（生产源码）中的组件和其他模块不散落 Backend URL、不直接调用 `fetch`。
  - Health DTO 独立于 M01 Presentation Model，运行时严格校验 `ok/degraded`、`ready/unavailable`、固定 Service/API Version 和 `schema_version: number | null` 的 SPEC Shape。
  - Client 可注入 Base URL、Fetch Implementation（Fetch 实现）和取消信号；单次请求具有有限 Timeout（超时），调用者可以取消请求。
  - HTTP `200` 且 Payload 合法时返回已校验 DTO；`503`/其他非 `200`、非 JSON、错误 Shape、Network Error、Timeout 和 Abort 均作为可区分的 Client Failure 交给连接层处理，不把原始 HTML、堆栈或敏感路径交给 UI。
  - 测试覆盖默认/合法覆盖、尾斜杠、非法协议/Path/Query/Fragment、准确 URL、成功、`503`、非 JSON、错误 Shape、Network Error、Timeout、外部 Abort，且不发出真实网络请求。
- **verification:**
  ```powershell
  cd frontend
  npm run test -- --run src/api/health.test.ts
  npm run build
  ```
- **wave:** `1`
- **status:** `pending`

---

## M02-P03-T02 — 实现 Connection Lifecycle 与并发保护

- **task_id:** `M02-P03-T02`
- **goal:** 实现独立于 M01 Harness State（测试框架状态）的三态 Backend Connection 生命周期和显式 Retry 行为。
- **depends_on:** `[M02-P03-T01]`
- **write_scope:**
  - `frontend/src/app/backendConnection.ts`
  - `frontend/src/app/backendConnection.test.ts`
- **expected_output:**
  - 连接状态只包含 `checking | connected | disconnected`；首次 Probe（探测）开始和每次用户 Retry 时进入 `checking`。
  - 仅当 Client 收到 HTTP `200`、Payload 符合 Health Contract 且 Database 为 `ready` 时进入 `connected`；Network/Timeout/非 `200`/非法 Payload/Database 非 Ready 均进入 `disconnected`。
  - M02 不包含后台 Polling 或自动 Retry；失败后只有显式 Retry 才发起下一次 Probe。
  - 下一次 Retry 会取消上一请求；较旧请求即使较晚完成也不能覆盖较新的状态。组件/组合层卸载时取消未完成请求，之后不再提交状态。
  - 可保留供开发测试使用的受限 Error Detail，但不得向 UI 暴露堆栈、绝对路径或原始 HTML Response。
  - Connection Lifecycle 不读取或修改 Scenario、Timeline、Composer、UiIntent、Sidebar 或 Fixture；测试以 Fake Client/可控 Promise 覆盖初次 Checking、成功、全部失败映射、Retry、旧请求丢弃和 Dispose/Unmount Abort。
- **verification:**
  ```powershell
  cd frontend
  npm run test -- --run src/app/backendConnection.test.ts
  ```
- **wave:** `2`
- **status:** `pending`

---

## M02-P03-T03 — 实现可访问的 Connection Indicator

- **task_id:** `M02-P03-T03`
- **goal:** 实现只消费连接状态与 Retry Callback 的纯展示组件，并覆盖 Sidebar 展开/折叠两态。
- **depends_on:** `[M02-P03-T02]`
- **write_scope:**
  - `frontend/src/components/shell/BackendConnectionStatus.tsx`
  - `frontend/src/components/shell/BackendConnectionStatus.module.css`
  - `frontend/src/components/shell/BackendConnectionStatus.test.tsx`
- **expected_output:**
  - `checking` 显示可见文本“正在连接后端”，`connected` 显示“后端已连接”，`disconnected` 显示“后端未连接”和可操作的“重试”。
  - Retry 只通过 Callback 上报用户意图，不直接调用 `fetch`、不拼 URL、不解释 Health DTO 或 HTTP Error。
  - 三种状态均以文本/语义表达而非只依赖颜色；Retry 可通过键盘操作并具有明确 Accessible Name（可访问名称）。
  - 组件适配 Sidebar Footer 的紧凑空间；Sidebar 折叠时仍通过可见文本替代、Accessible Name 或等价方式识别当前状态和 Retry，不破坏 Sidebar 主布局。
  - UI 不显示堆栈、绝对路径、原始 HTML Response 或开发用 Error Detail。
  - 测试覆盖三态文本、非纯颜色语义、Retry Callback、展开/折叠两态、键盘操作和主要 Accessible Name。
- **verification:**
  ```powershell
  cd frontend
  npm run test -- --run src/components/shell/BackendConnectionStatus.test.tsx
  ```
- **wave:** `3`
- **status:** `pending`

---

## M02-P03-T04 — 接入 App、Sidebar 并演进 Source Boundary

- **task_id:** `M02-P03-T04`
- **goal:** 将 Connection Lifecycle 和 Indicator 接入现有 App Shell，同时保持 M01 Fixture/UiIntent/交互边界不变。
- **depends_on:** `[M02-P03-T03]`
- **write_scope:**
  - `frontend/src/App.tsx`
  - `frontend/src/app/AppShell.tsx`
  - `frontend/src/components/shell/Sidebar.tsx`
  - `frontend/src/components/shell/Sidebar.module.css`
  - `frontend/src/app/AppConnection.test.tsx`
  - `frontend/src/test/sourceBoundary.test.ts`
- **expected_output:**
  - App Mount（应用挂载）后只执行一次初始 Probe；状态经 AppShell 传入 Sidebar Footer，Disconnected 的 Retry 可在不刷新页面的情况下发起新 Probe。
  - Sidebar 展开/折叠两态均能识别连接状态和 Retry；连接提示保持紧凑，不改变现有 Sidebar、Timeline、Composer 或 Acceptance Panel 的尺寸与操作基线。
  - Backend 不可达、超时、非 `200` 或 Payload 不合法时，本地 M01 UI 仍可使用，当前 Scenario、Conversation、Timeline、Composer Draft/Mode 和最近 UiIntent 不被清空、锁死或改写。
  - 集成使用 Mock Fetch 验证 Checking → Connected、Checking → Disconnected、Backend 恢复后的 Retry → Connected、旧请求不覆盖新结果和 Unmount Abort，不依赖真实 Backend/网络。
  - Source Boundary Test 将 M01“禁止所有 HTTP Client”的历史断言演进为 `fetch` 仅允许在 `frontend/src/api/`；Presentation、Fixture 与纯展示组件保持无 Backend Import。
  - M01 对 Router、浏览器持久化、全局状态库、计时器驱动 Agent、不安全 HTML 和异步 Mock Agent 的既有保护继续生效；不为 Connection 引入 Polling、自动 Retry 或全局状态库。
- **verification:**
  ```powershell
  cd frontend
  npm run test -- --run src/app/AppConnection.test.tsx src/test/sourceBoundary.test.ts
  npm run build
  ```
- **wave:** `4`
- **status:** `pending`

---

## M02-P03-T05 — 完成累计 Regression 与 M02 Feature Acceptance

- **task_id:** `M02-P03-T05`
- **goal:** 补齐前后端累计回归证据，执行完整自动测试、联合启动 Smoke、Git/Architecture 范围检查和唯一一次 M02 Feature Acceptance。
- **depends_on:** `[M02-P03-T04]`
- **write_scope:**
  - `frontend/src/test/m02Regression.test.tsx`
  - `frontend/src/test/m01Regression.test.tsx`（仅补充 Backend Connection 不改变 M01 行为的回归断言）
  - `M02-P03-T01` 至 `M02-P03-T04` 的 `write_scope`（仅修复 P03 Gate 发现的问题）
- **expected_output:**
  - M02 Regression（回归测试）覆盖 Base URL/Health Client、三态 Connection、初次 Probe、Retry、并发/过期请求保护、Sidebar 两态、Source Boundary 和无 Runtime 信息泄露；关键测试无 skip/todo。
  - M01 全量 Regression 继续覆盖六个 Scenario、四类 UiIntent、Conversation/Sidebar/Reasoning/Composer/Acceptance Panel 行为；Connection 成功或失败均不改变 Fixture/Presentation 语义、布局与键盘操作。
  - Backend pytest、Frontend Vitest 和 Frontend Production Build（生产构建）的最新完整运行均返回退出码 `0`；P03 不承接或掩盖 P01/P02 的测试债务。
  - 全新临时 Data Directory 首次启动后只有 Version `1`，同一目录重复启动保持 Schema/记录不变；Health、CORS、Settings、Transaction 和 Migration Contract 继续符合 SPEC。
  - `M02-R01` 至 `M02-R11` 均有自动或人工证据；Architecture Inspection（架构检查）确认没有 M03+ Entity、Repository/API、未来表、Agent、SSE 或 Runtime 能力。
  - Git 范围检查确认全部新增源码/测试已跟踪，Database/WAL/SHM、`.data`、`.env`、Virtual Environment、Python/Node Cache、`dist/`、`node_modules/` 和日志未进入暂存区。
- **verification:**
  ```powershell
  cd backend
  python -m pytest

  cd ..\frontend
  npm run test -- --run
  npm run build
  ```

  最终联合 Smoke 与 M02 Feature Acceptance：

  1. 准备全新临时 Data Directory，在 `127.0.0.1:8000` 启动 Backend，再启动 Frontend。
  2. 确认 UI 按 Checking → Connected 变化，调用 `/api/health` 得到 `200`、Database Ready 和 Schema Version `1`；M01 默认 Completed Scenario 和布局保持可用。
  3. 停止 Backend 后触发 Retry，确认进入 Disconnected，且 Fixture、Composer 和 Acceptance Panel 仍可操作。
  4. 使用同一 Data Directory 重启 Backend，再次 Retry，确认无需刷新页面即可恢复 Connected。
  5. 检查 `schema_versions` 仍只有 Version `1`，Name/Checksum/`applied_at` 与 Schema 未被重复启动改写，且没有未来领域表。
  6. 在 Sidebar 展开和折叠两态检查连接提示、Retry、键盘 Focus、文本/Accessible Name 和非纯颜色表达。
  7. 抽查六个 Scenario、Conversation/Reasoning/Composer 和四类 UiIntent，确认 M01 无功能或语义回归。
  8. 检查 `git status --short` 与暂存区，确认源码/测试已跟踪，Database、WAL/SHM、`.env`、Virtual Environment、Cache、`dist/` 和 `node_modules/` 未暂存。
  9. P01、P02、P03 Exit Gate 和 `M02-R01` 至 `M02-R11` 全部无证据缺口后，记录 M02 Feature Acceptance；停止，不增加 P04，不实现 M03。
- **wave:** `5`
- **status:** `pending`
