#!/bin/bash

echo "=== 投资估算简表数据加载Bug修复验证 ==="
echo "请确保服务器正在运行在 http://localhost:3001"
echo ""

# 检查Node.js是否可用
if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js 未安装或不在PATH中"
    exit 1
fi

# 检查npm是否可用
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: npm 未安装或不在PATH中"
    exit 1
fi

# 检查axios是否可用
if ! node -e "require('axios')" 2>/dev/null; then
    echo "📦 安装axios依赖..."
    npm install axios
fi

# 运行测试
echo "🚀 开始运行测试..."
node test_investment_loading_fix.cjs

echo ""
echo "=== 测试完成 ==="
echo "如果测试通过，说明修复效果良好。"
echo "如果测试失败，请检查服务器日志以获取更多信息。"
