#!/bin/bash
# 社区宠物寄养匹配与代养评价平台 - 一键启动脚本
# 后端端口: 9202, 前端端口: 9201

cd "$(dirname "$0")"

echo "=========================================="
echo "  🐾 社区宠物寄养互助平台启动脚本"
echo "  后端端口: 9202 | 前端端口: 9201"
echo "=========================================="

echo ""
echo "[1/2] 启动后端服务 (Django :9202)..."
cd backend && chmod +x start.sh && bash start.sh &
BACKEND_PID=$!
cd ..

sleep 3

echo ""
echo "[2/2] 启动前端服务 (React :9201)..."
cd frontend && chmod +x start.sh && bash start.sh &
FRONTEND_PID=$!
cd ..

echo ""
echo "=========================================="
echo "  ✅ 服务启动中..."
echo "  前端: http://localhost:9201"
echo "  后端: http://localhost:9202"
echo "  API:  http://localhost:9202/api/"
echo ""
echo "  默认测试账号:"
echo "    用户名: zhang_san (宠物主人)"
echo "    密码: 123456"
echo ""
echo "  按 Ctrl+C 停止所有服务"
echo "=========================================="

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
