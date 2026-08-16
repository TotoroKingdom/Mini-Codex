# M03-P01 — Domain, Path & Persistence TASK

## 执行边界

- 仅实现 `M03-P01`：Workspace Entity（工作区实体）与领域错误、Application Port（应用端口）、Windows Path Resolver（Windows 路径解析器）、Version `2` Migration（迁移）、SQLite Workspace Repository（工作区仓储）和四个 Application Use Case（应用用例）。
- 复用 M02 的 Python、Database Boundary（数据库边界）、Migration Descriptor/Checksum/Registry/Runner（迁移描述/校验和/注册表/执行器）、Application Factory（应用工厂）、Lifespan（生命周期）、Health Contract（健康检查契约）和统一启动入口；不得修改已应用的 Version `1` Migration。
- P01 不新增公开 Workspace Route（工作区路由）、Request/Response Schema（请求/响应模式）或 CORS 演进；这些内容留给 `M03-P02`。不实现任何 Frontend（前端）内容；这些内容留给 `M03-P03`。
- 不创建 Conversation、Message、Session、Run、Tool、Memory、通用 Repository Framework（仓储框架）、ORM、Unit of Work（工作单元）或 M04+ 空壳。
- 自动测试使用临时 Data Directory（数据目录）、固定 Clock/ID、Fake/Stub Repository 与 Fake OS Boundary（伪操作系统边界），保持离线、确定且不依赖管理员权限、开发者固定目录或真实权限配置。
- 每个 TASK 完成后运行其必要测试；最后一个 TASK 执行 P01 全量测试、Version `1 → 2` 启动 Smoke（冒烟检查）、Git 范围检查和 Exit Gate，通过后停止，不展开 P02/P03。

---

## M03-P01-T01 — 固定 Workspace Domain 与 Application Port

- **task_id:** `M03-P01-T01`
- **goal:** 定义 Workspace 的稳定领域模型、值约束、错误类型以及四个用例所需的最小可注入 Port。
- **depends_on:** `[]`
- **write_scope:**
  - `backend/src/mini_agent/domain/workspaces/model.py`
  - `backend/src/mini_agent/domain/workspaces/errors.py`
  - `backend/src/mini_agent/application/workspaces/ports.py`
  - `backend/tests/unit/test_workspace_domain.py`
  - `backend/tests/unit/test_workspace_ports.py`
- **expected_output:**
  - `Workspace` 只承载 `id`、`name`、`root_path`、内部 `root_path_key`、`created_at`、`updated_at` 和 `last_opened_at`；Availability（可用性）固定为 `available | missing | not_directory | inaccessible`，且不是持久化字段。
  - 名称统一去除首尾空白，限制为 `1..80` 个 Unicode Code Point（Unicode 码点），拒绝 C0 Control Character（控制字符）和换行；默认名称规则明确为已规范化目录路径的最后一段，不限制不同 Workspace 同名。
  - 固定创建、Rename（重命名）和 Open（打开）涉及的不可变字段与时间关系；持久化时间统一为 UTC、固定毫秒精度 `YYYY-MM-DDTHH:mm:ss.SSSZ`，创建时三个时间相等，Rename/Open 不改变 Root 身份。
  - 定义稳定、安全的 Workspace Domain Error（领域错误），覆盖 `workspace_not_found`、`workspace_already_exists`、`workspace_name_invalid`、`workspace_path_invalid`、`workspace_path_missing`、`workspace_path_not_directory`、`workspace_path_inaccessible` 和 `workspace_persistence_failed`；Duplicate Error（重复错误）可携带已有 `workspace_id`，但不携带 SQL、数据库路径、原始 `OSError` 或 Traceback（堆栈）。
  - `WorkspaceRepository` 仅声明 `create/list_all/get_by_id/get_by_root_path_key/rename/touch_opened`；`WorkspacePathResolver`、ID Generator（标识生成器）和 Clock（时钟）均为可注入 Port，不依赖 FastAPI、SQLite 或具体操作系统异常类型。
  - 测试覆盖合法/非法/默认名称、Unicode 长度、不可变 Root、时间格式与先后关系、Availability/Error 取值，以及 Port 的最小公开操作；领域模块不访问文件系统、SQLite 或 HTTP。
- **verification:**
  ```powershell
  cd backend
  python -m pytest tests/unit/test_workspace_domain.py tests/unit/test_workspace_ports.py
  ```
- **wave:** `1`
- **status:** `pending`

---

## M03-P01-T02 — 实现 Windows Workspace Path Resolver

- **task_id:** `M03-P01-T02`
- **goal:** 按固定顺序实现 Windows 盘符绝对目录的语法拒绝、真实目标解析、可用性分类和大小写不敏感身份键。
- **depends_on:** `[M03-P01-T01]`
- **write_scope:**
  - `backend/src/mini_agent/infrastructure/workspaces/windows_path_resolver.py`
  - `backend/tests/unit/test_windows_workspace_path_resolver.py`
- **expected_output:**
  - 严格执行 `Trim → 拒绝不支持语法/非绝对路径/卷根 → 规范化分隔符与 Dot Segment → 解析真实 Junction/Symlink Target → 再次验证受支持命名空间 → 验证目录类型 → 基础列目录访问 → 构造 root_path_key` 的顺序。
  - 仅接受 Backend 所在 Windows 主机可访问的 Drive-rooted Absolute Path（盘符绝对路径）；拒绝空值、相对路径、`C:project`、Volume Root（卷根）、UNC、Device Path（设备路径）、Extended-length Path（扩展长度路径），且不展开 `%ENV_VAR%`、`$env:...` 或 `~`。
  - 成功结果返回真实解析后的绝对 `root_path` 和统一分隔符、无尾分隔符、Windows Case-insensitive（大小写不敏感）的 `root_path_key`；大小写、`/`/`\`、`.`/`..` 以及 Junction/Symlink Alias 指向同一最终目录时身份键相同。
  - 当前路径状态准确分类为 `available`、`missing`、`not_directory` 或 `inaccessible`；基础列目录检查不递归扫描、不读取子文件、不检查写权限，所有 OS Exception（操作系统异常）均封装为类型化安全错误。
  - Resolver 支持用隔离 Fixture 或 Fake OS Boundary 确定性模拟 Permission Error（权限错误）、别名解析和异常路径；关键矩阵无 skip/todo，不要求管理员权限或开发者机器固定目录。
  - 测试覆盖合法目录、大小写/分隔符/Dot Segment/别名同一性、解析后指向不支持命名空间，以及 Relative、Volume Root、UNC、Device/Extended、Missing、File、Inaccessible 和原始异常不泄漏。
- **verification:**
  ```powershell
  cd backend
  python -m pytest tests/unit/test_windows_workspace_path_resolver.py
  ```
- **wave:** `2`
- **status:** `pending`

---

## M03-P01-T03 — 追加 Version 2 Workspace Migration

- **task_id:** `M03-P01-T03`
- **goal:** 通过 M02 的迁移机制追加 `002_workspaces`，验证空库和既有 Version `1` 数据库均安全、幂等地升级到 Version `2`。
- **depends_on:** `[M03-P01-T01]`
- **write_scope:**
  - `backend/src/mini_agent/infrastructure/sqlite/migrations/versions/v002_workspaces.py`
  - `backend/src/mini_agent/infrastructure/sqlite/migrations/registry.py`
  - `backend/tests/unit/test_migration_model.py`
  - `backend/tests/integration/test_migration_runner.py`
  - `backend/tests/integration/test_sqlite_lifespan.py`
  - `backend/tests/integration/test_health_api.py`
  - `backend/tests/integration/test_p02_regression.py`
- **expected_output:**
  - Production Registry（生产迁移注册表）按连续顺序且仅包含既有 `001_schema_versions` 与新增 `002_workspaces`；Version `1` 文件、名称、Checksum（校验和）和已应用历史保持不变。
  - `workspaces` 表只包含 `id/name/root_path/root_path_key/created_at/updated_at/last_opened_at` 七个 `TEXT NOT NULL` 字段，`id` 为 Primary Key（主键），`root_path_key` 具有 Database Unique Constraint（数据库唯一约束）；不加入 Availability 或未来字段。
  - Version `2` DDL 与 `schema_versions` 记录继续由既有 Runner 在单 Migration 原子事务中执行；失败时 DDL 和 Version `2` 历史一起回滚，既有 Version `1` 不受影响。
  - 全新数据库、Version `1 → 2` Upgrade（升级）和同一 Data Directory 重复启动均到达且保持 Version `2`；`/api/health` 保持 M02 Response Schema（响应模式）不变并报告 `schema_version: 2`。
  - Schema Inspection（模式检查）确认生产库只有 `schema_versions` 与 `workspaces` 两张业务相关表，不创建 Conversation、Session、Message、Run、Tool 或 Memory 表。
  - 测试覆盖 Migration Descriptor/Registry、Version `1` History/Checksum 不变、空库、升级、幂等、事务回滚、精确列约束、`root_path_key` 唯一性、Lifespan 重启和 Health Version 回归。
- **verification:**
  ```powershell
  cd backend
  python -m pytest tests/unit/test_migration_model.py tests/integration/test_migration_runner.py tests/integration/test_sqlite_lifespan.py tests/integration/test_health_api.py tests/integration/test_p02_regression.py
  ```
- **wave:** `2`
- **status:** `pending`

---

## M03-P01-T04 — 实现 SQLite Workspace Repository

- **task_id:** `M03-P01-T04`
- **goal:** 基于 M02 短连接与事务边界实现 WorkspaceRepository 的完整 SQLite Adapter（适配器）。
- **depends_on:** `[M03-P01-T01, M03-P01-T03]`
- **write_scope:**
  - `backend/src/mini_agent/infrastructure/sqlite/workspace_repository.py`
  - `backend/tests/integration/test_workspace_repository.py`
- **expected_output:**
  - SQL 仅位于 SQLite Adapter；每个操作复用 M02 `Database.read_connection()` 或 `Database.transaction()`，不建立第二套连接、事务或 Unit of Work 策略。
  - `create` 在单个事务中写入完整七字段记录；`list_all` 按 `last_opened_at DESC, created_at DESC, id ASC` 稳定排序；`get_by_id` 和 `get_by_root_path_key` 精确查询当前记录。
  - `rename` 只更新 `name/updated_at`；`touch_opened` 使用同一个 `opened_at` 更新 `last_opened_at/updated_at`；两者均区分成功与零行更新，不改变 `id/root_path/root_path_key/created_at`。
  - `root_path_key` 唯一约束是并发重复的最终保护，冲突准确映射为带已有 `workspace_id` 的 `workspace_already_exists`；其他 SQLite 失败映射为安全 `workspace_persistence_failed`，不泄漏 `sqlite3.Connection`、`sqlite3.Row`、SQL、绝对数据库路径或底层异常文本。
  - Row Mapping（行映射）要求所有字段存在且满足 Workspace 不变量；缺字段或损坏数据不得静默补默认值，并通过安全 Persistence Error（持久化错误）离开 Adapter。
  - 集成测试覆盖 Create/List/Get/Rename/Touch、稳定排序、Duplicate、Not Found、完整/损坏 Row Mapping、Root 不可变、提交持久化和失败回滚；Repository 不访问文件系统或生成 HTTP/UI 文案。
- **verification:**
  ```powershell
  cd backend
  python -m pytest tests/integration/test_workspace_repository.py
  ```
- **wave:** `3`
- **status:** `pending`

---

## M03-P01-T05 — 编排四个 Workspace Application Use Case

- **task_id:** `M03-P01-T05`
- **goal:** 用可注入 Repository、Path Resolver、ID Generator 和 Clock 实现无需 FastAPI 即可调用的 Create/List/Rename/Open 业务内核。
- **depends_on:** `[M03-P01-T02, M03-P01-T04]`
- **write_scope:**
  - `backend/src/mini_agent/application/workspaces/service.py`
  - `backend/tests/unit/test_workspace_service.py`
  - `backend/tests/integration/test_workspace_service_integration.py`
- **expected_output:**
  - Create 先校验并解析路径、构造默认或自定义名称，再检查持久重复并写入完整 Workspace；创建成功同时视为成功打开，返回 `available`，失败不留下部分记录。
  - List 从 Repository 取得稳定排序记录并逐条投影当前 Availability；单条路径的 Missing、Not Directory、Inaccessible 或检查异常只影响该 Item，不使整个列表失败。
  - Rename 先校验名称，仅更新 `name/updated_at`，不要求 Root 当前可用；响应 Availability 是独立投影，路径失效不改变 Rename 成功事实，也不改变当前 Root 身份。
  - Open 先按 ID 读取并重新验证持久化 `root_path`，仅在 `available` 后调用 `touch_opened`；Missing、Not Directory、Inaccessible 或其他失败不更新 `last_opened_at/updated_at`，成功结果反映同一个打开时间。
  - Application Service（应用服务）不依赖 FastAPI、Pydantic、SQLite 或裸 OS Exception；生产 ID 使用 UUID，生产 Clock 使用 UTC 且输出固定毫秒格式，测试可注入固定值以验证全部时间和排序不变量。
  - Duplicate 的 Application 预检查返回已有 Workspace ID，但不能替代 Repository 唯一约束；Not Found、Duplicate、Path 和 Persistence Error 保持 T01 的稳定安全类型。
  - 单元测试使用 Fake/Stub 覆盖四个用例、默认名称、非法名称、重复预检查与最终约束、稳定排序、单项失效隔离、Rename 失效投影、Open 失败无 Touch 和调用顺序；集成测试使用临时目录与真实 SQLite Adapter 完成 Create/List/Rename/Open，不经过 HTTP。
- **verification:**
  ```powershell
  cd backend
  python -m pytest tests/unit/test_workspace_service.py tests/integration/test_workspace_service_integration.py
  ```
- **wave:** `4`
- **status:** `pending`

---

## M03-P01-T06 — 完成 P01 Regression、启动 Smoke 与 Exit Gate

- **task_id:** `M03-P01-T06`
- **goal:** 汇总 P01 自动与人工证据，完成 Backend 全量回归、Version `1 → 2` 真实启动 Smoke、Git/Schema/Source 范围检查和 P01 Exit Gate。
- **depends_on:** `[M03-P01-T05]`
- **write_scope:**
  - `backend/tests/integration/test_m03_p01_regression.py`
  - `M03-P01-T01` 至 `M03-P01-T05` 的 `write_scope`（仅修复 P01 Gate 发现的问题）
- **expected_output:**
  - P01 Regression Test（回归测试）串联真实 Migration、SQLite Repository、Windows Path Resolver 和 Application Service，覆盖 `M03-R01` 至 `M03-R05` 以及 `M03-R07` 的 Backend 内部证据；关键测试无 skip/todo。
  - 全新 Data Directory 与只含已应用 Version `1` 的临时数据库均通过应用 Lifespan 到达 Version `2`；同一目录再次启动不改写两条 Migration History（迁移历史），Health 保持 M02 Schema 并返回 Ready/Version `2`。
  - Backend 全量 pytest 返回退出码 `0`；`python -m mini_agent` 能在 Windows 上启动、响应 `/api/health`、正常停止，Import/App Factory 创建仍无额外文件系统副作用。
  - Schema Inspection 确认 `workspaces` 是唯一新增业务表且 `root_path_key` 唯一；Source Inspection（源码检查）确认没有 `/api/workspaces` 公开 Route、Workspace HTTP Schema、CORS 放宽、Frontend 改动、M04+ 实体/表/API、目录浏览、文件操作或通用 Framework。
  - Git 范围检查确认 Version `1` Migration 未修改，P01 新增源码/测试已跟踪，且数据库、WAL/SHM、Cache、临时目录、Virtual Environment（虚拟环境）和测试产物未暂存。
  - Fake 与真实 SQLite Adapter 上的 Create/List/Rename/Open、禁止路径矩阵、四种 Availability、唯一约束、事务和失败无时间更新全部通过；P01 Exit Gate 通过后停止，不生成或实现 P02/P03 TASK。
- **verification:**
  ```powershell
  cd backend
  python -m pytest
  python -m mini_agent
  ```

  Windows Smoke、范围检查与 Exit Gate：

  1. 使用临时 Data Directory 启动 Backend，访问 `/api/health`，确认 HTTP `200`、M02 固定响应结构和 `schema_version: 2`，随后正常停止服务。
  2. 准备一份仅完成 M02 Version `1` 的临时数据库并启动 Backend，确认自动升级；使用同一目录再次启动，确认 `schema_versions` 中 Version `1`、`2` 各一条且历史未被重写。
  3. 检查 SQLite Schema、列和索引/唯一约束，确认只新增 `workspaces`，没有 Availability 持久化字段或 M04+ 表。
  4. 执行禁止路径、别名去重和四种 Availability 的 P01 回归；权限、Junction/Symlink 与异常场景只使用隔离 Fixture/Fake OS Boundary，不依赖管理员权限。
  5. 检查 FastAPI Route、CORS、Frontend 与源码目录，确认 P01 没有公开 Workspace Endpoint 或 P02/P03/M04+ 实现，M02 Health 之外的 HTTP Contract 未改变。
  6. 在仓库根目录执行 `git status --short`、暂存区和 Version `1` Diff 检查，确认新增源码/测试已跟踪，运行时数据库/WAL/SHM/Cache/临时产物未暂存，改动只属于 P01。
  7. 确认全部自动与人工证据通过后记录 P01 Exit Gate；停止，不展开 `M03-P02` 或 `M03-P03`。
- **wave:** `5`
- **status:** `pending`
