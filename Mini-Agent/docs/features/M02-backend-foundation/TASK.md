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
  python -m mini_agent
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
