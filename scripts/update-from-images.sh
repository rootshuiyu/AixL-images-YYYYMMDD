#!/bin/bash
# ============================================
# 甲方：热更新（仅镜像部署时用）
# 乙方发新版本后，用新 zip 里的 images/*.tar 覆盖当前目录的 images/，再执行本脚本
# 在解压后的部署目录内执行，与 deploy-from-images.sh 同目录
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔄 AixL 热更新（仅镜像）"
echo "================================"

if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ .env.production 不存在${NC}"
    exit 1
fi

if [ ! -f "docker-compose.images.yml" ]; then
    echo -e "${RED}❌ docker-compose.images.yml 不存在${NC}"
    exit 1
fi

export $(grep -v '^#' .env.production | xargs)
export COMPOSE_FILE=docker-compose.images.yml

echo ""
echo -e "${YELLOW}1️⃣ 加载新镜像...${NC}"
for f in images/backend.tar images/frontend.tar images/admin.tar; do
    if [ -f "$f" ]; then
        docker load -i "$f"
    else
        echo -e "${RED}❌ 缺少 $f，请用乙方新包里的 images/ 覆盖后再执行${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✅ 镜像加载完成${NC}"

echo ""
echo -e "${YELLOW}2️⃣ 重启服务（会短暂中断）...${NC}"
docker-compose up -d --force-recreate
echo -e "${GREEN}✅ 服务已重启${NC}"

echo ""
echo -e "${YELLOW}3️⃣ 执行数据库迁移（若有表结构变更）...${NC}"
sleep 6
docker-compose run --rm backend npx prisma migrate deploy
echo -e "${GREEN}✅ 迁移完成${NC}"

echo ""
echo -e "${GREEN}🎉 热更新完成${NC}"
docker-compose ps
