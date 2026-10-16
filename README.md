# 建筑行业合同审核 AI 平台

> 面向建设工程领域的本地化合同审查平台，基于 Ollama + 通义千问（Qwen）实现纯本地 AI 推理，无需任何外部 API。内置建筑行业专用法律法规库、审查模板与规则，前端将文件库与合同审核界面分离，配套 admin 角色权限体系与路由守卫。

---

## ✨ 核心特性

### 行业适配
- 内置 **9 部建筑行业核心法律法规**（建筑法、民法典·建设工程合同章、建工司法解释一、招标投标法及实施条例、建设工程质量管理条例、安全生产管理条例、价款结算办法、质量保证金管理办法、农民工工资支付条例）
- **11 套建筑行业专用审查模板** + **16 条专项审查规则**
- 审查立场、违约成本分析、法条引用与时效性标注

### 纯本地 AI（无外部 API）
- 大模型：**Ollama + Qwen2.5:14b**（OpenAI 兼容接口，显存不足可降级为 qwen2.5:7b）
- 向量化：**nomic-embed-text**（768 维）
- 视觉模型印章分析：未配置时自动回退到 tesseract.js OCR
- **扫描件 PDF 本地 OCR**：上传的图像型 PDF 自动检测并走 tesseract.js 中文 OCR 提取文字，无需外部 API（每页约 5-15 秒，关键数字建议人工复核）
- RAG 检索：Milvus 向量库 + 双通道检索（审查维度 + 合同内容）

### 前端界面（独立分离）
- **文件库**（`/library`）：合同列表、搜索筛选、分页、删除、继续审查
- **合同审核**（`/review`）：风险仪表盘、修改建议、法条引用、批量导出
- **智能问答**（`/qna`）：SSE 流式输出，按合同隔离上下文
- **首页**（`/`）：上传与预分析入口

### 用户权限体系（仅 admin）
- 登录页（`/login`）+ 路由守卫（`requiresAuth` / `requiresAdmin` / `guest` 三级元信息）
- 默认账号：**admin / admin123**（可用环境变量 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 覆盖）
- 用户管理页（`/users`）+ 设置页（`/settings`）：仅 admin 可见，支持角色切换
- 登录态写入 localStorage，导航栏按角色动态显示

### OnlyOffice 协同编辑
- 文档内精准定位条款，添加批注与修改建议
- 一键采纳建议并高亮变更，版本对比与缺失条款补全

### 基础设施（Docker 一键部署）
- PostgreSQL 16
- Milvus 2.4.4 + etcd + RustFS
- OnlyOffice Document Server 9.3

---

## 📸 界面展示

> 以下均为本地实际运行截图，前端已将「文件库」与「合同审核」拆分为独立页面，并按 admin 角色做路由守卫。

### 1. 工作台（首页 · `/`）

上传入口与四步审查流程引导：上传合同 → 确认范围 → 查看结果 → 采纳修改。

<img src="docs/images/01-workbench.png" width="820" alt="工作台首页 - 合同审查工作台">

### 2. 文件库（`/library`）

合同文件集中管理：按文件名搜索、按状态/类型筛选、分页，支持查看详情、继续审查与删除。

<img src="docs/images/02-file-library.png" width="820" alt="文件库 - 合同文件管理">

### 3. 合同审查（`/review`）

智能合同审查上传页，支持 .docx / .pdf（扫描件自动本地 OCR），并提供多合同关联分析（主合同 + 附件 + 补充协议一并审查）。

<img src="docs/images/03-contract-review.png" width="820" alt="合同审查 - 智能合同审查上传">

### 4. 智能问答（`/qna`）

可按合同隔离上下文提问法律与合同问题，也可直接咨询法条、裁判文书、审查规则。

<img src="docs/images/04-qa.png" width="820" alt="智能问答 - 法律与合同问答">

### 5. 知识库（`/knowledge`）

统一管理审查依据：知识库（法条/裁判文书）、审查模板管理、标准条款库，支持重建向量数据库与失效法律标注。

<img src="docs/images/05-knowledge-base.png" width="820" alt="知识库 - 管理审查依据">

### 6. 用户管理（`/users` · 仅 admin）

权限管理页面，仅管理员可访问，用于查看系统用户并管理角色权限。

<img src="docs/images/06-user-management.png" width="820" alt="用户管理 - 权限管理">

---

## 🏗️ 技术栈

### 前端
- Vue 3 + Vite 6
- Element Plus + Tailwind CSS
- OnlyOffice Document Editor (Vue)
- Vue Router 4（含路由守卫）

### 后端
- Node.js + Express 4
- Knex 3 + PostgreSQL（pg）
- Socket.IO（实时进度推送）

### AI / RAG
- Ollama（OpenAI 兼容接口）
- Qwen2.5:14b / nomic-embed-text
- Milvus 向量数据库
- 法律 Markdown 解析 + 裁判文书 JSON 解析
- tesseract.js OCR（印章与签名分析回退方案）

### 基础设施
- Docker Compose
- PostgreSQL / Milvus / MinIO / etcd / OnlyOffice

---

## 📁 项目结构

```text
.
├── backend/
│   ├── data/
│   │   ├── laws/建设工程/        # 9 部建筑行业法律法规（Markdown）
│   │   ├── candidate_55192/     # 裁判文书样例
│   │   ├── reviewTemplates.json # 11 套建筑行业审查模板
│   │   └── reviewRules.json     # 16 条建筑行业审查规则
│   ├── routes/                  # contracts / qa / users / knowledge / templates / standards
│   ├── services/                # AI / 向量库 / 检索 / 企业核验
│   ├── database.js / database-check.js
│   └── .env                     # Ollama + 数据库 + OnlyOffice 配置
│
├── frontend/
│   └── src/
│       ├── views/
│       │   ├── Home.vue         # 上传与预分析入口（requiresAuth）
│       │   ├── Library.vue      # 文件库（requiresAuth）
│       │   ├── Review.vue       # 合同审核（requiresAuth）
│       │   ├── QnA.vue          # 智能问答（requiresAuth）
│       │   ├── Settings.vue     # 设置（requiresAdmin）
│       │   ├── Users.vue        # 用户管理（requiresAdmin）
│       │   └── Login.vue        # 登录（guest）
│       ├── router/index.js      # 三级路由守卫
│       └── user.js              # 登录态 / 角色 / 登出
│
├── data/                        # Docker 持久化目录（已忽略）
├── docs/images/                 # README 界面展示截图
├── docker-compose.yml
└── README.md
```

---

## 🚀 快速开始

### 0. 前置要求

| 依赖 | 版本/说明 |
|---|---|
| Ollama | 用于本地大模型推理，安装见 https://ollama.com/download/windows |
| Docker Desktop | 用于启动 PostgreSQL / Milvus / OnlyOffice |
| Node.js | LTS 版本（建议 ≥ 20） |
| GPU | 建议显存 ≥ 16GB（14b 模型）；显存不足降级 qwen2.5:7b |
| 可用磁盘 | ≥ 30GB（模型约 10GB + Docker 数据 + 上传文件） |

### 1. 克隆仓库

```bash
git clone https://github.com/HelloHY/contract_review.git
cd contract_review
```

> 默认分支为 `main`。

### 2. 安装并配置 Ollama 本地模型

```powershell
# 安装 Ollama 后，拉取模型（建议先设置 OLLAMA_MODELS 指向 SSD 大盘）
[Environment]::SetEnvironmentVariable("OLLAMA_MODELS", "F:\ollama\models", "User")

# 重启 PowerShell 让环境变量生效，然后：
ollama pull qwen2.5:14b        # 主模型，约 9GB
ollama pull nomic-embed-text   # 向量化模型，约 270MB
```

显存不足时把 `backend/.env` 里的 `LLM_MODEL` 改为 `qwen2.5:7b`，并 `ollama pull qwen2.5:7b`。

### 3. 启动基础设施服务

```bash
docker compose up -d
```

将启动：PostgreSQL（5432）、OnlyOffice（8081）、Milvus（19530）+ etcd + MinIO（9000）。

### 4. 配置后端环境变量

`backend/.env` 已配置好 Ollama 本地接口，关键项：

```env
LLM_BASE_URL=http://localhost:11434/v1
LLM_API_KEY=ollama
LLM_MODEL=qwen2.5:14b
EMBEDDING_BASE_URL=http://localhost:11434/v1
EMBEDDING_API_KEY=ollama
EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_DIM=768
RERANK_MODEL=                  # 留空跳过 rerank
DATABASE_URL=postgres://contract_review:contract_review@127.0.0.1:5432/contract_review
ONLYOFFICE_URL=http://localhost:8081
```

如需修改默认 admin 账号：

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### 5. 安装后端依赖并启动

```bash
cd backend
npm install
npm run dev
```

首次启动会自动：
- 重建数据库表结构（含 users 表的 username / password_hash / role 字段）
- 创建默认 admin 账号
- Seed 建筑行业法律法规（9 部）到向量库
- Seed 11 套审查模板与 16 条审查规则

### 6. 安装前端依赖并启动

```bash
cd frontend
npm install
npm run dev
```

访问地址：**http://localhost:8080**

登录账号：**admin / admin123**

---

## ⚙️ 关键环境变量

### Backend

| 变量 | 说明 |
|---|---|
| `PORT` | 后端监听端口（默认 3000） |
| `LLM_BASE_URL` | Ollama OpenAI 兼容接口地址 |
| `LLM_MODEL` | 主模型名（默认 qwen2.5:14b） |
| `EMBEDDING_MODEL` | 向量化模型（默认 nomic-embed-text） |
| `EMBEDDING_DIM` | 向量维度（必须与模型一致，768） |
| `RERANK_MODEL` | 重排模型，留空则跳过 rerank |
| `DATABASE_URL` | PostgreSQL 连接串 |
| `MILVUS_ADDRESS` | Milvus 地址（默认 localhost:19530） |
| `ONLYOFFICE_URL` / `ONLYOFFICE_JWT_SECRET` | OnlyOffice 配置 |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | 默认 admin 账号覆盖 |
| `KNOWLEDGE_SEED_TYPES` | 启动时种子数据类型（law,case） |
| `LAW_SEED_DIRS` | 法律种子目录（留空遍历整个 data/laws） |
| `VISION_MODEL_NAME` | 视觉模型（印章分析，留空回退 OCR） |
| `PDF_OCR_ENABLED` | 扫描件 PDF 自动 OCR 开关（默认 true） |
| `PDF_OCR_MAX_PAGES` | 扫描件最多 OCR 页数（默认 30，超出截断） |
| `PDF_OCR_SCALE` | 渲染缩放倍数（默认 2.5≈180DPI，精度不足可调 3.0） |
| `PDF_OCR_LANG` | OCR 语言包（默认 chi_sim+eng） |
| `TESSDATA_DIR` | 语言包目录（默认 data/tessdata，已随项目分发 tessdata_fast） |
| `COMPANY_API_PROVIDER` | 企业核验数据源（默认 web_search） |

### Frontend

| 变量 | 说明 |
|---|---|
| `VITE_APP_BACKEND_API_URL` | 后端 API 地址（不带 /api） |
| `VITE_APP_ONLYOFFICE_URL` | 浏览器可访问的 OnlyOffice 地址 |

---

## � 安全注意事项

- **不要提交**：`.env`、API Key、数据库密码、上传文件、Docker 数据目录
- 默认 admin 账号 `admin/admin123` 仅供本地测试，**生产部署务必修改**（设置环境变量或登录后到用户管理页修改）
- 联网搜索仅用于公开信息检索，涉及敏感内容时自动拒绝
- 数据库仅保存路径与元数据，不保存文件二进制内容

---

## 🛠️ 生产构建

```bash
cd frontend
npm run build
```

构建产物输出到 `frontend/dist/`，可直接由 Nginx 或后端静态目录托管。

---

## � 路由与权限一览

| 路径 | 页面 | 权限要求 |
|---|---|---|
| `/login` | 登录 | 仅未登录可访问 |
| `/` | 首页（上传入口） | 登录 |
| `/library` | 文件库 | 登录 |
| `/review` | 合同审核 | 登录 |
| `/qna` | 智能问答 | 登录 |
| `/settings` | 系统设置 | 仅 admin |
| `/users` | 用户管理 | 仅 admin |

路由守卫实现见 `frontend/src/router/index.js`：未登录访问受保护页面自动跳转登录并携带 `redirect` 参数。

---

## 📄 License

