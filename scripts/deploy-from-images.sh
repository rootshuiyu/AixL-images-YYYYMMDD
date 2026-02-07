#!/bin/bash
# ============================================
# 甲方：仅镜像部署（无源码）
# 在乙方提供的解压目录内执行，该目录含 images/*.tar、docker-compose.images.yml、.env.production
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🚀 AixL 仅镜像部署（甲方）"
echo "================================"

if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ .env.production 不存在${NC}"
    echo "请复制 .env.production.example 为 .env.production 并填写（LICENSE_KEY、LICENSE_SERVER 等由乙方提供）"
    exit 1
fi

if [ ! -f "docker-compose.images.yml" ]; then
    echo -e "${RED}❌ docker-compose.images.yml 不存在，请在乙方提供的解压目录内执行本脚本${NC}"
    exit 1
fi

export $(grep -v '^#' .env.production | xargs)
export COMPOSE_FILE=docker-compose.images.yml

echo ""
echo -e "${YELLOW}1️⃣ 加载镜像...${NC}"
for f in images/backend.tar images/frontend.tar images/admin.tar; do
    if [ -f "$f" ]; then
        docker load -i "$f"
    else
        echo -e "${RED}❌ 缺少 $f${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✅ 镜像加载完成${NC}"

echo ""
echo -e "${YELLOW}2️⃣ 启动服务...${NC}"
docker-compose up -d
echo -e "${GREEN}✅ 服务已启动${NC}"

echo ""
echo -e "${YELLOW}3️⃣ 执行数据库迁移...${NC}"
sleep 8
docker-compose run --rm backend npx prisma migrate deploy
echo -e "${GREEN}✅ 迁移完成${NC}"

echo ""
echo -e "${YELLOW}4️⃣ 健康检查...${NC}"
sleep 5
if curl -s http://localhost:3001/health > /dev/null; then
    echo -e "${GREEN}✅ 后端正常${NC}"
else
    echo -e "${YELLOW}⚠️ 若刚启动请稍等后执行: curl http://localhost:3001/health${NC}"
fi

echo ""
echo "================================"
echo -e "${GREEN}🎉 部署完成${NC}"
echo "================================"
docker-compose ps
echo ""
echo "如需重启: docker-compose restart   (当前目录下，且 COMPOSE_FILE=docker-compose.images.yml)"
