#!/bin/bash

# 脚本用于更新revenueCostStore.ts文件，添加重复检测功能

# 1. 检查备份文件是否存在
if [ ! -f "/opt/Solution_Assistant/client/src/stores/revenueCostStore.ts.bak" ]; then
    echo "错误: 备份文件不存在，请先创建备份文件"
    exit 1
fi

# 2. 检查更新文件是否存在
if [ ! -f "/opt/Solution_Assistant/revenueCostStore_update.ts" ]; then
    echo "错误: 更新文件不存在"
    exit 1
fi

# 3. 读取原始文件
ORIGINAL_FILE="/opt/Solution_Assistant/client/src/stores/revenueCostStore.ts.bak"
UPDATE_FILE="/opt/Solution_Assistant/revenueCostStore_update.ts"
TARGET_FILE="/opt/Solution_Assistant/client/src/stores/revenueCostStore.ts"

# 4. 创建临时文件
temp_file="/tmp/revenueCostStore_temp.ts"

# 5. 读取更新文件内容
update_content=$(cat "$UPDATE_FILE")

# 6. 读取原始文件并修改
# 在文件开头添加导入语句
sed '1i\n// 防重复机制相关函数\nimport { RevenueItem } from "./revenueCostStore";
' "$ORIGINAL_FILE" > "$temp_file"

# 7. 在RevenueItem类型定义后添加防重复函数
sed -i '/^export interface RevenueItem {/,/^}$/a\

// ===== 防重复机制相关函数 =====\
\'"$update_content"\
' "$temp_file"

# 8. 修改addRevenueItem函数
sed -i '/addRevenueItem: (item) => {/,/set({ revenueItems: \[...state.revenueItems, newItem\] })/c\
      addRevenueItem: (item) => {\
        return addRevenueItemWithDuplicateCheck(state, set, item);\
      },' "$temp_file"

# 9. 修改updateRevenueItem函数
sed -i '/updateRevenueItem: (id, updates) => {/,/})/c\
      updateRevenueItem: (id, updates) => {\
        return updateRevenueItemWithDuplicateCheck(state, set, id, updates);\
      },' "$temp_file"

# 10. 使用sudo将临时文件复制到目标文件
echo "正在使用sudo权限更新目标文件..."
sudo cp "$temp_file" "$TARGET_FILE"

# 11. 检查操作是否成功
if [ $? -eq 0 ]; then
    echo "文件更新成功!"
    # 删除临时文件
    rm "$temp_file"
else
    echo "错误: 无法更新文件，请检查sudo权限"
    exit 1
fi

echo "操作完成!"
