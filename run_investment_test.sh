#!/bin/bash

# 投资估算简表数据加载Bug修复测试运行脚本

echo "=========================================="
echo "投资估算简表数据加载Bug修复测试"
echo "=========================================="

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js 未安装，请先安装Node.js"
    exit 1
fi

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 设置环境变量
export BASE_URL=${BASE_URL:-"http://localhost:3001"}
export TEST_PROJECT_ID=${TEST_PROJECT_ID:-"test-project-$(date +%s)"}

echo "🔧 配置信息:"
echo "   服务器地址: $BASE_URL"
echo "   测试项目ID: $TEST_PROJECT_ID"
echo ""

# 检查服务器是否运行
echo "🔍 检查服务器状态..."
if curl -s "$BASE_URL/api/health" > /dev/null 2>&1; then
    echo "✅ 服务器运行正常"
else
    echo "❌ 服务器不可用，请确保后端服务正在运行在 $BASE_URL"
    echo "   可以使用以下命令启动服务器:"
    echo "   cd server && npm start"
    exit 1
fi

echo ""
echo "🚀 开始运行测试..."
echo ""

# 运行测试
node test_investment_loading_fix.cjs

# 检查测试结果
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 测试完成！"
else
    echo ""
    echo "❌ 测试执行失败"
    exit 1
fi
