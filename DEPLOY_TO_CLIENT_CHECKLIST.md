# 部署到甲方服务器与防欠款检查清单

> 本文档仅说明现有配置与流程，不修改任何代码。用于乙方（你方）将 AixL 平台部署到甲方服务器时，如何交付、如何通过现有授权机制降低甲方不付款风险。

---

## 一、整体架构与权限划分

### 1.1 谁部署什么

| 角色 | 部署内容 | 存放位置/说明 |
|------|----------|----------------|
| **乙方（你方）** | **授权服务器 (license-server)** | 必须部署在你方控制的服务器（建议境外或独立域名），甲方无法关停 |
| **乙方** | 授权管理 | 在 license-server 上为甲方创建/续期/吊销 License，不把 license-server 源码或管理权交给甲方 |
| **甲方** | 业务系统 | 前端 + 后端 + 管理后台 + Postgres + Redis（按 `docker-compose.yml` 部署在甲方服务器） |
| **甲方** | 环境变量 | 乙方只提供：`LICENSE_KEY`、`LICENSE_SERVER`（你方 license 服务地址），以及业务所需的其他配置 |

### 1.2 防欠款依赖的现有机制

- **授权服务器在你方**：甲方后端必须能访问 `LICENSE_SERVER` 才能通过校验；你方可随时停用/吊销某 License。
- **License 有时效与绑定**：过期、吊销、超台数、硬件指纹不符时，验证失败；可配置 `LICENSE_FORCE_STOP=true` 让甲方后端在授权失败时直接退出。
- **心跳与审计**：甲方后端会定期向 license-server 上报心跳，你方可在 license-server 查看使用记录。

---

## 二、乙方必须先完成的准备（不交给甲方）

### 2.1 部署并运维 license-server（你方自有服务器）

- **代码目录**：`license-server/`
- **主要能力**：
  - 对外提供验证接口：`POST {LICENSE_SERVER}/api/verify`
  - 你方管理员在 license-server 上为甲方创建 License（含过期时间、最大绑定服务器数等）
  - 支持吊销、续期、查看心跳记录
- **部署方式**：可用 Docker 单独部署，或与你方现有 Node 服务一起部署；需独立数据库（见 `license-server/prisma/schema.prisma`）。
- **安全**：admin 接口需做访问控制（见 `license-server/src/admin/`），仅你方使用，不向甲方开放。

### 2.2 为甲方创建 License

- 在 license-server 管理端调用创建接口，得到 `LICENSE_KEY`（格式如 `AIXL-XXXX-XXXX-XXXX`）。
- 建议策略：
  - **试用/首期**：`expiresAt` 设为合同约定的试用结束日；`maxServers` 设为 1（或合同约定台数）。
  - **正式/续费后**：再创建新 License 或对现有 License 做续期（extend），把 `expiresAt` 延长。
- 若甲方不付款：在 license-server 上对该客户 License 执行 **revoke（吊销）**；若你方在甲方环境配置了 `LICENSE_FORCE_STOP=true`，甲方后端会在下次心跳/校验失败时退出。

---

## 三、交付给甲方的文件与部署步骤（不改代码）

### 3.1 交付物清单（仅文件，不含 license-server 源码或管理权）

- 根目录下的 **业务代码**（前端、后端、admin-web、contracts 等），即除 `license-server/` 外你愿意交付的仓库部分；或你提供的构建产物。
- **部署与配置相关**（现有文件，不改内容即可使用）：
  - `docker-compose.yml`：生产环境编排
  - `Dockerfile`（根目录）、`server/Dockerfile`、`admin-web/Dockerfile`
  - `nginx/nginx.conf`：反向代理与 SSL 占位
  - `scripts/deploy.sh`：部署脚本
  - `.env.production.example`：环境变量模板（复制为 `.env.production` 后由乙方/甲方按约定填写）

### 3.2 环境变量（甲方服务器）

甲方（或你方代填）在部署目录复制并编辑：

```bash
cp .env.production.example .env.production
```

**必须由乙方提供或确认的与防欠款相关的变量：**

| 变量 | 说明 | 谁填 |
|------|------|------|
| `LICENSE_KEY` | 乙方在 license-server 为甲方创建的密钥 | 乙方提供 |
| `LICENSE_SERVER` | 乙方 license 服务地址（如 `https://license.your-company.com`） | 乙方提供 |
| `LICENSE_FORCE_STOP` | `true`=授权失败则后端退出；`false`=降级运行 | 建议乙方要求设为 `true` |

其他如 `DB_PASSWORD`、`JWT_SECRET`、`ADMIN_TOKEN`、`NEXT_PUBLIC_*` 等按 `DEPLOYMENT.md` 与 `.env.production.example` 填写。

### 3.3 甲方服务器部署步骤（按现有文档执行即可）

1. **环境**：安装 Docker、Docker Compose（见 `DEPLOYMENT.md` 系统要求）。
2. **配置**：在项目根目录准备 `.env.production`（含上述 `LICENSE_*` 等）。
3. **SSL**：将证书放到 `nginx/ssl/`，并修改 `nginx/nginx.conf` 中 `server_name` 为甲方域名（若需）。
4. **执行部署脚本**（不改脚本内容）：
   ```bash
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   ```
   脚本会：检查环境变量 → 停止旧容器 → 构建镜像 → 启动服务 → 跑数据库迁移 → 健康检查。
5. **验证**：
   - `curl http://localhost:3001/health` 或通过 Nginx 访问 `/health`
   - 前端、管理后台能正常打开且能调通后端 API

---

## 四、现有授权机制说明（用于防欠款）

### 4.1 后端如何校验 License（当前逻辑，无需改代码）

- **启动时**：后端读取 `LICENSE_KEY`、`LICENSE_SERVER`，调用 `POST {LICENSE_SERVER}/api/verify`，带硬件指纹等信息；成功则标记为已授权，并启动定时心跳（默认每 12 小时）。
- **心跳**：定期再次调用 verify；若失败且 `LICENSE_FORCE_STOP=true`，进程 `process.exit(1)`；若为 `false`，置为降级模式（部分能力可能受限，取决于你是否在业务里使用 LicenseGuard）。
- **网络异常**：有宽限期（默认 168 小时），宽限内用缓存结果；超时则按上面逻辑处理。

### 4.2 license-server 侧能力（你方控制）

- **创建 License**：customerId、customerName、expiresAt、maxServers、features 等。
- **吊销**：`revoke` 后，该 Key 验证即返回失败。
- **续期**：extend 更新 `expiresAt`。
- **指纹**：首次验证会绑定甲方服务器指纹；`maxServers` 限制可绑定机器数；超限返回 HARDWARE_MISMATCH。
- **心跳记录**：便于你方审计甲方是否在用、何时在用。

### 4.3 建议的防欠款策略（仅配置与流程，不改代码）

1. **合同与 License 对应**：一个客户一个 License（或按合同分多 License），便于按客户吊销/续期。
2. **首期/试用**：创建短效 License（如 1–3 个月），到期前提醒续费；不续费则不再续期或直接吊销。
3. **强制停服**：要求甲方生产环境 `LICENSE_FORCE_STOP=true`，这样一旦吊销或过期，后端会退出，甲方无法“白用”。
4. **License 服务器高可用**：license-server 部署在你方可靠环境，避免因你方故障导致误判为欠款而停服；可设较长 `LICENSE_TIMEOUT_MS` 和宽限期。
5. **不交付 license-server**：不把 license-server 源码、数据库或 admin 权限交给甲方，授权中心始终在你方。

---

## 五、部署相关文件索引（便于逐项检查）

| 用途 | 文件/目录 |
|------|-----------|
| 生产编排 | `docker-compose.yml` |
| 部署脚本 | `scripts/deploy.sh` |
| 环境变量模板 | `.env.production.example` |
| 部署说明 | `DEPLOYMENT.md` |
| Nginx 配置 | `nginx/nginx.conf` |
| 前端镜像 | 根目录 `Dockerfile` |
| 后端镜像 | `server/Dockerfile` |
| 管理后台镜像 | `admin-web/Dockerfile` |
| 授权服务（仅乙方） | `license-server/`（不交付给甲方） |
| 后端授权逻辑 | `server/src/license/`（随业务交付，但甲方无法控制 license-server） |

---

## 六、简要检查清单（部署前勾选）

**乙方（你方）：**

- [ ] license-server 已部署在你方服务器且可对外提供 `POST /api/verify`
- [ ] 已为甲方创建 License，并记录 Key、过期时间、maxServers
- [ ] 已把 `LICENSE_KEY`、`LICENSE_SERVER` 交给甲方（或代为填入 `.env.production`）
- [ ] 与甲方约定 `LICENSE_FORCE_STOP=true`（建议）

**甲方（或你方代甲方）部署业务：**

- [ ] 已复制 `.env.production.example` 为 `.env.production` 并填齐变量
- [ ] `LICENSE_KEY`、`LICENSE_SERVER` 已填且可访问
- [ ] 已配置 Nginx SSL 与域名（如需要）
- [ ] 执行 `./scripts/deploy.sh` 无报错
- [ ] `curl .../health` 正常；前端、管理后台可访问且 API 正常

**防欠款：**

- [ ] 合同/内部流程明确：试用期结束或欠款时由乙方在 license-server 执行吊销或不再续期
- [ ] 生产环境使用 `LICENSE_FORCE_STOP=true`，确保授权失败时后端会停止服务

---

以上流程仅基于当前仓库已有能力，未修改任何代码文件；防欠款效果依赖你方正确部署并运维 license-server，以及甲方环境变量中 `LICENSE_*` 的配置。
