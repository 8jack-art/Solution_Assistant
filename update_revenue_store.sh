#!/bin/bash

# 检查备份文件是否存在
if [ ! -f "revenueCostStore.ts.bak" ]; then
    echo "错误: 备份文件不存在"
    exit 1
fi

# 创建临时文件
tmp_file="revenueCostStore_updated.ts"
cp revenueCostStore.ts.tmp "$tmp_file"

# 在文件开头添加防重复函数
# 在import语句后添加
sed -i '/import { devtools } from "zustand\/middleware"/a\
\
// ===== 防重复机制相关函数 =====\
/**\
 * 检查收入项是否重复\
 * @param existingItems 现有收入项列表\
 * @param newItem 要检查的新收入项\
 * @returns 如果存在重复项则返回重复项，否则返回null\
 */\
const checkDuplicateRevenueItem = (existingItems, newItem) => {\
  // 生成唯一标识符用于重复检测\
  const generateUniqueKey = (item) => {\
    const keyComponents = [\
      item.name?.trim().toLowerCase() || "",\
      item.category || "",\
      item.fieldTemplate || "",\
      // 对于数量×单价模板，结合数量和单价作为标识\
      (item.fieldTemplate === "quantity-price" || item.fieldTemplate === "area-yield-price")\
        ? `${item.quantity || 0}-${item.unitPrice || 0}`\
        : "",\
      // 对于产能×利用率×单价模板，结合产能、利用率和单价\
      item.fieldTemplate === "capacity-utilization"\
        ? `${item.capacity || 0}-${item.utilizationRate || 0}-${item.unitPrice || 0}`\
        : "",\
      // 对于订阅×单价模板，结合订阅数和单价\
      item.fieldTemplate === "subscription"\
        ? `${item.subscriptions || 0}-${item.unitPrice || 0}`\
        : "",\
      // 对于直接金额，使用金额值\
      item.fieldTemplate === "direct-amount"\
        ? `${item.directAmount || 0}`\
        : ""\
    ];\
    \
    return keyComponents.filter(Boolean).join("|");\
  };\
  \
  // 检查是否存在重复项\
  const newItemKey = generateUniqueKey(newItem);\
  const existingItem = existingItems.find(item => {\
    const existingKey = generateUniqueKey(item);\
    return existingKey === newItemKey;\
  });\
  \
  return existingItem || null;\
};\
' "$tmp_file"

# 修改addRevenueItem函数
sed -i '/addRevenueItem: (item) => {/,/set({ revenueItems: \[...state.revenueItems, newItem\] })/c\
      addRevenueItem: (item) => {\
        const state = get()\
        \
        // 检查是否存在重复项\
        const existingDuplicate = checkDuplicateRevenueItem(state.revenueItems, item);\
        \
        if (existingDuplicate) {\
          console.warn("⚠️ 检测到重复收入项:", {\
            现有项: {\
              id: existingDuplicate.id,\
              name: existingDuplicate.name,\
              category: existingDuplicate.category,\
              template: existingDuplicate.fieldTemplate\
            },\
            新增项: {\
              name: item.name,\
              category: item.category,\
              template: item.fieldTemplate\
            }\
          });\
          \
          // 不添加重复项，返回现有项ID\
          return existingDuplicate.id;\
        }\
        \
        // 不存在重复项，创建新项\
        const newItem: RevenueItem = {\
          id: `revenue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,\
          index: state.revenueItems.length + 1,\
          name: item.name || "新收入项",\
          category: item.category || "other",\
          fieldTemplate: item.fieldTemplate || "quantity-price",\
          vatRate: item.vatRate || 0.13,\
          ...item\
        }\
        set({ revenueItems: [...state.revenueItems, newItem] })\
      },' "$tmp_file"

# 修改updateRevenueItem函数
sed -i '/updateRevenueItem: (id, updates) => {/,/})/c\
      updateRevenueItem: (id, updates) => {\
        const state = get()\
        \
        // 找到要更新的项\
        const itemToUpdate = state.revenueItems.find(item => item.id === id);\
        if (!itemToUpdate) {\
          return null;\
        }\
        \
        // 合并现有数据和新数据\
        const updatedItem = { ...itemToUpdate, ...updates };\
        \
        // 创建排除当前项的其他项列表\
        const otherItems = state.revenueItems.filter(item => item.id !== id);\
        \
        // 检查更新后是否与其他项重复\
        const existingDuplicate = checkDuplicateRevenueItem(otherItems, updatedItem);\
        \
        if (existingDuplicate) {\
          console.warn("⚠️ 更新会导致重复收入项:", {\
            现有重复项: {\
              id: existingDuplicate.id,\
              name: existingDuplicate.name,\
              category: existingDuplicate.category,\
              template: existingDuplicate.fieldTemplate\
            },\
            更新项: {\
              id: updatedItem.id,\
              name: updatedItem.name,\
              category: updatedItem.category,\
              template: updatedItem.fieldTemplate\
            }\
          });\
          \
          // 不执行更新，返回null表示失败\
          return null;\
        }\
        \
        // 执行更新\
        set({\
          revenueItems: state.revenueItems.map(item =>\
            item.id === id ? updatedItem : item\
          )\
        })\
        \
        return updatedItem;\
      },' "$tmp_file"

# 使用sudo权限将修改后的文件复制到原位置
echo "正在更新文件..."
sudo cp "$tmp_file" revenueCostStore.ts

# 检查操作是否成功
if [ $? -eq 0 ]; then
    echo "文件更新成功!"
    # 删除临时文件
    rm "$tmp_file"
else
    echo "错误: 无法更新文件，请检查sudo权限"
    exit 1
fi

echo "操作完成!"
