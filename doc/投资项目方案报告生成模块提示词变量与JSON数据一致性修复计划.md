# 投资项目方案报告生成模块提示词变量与JSON数据一致性修复计划

## 问题描述

**使用JSON小眼睛看到总投资是1000万元，但是LLM输出的总投资却是1100万元。**

即：提示词里引用的变量与点击小眼睛出现的json数据不一致。

## 问题根源分析

### 数据流程对比

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         小眼睛查看的数据流程                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. 用户点击小眼睛                                                            │
│  2. handleViewJson(variableKey, title)                                       │
│  3. 从 availableVariables 中查找 variable.value                              │
│  4. availableVariables 来源于 loadProjectData                                │
│  5. loadProjectData 调用 API getProjectSummary                               │
│  6. API 返回的数据结构：{ data: { project, investment, tableDataJSON } }     │
│  7. 变量值取自：projectData.project.totalInvestment (API缓存)                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         LLM生成报告的数据流程                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. 用户点击生成报告                                                          │
│  2. startGeneration()                                                        │
│  3. 调用 reportApi.generateReport(reportId, promptTemplate, tableDataJSON)   │
│  4. 后端 generateReportStream(reportId, llmConfig, promptTemplate, project)  │
│  5. 调用 collectProjectData(project.id) ← 从数据库实时查询                   │
│  6. 构建 projectData.project.totalInvestment (数据库实时值)                   │
│  7. buildDataAwarePrompt 使用 collectProjectData 的数据替换变量               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 核心问题

| 数据项 | 小眼睛来源 | LLM生成来源 | 可能差异原因 |
|--------|-----------|------------|-------------|
| `{{total_investment}}` | API返回的 `project.totalInvestment` | 数据库实时查询的 `project.total_investment` | 数据库值被修改，但API缓存未更新 |
| `{{roi}}` | API返回的 `financialIndicators.roi` | `extractFinancialIndicators()` 计算值 | 计算逻辑不一致 |
| `{{irr}}` | API返回的 `financialIndicators.irr` | `extractFinancialIndicators()` 计算值 | 计算逻辑不一致 |
| `{{npv}}` | API返回的 `financialIndicators.npv` | `extractFinancialIndicators()` 计算值 | 计算逻辑不一致 |

### 问题代码位置

**前端** `client/src/stores/reportStore.ts`:
- 第514-525行：`availableVariables` 构建时使用 `projectData.project?.totalInvestment`
- 第602-651行：`startGeneration` 调用API生成报告

**后端** `server/src/services/reportService.ts`:
- 第222-388行：`collectProjectData` 实时从数据库查询
- 第406-624行：`buildDataAwarePrompt` 使用实时数据替换变量

## 修复方案

### 方案：统一使用前端数据源（推荐）

**核心思路**：LLM生成时使用前端传入的 `tableDataJSON` 和 `projectData`，而不是后端实时查询的数据。

#### 修改后端 `generateReportStream` 函数

```typescript
// 修改前：实时查询数据库
const projectData = await this.collectProjectData(project.id)

// 修改后：优先使用前端传入的数据
let projectData = project // 前端传入的project对象
if (tableDataJSON && Object.keys(tableDataJSON).length > 0) {
  // 如果前端传入了完整数据，使用前端数据
  console.log('使用前端传入的完整数据进行报告生成')
} else {
  // 如果前端没有传入数据，实时查询数据库（向后兼容）
  projectData = await this.collectProjectData(project.id)
}
```

#### 修改 `buildDataAwarePrompt` 函数

确保 `{{DATA:xxx}}` 变量和单个变量（如 `{{total_investment}}`）使用相同的数据源：

```typescript
// 确保 project 对象包含所有需要的字段
const projectForPrompt = {
  id: project?.id || projectData?.project?.id,
  name: project?.name || projectData?.project?.name,
  totalInvestment: project?.totalInvestment ?? projectData?.project?.totalInvestment ?? projectData?.project?.total_investment,
  // ... 其他字段
}
```

## 实施步骤

### 步骤1：修改后端 `reportService.ts`

1. 修改 `generateReportStream` 函数，优先使用前端数据
2. 修改 `buildDataAwarePrompt` 函数，统一数据源

### 步骤2：修改前端 `reportStore.ts`

1. 确保 `startGeneration` 传递完整的 `projectData`
2. 添加数据来源日志，便于问题排查

### 步骤3：添加调试日志

1. 在小眼睛显示时输出数据来源
2. 在报告生成时输出数据来源
3. 添加一致性检查日志

### 步骤4：测试验证

1. 验证总投资金额一致性
2. 验证财务指标（ROI、IRR、NPV）一致性
3. 验证所有表格数据变量的一致性

## 涉及文件修改

| 文件 | 修改内容 |
|------|----------|
| `server/src/services/reportService.ts` | 修改 `generateReportStream` 和 `buildDataAwarePrompt` |
| `client/src/stores/reportStore.ts` | 确保传递完整数据，添加日志 |

## 验证方法

1. **总投资金额测试**：
   - 设置总投资为1000万元
   - 点击小眼睛确认显示1000万元
   - 生成报告，检查报告中的总投资是否为1000万元

2. **财务指标测试**：
   - 修改收入成本数据
   - 点击小眼睛确认财务指标
   - 生成报告，检查财务指标是否一致

3. **表格数据测试**：
   - 点击表格变量的小眼睛
   - 生成报告
   - 对比报告中引用的表格数据与小眼睛显示

## 预期效果

1. 小眼睛显示的数据与LLM生成报告使用的数据完全一致
2. 不再出现"小眼睛显示1000万，LLM输出1100万"的问题
3. 数据来源清晰可追溯
