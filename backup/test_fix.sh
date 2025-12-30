#!/bin/bash

echo "🧪 测试修复后的收入项功能..."

# 登录获取token
echo "📝 正在登录..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "123456"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ 无法获取token，登录失败"
  exit 1
fi

echo "✅ 登录成功"

PROJECT_ID="8b81a17b-8661-4d4f-a672-b969ee2fece5"

# 1. 检查当前收入项数据
echo "🔍 检查当前收入项数据..."
CURRENT_DATA=$(curl -s -X GET http://localhost:3001/api/revenue-cost/project/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN")

echo "📊 当前数据状态:"
echo $CURRENT_DATA | grep -o '"revenueItems":\[[^]]*\]' || echo "  无收入项数据"

# 2. 保存一个测试收入项
echo "💾 保存测试收入项..."
SAVE_RESPONSE=$(curl -s -X POST http://localhost:3001/api/revenue-cost/save \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "project_id": "'$PROJECT_ID'",
    "workflow_step": "revenue",
    "model_data": {
      "revenueItems": [
        {
          "id": "test-fix-item",
          "index": 1,
          "name": "修复测试收入项",
          "category": "product",
          "fieldTemplate": "quantity-price",
          "quantity": 100,
          "unit": "吨",
          "unitPrice": 8000,
          "priceUnit": "wan-yuan",
          "vatRate": 0.13
        }
      ],
      "costItems": [],
      "productionRates": [],
      "aiAnalysisResult": null,
      "workflow_step": "revenue"
    }
  }')

echo "保存响应: $SAVE_RESPONSE"

# 3. 再次检查数据是否正确保存
echo "🔍 验证保存结果..."
VERIFY_RESPONSE=$(curl -s -X GET http://localhost:3001/api/revenue-cost/project/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN")

echo "📊 保存后的数据:"
if command -v jq &> /dev/null; then
  echo $VERIFY_RESPONSE | jq '.data.estimate.model_data.revenueItems[] | {name, unitPrice, priceUnit}'
else
  echo $VERIFY_RESPONSE | grep -o '"revenueItems":\[[^]]*\]'
fi

echo "✅ 测试完成"