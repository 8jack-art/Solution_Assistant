# 控制台Debug日志清理计划

## 任务概述
清理项目中所有控制台调试日志输出，使生产环境控制台输出最小化。

## 执行策略（根据用户确认）
- ✅ 删除所有 `console.log()` 
- ✅ 删除所有 `console.warn()` 
- ✅ 删除所有 `console.error()` 
- ✅ 删除所有包含emoji的日志（如 `🔹`, `✅`, `🔄`, `⚠️`, `❌` 等）
- ✅ 只保留**服务器启动成功的核心提示**（`✅ 服务器启动成功`）

## 保留的日志

仅保留服务器启动成功的核心提示：

```typescript
// server/src/server.ts - 保留以下行
console.log(`✅ 服务器启动成功`)
```

## 删除的日志

所有其他控制台日志输出：
- 所有 `console.log()` 
- 所有 `console.warn()` 
- 所有 `console.error()` 
- 包含emoji的调试日志（即使是✅标记的）
- 所有性能监控和调试日志

## 执行步骤

### 步骤1：创建备份
```bash
# 创建完整备份
cp -r /mnt/new_disk/Solution_Assistant /mnt/new_disk/Solution_Assistant_backup_$(date +%Y%m%d_%H%M%S)
```

### 步骤2：清理Server端（使用sed）
```bash
# 切换到项目目录
cd /mnt/new_disk/Solution_Assistant

# 使用Perl正则删除所有console语句（保留启动成功提示）
find server/src -name "*.ts" -o -name "*.js" | xargs perl -i -pe '
  s/^\s*console\.(log|warn|error)\([^)]*\);\s*$//g;
  s/^\s*console\.(log|warn|error)\([^)]*\);//g;
'

# 恢复关键启动日志
sed -i '/✅ 服务器启动成功/d' server/src/server.ts
echo '    console.log(`✅ 服务器启动成功`)' >> server/src/server.ts
```

### 步骤3：清理Client端
```bash
# 清理client端
find client/src -name "*.ts" -o -name "*.tsx" -o -name "*.js" | xargs perl -i -pe '
  s/^\s*console\.(log|warn|error)\([^)]*\);\s*$//g;
  s/^\s*console\.(log|warn|error)\([^)]*\);//g;
'
```

### 步骤4：清理空行
```bash
# 删除多余的空行
find server/src client/src -name "*.ts" -o -name "*.tsx" -o -name "*.js" | xargs perl -i -pe 's/\n{3,}/\n\n/g'
```

### 步骤5：验证结果
```bash
# 检查是否还有console语句（除启动日志外）
grep -r "console\.(log|warn|error)" server/src/ client/src/ --include="*.ts" --include="*.tsx" --include="*.js" | grep -v "✅ 服务器启动成功"
```

### 步骤6：测试运行
```bash
# 重启服务器测试
cd server && npm run dev

# 测试前端
cd client && npm run dev
```

## 需要处理的Server端文件列表（18个文件）

| 文件 | 处理 |
|------|------|
| server/src/controllers/authController.ts | 删除所有console |
| server/src/controllers/debugController.ts | 删除所有console |
| server/src/controllers/investmentController.ts | 删除所有console |
| server/src/controllers/llmController.ts | 删除所有console |
| server/src/controllers/projectController.ts | 删除所有console |
| server/src/controllers/reportController.ts | 删除所有console |
| server/src/controllers/revenueCostController.ts | 删除所有console |
| server/src/lib/llm.ts | 删除所有console |
| server/src/models/InvestmentEstimate.ts | 删除所有console |
| server/src/models/InvestmentProject.ts | 删除所有console |
| server/src/models/LLMConfig.ts | 删除所有console |
| server/src/models/User.ts | 删除所有console |
| server/src/services/llm.ts | 删除所有console |
| server/src/services/miniAgentApi.ts | 删除所有console |
| server/src/services/reportService.ts | 删除所有console |
| server/src/services/sseManager.ts | 删除所有console |
| server/src/services/zhipuService.ts | 删除所有console |
| server/src/services/zhipuServiceFixed.ts | 删除所有console |
| server/src/db/config.ts | 删除所有console |
| server/src/db/init.ts | 删除所有console |
| server/src/scripts/*.ts | 删除所有console |
| server/src/scripts/*.js | 删除所有console |
| server/src/utils/jwt.ts | 删除所有console |
| **server/src/server.ts** | **保留启动成功日志** |

## 需要处理的Client端文件列表（约30个文件）

| 文件 | 处理 |
|------|------|
| client/src/pages/InvestmentSummary.tsx | 删除所有console |
| client/src/pages/LLMConfigsDebug.tsx | 删除所有console |
| client/src/pages/LLMConfigsManagement.tsx | 删除所有console |
| client/src/pages/ProjectForm.tsx | 删除所有console |
| client/src/pages/ReportGeneration.tsx | 删除所有console |
| client/src/pages/RevenueCostModeling.tsx | 删除所有console |
| client/src/hooks/useDataLoader.ts | 删除所有console |
| client/src/hooks/useProjectOverviewData.ts | 删除所有console |
| client/src/hooks/useTypewriter.ts | 删除所有console |
| client/src/stores/reportStore.ts | 删除所有console |
| client/src/stores/revenueCostStore.ts | 删除所有console |
| client/src/lib/api.ts | 删除所有console |
| client/src/lib/zhipuService.ts | 删除所有console |
| client/src/src/controllers/*.ts | 删除所有console |
| client/src/src/lib/llm.ts | 删除所有console |
| client/src/src/models/*.ts | 删除所有console |
| client/src/src/services/*.ts | 删除所有console |
| client/src/src/db/*.ts | 删除所有console |
| client/src/src/scripts/*.ts | 删除所有console |
| client/src/src/scripts/*.js | 删除所有console |
| client/src/src/server.ts | 删除所有console |
| client/src/src/utils/jwt.ts | 删除所有console |
| client/src/utils/tableResourceBuilder.ts | 删除所有console |
| client/src/services/reportApi.ts | 删除所有console |

## 回滚方案
```bash
# 如需回滚，从备份恢复
rm -rf /mnt/new_disk/Solution_Assistant
cp -r /mnt/new_disk/Solution_Assistant_backup_YYYYMMDD_HHMMSS /mnt/new_disk/Solution_Assistant
```

## 验收标准
1. ✅ 所有 `console.log()`、`console.warn()`、`console.error()` 已被删除
2. ✅ 所有包含emoji的调试日志已被删除
3. ✅ 只保留 `console.log(`✅ 服务器启动成功`)` 
4. ✅ 服务器能够正常启动
5. ✅ 前端页面能够正常加载
6. ✅ 所有业务功能正常运行
