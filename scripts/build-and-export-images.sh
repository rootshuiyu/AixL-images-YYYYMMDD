#!/bin/bash
# ============================================
# 乙方：在己方环境构建镜像并导出，交付给甲方（甲方不拿源码）
# 在项目根目录执行：./scripts/build-and-export-images.sh
# 需要先配置 .env.production（构建时前端/管理台需要 NEXT_PUBLIC_* 等）
# ============================================

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

RELEASE_NAME="AixL-images-$(date +%Y%m%d)"
OUT_DIR="$ROOT_DIR/$RELEASE_NAME"
IMAGES_DIR="$OUT_DIR/images"

echo "📦 乙方：构建并导出镜像（甲方仅镜像部署用）"
echo "   项目根: $ROOT_DIR"
echo "   输出目录: $OUT_DIR"

if [ ! -f ".env.production" ]; then
    echo "❌ 请先复制 .env.production.example 为 .env.production 并填写（构建需要 NEXT_PUBLIC_* 等）"
    exit 1
fi

export $(grep -v '^#' .env.production | xargs)

echo ""
echo "1️⃣ 构建镜像..."
docker-compose build --no-cache

echo ""
echo "2️⃣ 导出镜像到 $IMAGES_DIR ..."
mkdir -p "$IMAGES_DIR"
docker save aixl/backend:latest -o "$IMAGES_DIR/backend.tar"
docker save aixl/frontend:latest -o "$IMAGES_DIR/frontend.tar"
docker save aixl/admin:latest -o "$IMAGES_DIR/admin.tar"

echo ""
echo "3️⃣ 复制甲方所需文件（无源码）..."
cp docker-compose.images.yml "$OUT_DIR/"
cp .env.production.example "$OUT_DIR/"
mkdir -p "$OUT_DIR/nginx/ssl"
cp nginx/nginx.conf "$OUT_DIR/nginx/"
touch "$OUT_DIR/nginx/ssl/.gitkeep"
cp scripts/deploy-from-images.sh "$OUT_DIR/"
cp scripts/update-from-images.sh "$OUT_DIR/"
chmod +x "$OUT_DIR/deploy-from-images.sh" "$OUT_DIR/update-from-images.sh"
cp DEPLOY_甲方仅镜像.md "$OUT_DIR/"

echo ""
echo "4️⃣ 打压缩包..."
zip -r "${RELEASE_NAME}.zip" "$RELEASE_NAME"
rm -rf "$OUT_DIR"

echo ""
echo "✅ 已生成: $ROOT_DIR/${RELEASE_NAME}.zip"
echo "   交付给甲方：解压后按其中 DEPLOY_甲方仅镜像.md 执行 deploy-from-images.sh，甲方不接触源码。"
