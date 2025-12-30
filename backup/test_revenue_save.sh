#!/bin/bash

echo "🧪 测试收入项保存功能..."

# 首先登录获取token
echo "📝 正在登录..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "123456"
  }')

echo "登录响应: $LOGIN_RESPONSE"

# 提取token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ 无法获取token，登录失败"
  exit 1
fi

echo "✅ 登录成功，token: ${TOKEN:0:20}..."

# 测试保存收入项数据
echo "📤 正在保存收入项数据..."

SAVE_RESPONSE=$(curl -s -X POST http://localhost:3001/api/revenue-cost/save \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "project_id": "8b81a17b-8661-4d4f-a672-b969ee2fece5",
    "workflow_step": "revenue",
    "model_data": {
      "revenueItems": [
        {
          "id": "test-item-1",
          "index": 1,
          "name": "测试收入项-正确价格",
          "category": "product",
          "fieldTemplate": "quantity-price",
          "quantity": 100,
          "unit": "吨",
          "unitPrice": 5000,
          "priceUnit": "wan-yuan",
          "vatRate": 0.13
        },
        {
          "id": "test-item-2",
          "index": 2,
          "name": "测试收入项-元单位",
          "category": "service",
          "fieldTemplate": "quantity-price",
          "quantity": 200,
          "unit": "小时",
          "unitPrice": 100000,
          "priceUnit": "yuan",
          "vatRate": 0.06
        }
      ],
      "costItems": [],
      "productionRates": [],
      "aiAnalysisResult": null,
      "workflow_step": "revenue"
    }
  }')

echo "💾 保存响应: $SAVE_RESPONSE"

# 验证数据是否正确保存
echo "🔍 正在验证保存的数据..."

VERIFY_RESPONSE=$(curl -s -X GET http://localhost:3001/api/revenue-cost/project/8b81a17b-8661-4d4f-a672-b969ee2fece5 \
  -H "Authorization: Bearer $TOKEN")

echo "📥 验证响应: $VERIFY_RESPONSE"

# 检查价格数据
echo "📊 检查价格数据..."

# 使用jq解析JSON（如果可用）
if command -v jq &> /dev/null; then
  echo "使用jq解析JSON..."
  echo $VERIFY_RESPONSE | jq '.data.estimate.model_data.revenueItems[] | {name, unitPrice, priceUnit}'
else
  echo "jq不可用，显示原始响应..."
  echo $VERIFY_RESPONSE
fi