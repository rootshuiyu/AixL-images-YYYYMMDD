# 部署执行步骤（甲方服务器 / 有 Docker 的环境）

在**已安装 Docker 和 Docker Compose**的服务器上，按以下顺序执行即可完成部署。

---

## 1. 准备代码与环境变量

```bash
# 若从 GitHub 拉取
git clone https://github.com/rootshuiyu/XXXXXAixL.git
cd XXXXXAixL

# 复制环境变量并编辑
cp .env.production.example .env.production
nano .env.production   # 或 vi / 其他编辑器
```

**必须填写的变量**（乙方提供或与乙方约定）：

- `DB_PASSWORD`、`DB_USER`、`DB_NAME`（数据库）
- `LICENSE_KEY`、`LICENSE_SERVER`（乙方提供）
- `JWT_SECRET`、`ADMIN_TOKEN`（随机强密码）
- `NEXT_PUBLIC_API_URL`、`NEXT_PUBLIC_WS_URL`（对外访问的 API/WS 地址，如 `https://yourdomain.com/api`、`wss://yourdomain.com`）

建议：`LICENSE_FORCE_STOP=true`（授权失败时后端停服）。

---

## 2. 一键部署（推荐）

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

脚本会依次：检查环境变量 → 停止旧容器 → 构建镜像 → 启动服务 → 执行数据库迁移 → 健康检查。

---

## 3. 分步执行（可选）

若需分步操作：

```bash
# 停止旧容器
docker compose down --remove-orphans

# 构建镜像
docker compose build --no-cache

# 启动服务
docker compose up -d

# 数据库迁移
docker compose run --rm backend npx prisma migrate deploy

# 健康检查
curl http://localhost:3001/health
```

---

## 4. SSL / 域名

- 将证书放到 `nginx/ssl/`（如 `fullchain.pem`、`privkey.pem`）。
- 修改 `nginx/nginx.conf` 中 `server_name` 为实际域名。
- 重启 Nginx 容器：`docker compose restart nginx`。

---

## 5. 验证

- 前端：`http://服务器IP或域名`（或 80/443 映射的地址）
- 后端健康：`curl http://localhost:3001/health`
- 管理后台：`http://服务器IP或域名:3002`（或 Nginx 配置的 admin 子域名）

---

## 当前本机无 Docker 时

本机未安装 Docker 时无法执行上述命令。请：

1. 在**甲方服务器**（或任意已安装 Docker 的 Linux 机器）上克隆仓库、配置 `.env.production` 后执行 `./scripts/deploy.sh`；或  
2. 在本机安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/) 后再执行上述步骤。

**本地开发**：本机已启动 `npm run dev:all`，可直接访问 http://localhost:3000（前端）、http://localhost:3001（后端）、http://localhost:3002（管理后台）。
