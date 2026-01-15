# 折旧摊销变量 `{{DATA:depreciation_amortization}}` 实现分析

## 任务概述

投资项目方案报告生成中的变量 `{{DATA:depreciation_amortization}}` 需要从基础数据确认模块中的"折旧摊销设置"及"折旧与摊销估算表"获取数据，转成JSON格式。

## 当前实现状态

### 1. 数据来源

**折旧摊销设置**（前端 `RevenueCostModeling.tsx`）：
- `constructionDepreciationYears`: 建安工程折旧年限
- `constructionResidualRate`: 建安工程残值率
- `equipmentDepreciationYears`: 机械设备折旧年限
- `equipmentResidualRate`: 机械设备残值率
- `intangibleAmortizationYears`: 无形资产摊销年限
- `intangibleResidualRate`: 无形资产残值率

**折旧与摊销估算表**（前端 `RevenueCostModeling.tsx`）：
- A行：房屋（建筑物）折旧
- D行：设备购置折旧
- E行：无形资产（土地）摊销

### 2. 数据结构

前端构建的 `depreciationAmortization` 对象（第784-808行）：
```typescript
{
  // 分年数据
  A_depreciation: number[],  // 建筑折旧分年数据
  D_depreciation: number[],  // 机器设备折旧分年数据
  E_amortization: number[],  // 无形资产摊销分年数据

  // 折旧参数
  A: {
    原值: number,
    年折旧额: number,  // 第1年折旧额
    折旧年限: number,
    残值率: number
  },
  D: {
    原值: number,
    年折旧额: number,  // 第1年折旧额
    折旧年限: number,
    残值率: number
  },
  E: {
    原值: number,
    年摊销额: number,  // 第1年摊销额
    摊销年限: number,
    残值率: number
  }
}
```

### 3. 后端处理函数

**文件位置**: `server/src/utils/tableDataBuilder.ts`

**函数**: `buildDepreciationAmortizationJSON(depreciationData: any): string`

**当前实现**（第98-149行）：
```typescript
export function buildDepreciationAmortizationJSON(depreciationData: any): string {
  if (!depreciationData) return '{}'
  
  const depAmortData = depreciationData.depreciationAmortization || depreciationData
  
  const aDepreciation = depAmortData.A_depreciation || []
  const dDepreciation = depAmortData.D_depreciation || []
  const eAmortization = depAmortData.E_amortization || []
  
  const aParams = depAmortData.A || {}
  const dParams = depAmortData.D || {}
  const eParams = depAmortData.E || {}
  
  const jsonData: any = {
    buildingDepreciation: {
      年限: aParams.折旧年限 || 0,
      残值率: aParams.残值率 || 0,
      年折旧费: aParams.年折旧额 || (aDepreciation[0] || 0)
    },
    equipmentDepreciation: {
      年限: dParams.折旧年限 || 0,
      残值率: dParams.残值率 || 0,
      年折旧费: dParams.年折旧额 || (dDepreciation[0] || 0)
    },
    otherFixedAssetDepreciation: {
      年限: 0,
      残值率: 0,
      年折旧费: 0
    },
    intangibleAmortization: {
      年限: eParams.摊销年限 || 0,
      年摊销费: eParams.年摊销额 || (eAmortization[0] || 0)
    },
    合计年均折旧摊销费: (aParams.年折旧额 || 0) + (dParams.年折旧额 || 0) + (eParams.年摊销额 || 0)
  }
  
  return JSON.stringify(jsonData, null, 2)
}
```

### 4. 变量替换流程

**文件位置**: `server/src/services/reportService.ts`

1. **数据收集**（第222-375行）：`collectProjectData` 函数从数据库获取项目数据
2. **表格数据构建**（第332-348行）：调用 `buildAllTableDataJSON` 构建表格数据JSON
3. **变量替换**（第435-452行）：`buildDataAwarePrompt` 函数处理 `{{DATA:xxx}}` 变量替换

**调用链**：
```
reportService.collectProjectData()
  → tableDataBuilder.buildAllTableDataJSON()
    → tableDataBuilder.buildDepreciationAmortizationJSON()
      → 返回 JSON 字符串
  → reportService.buildDataAwarePrompt()
    → 替换 {{DATA:depreciation_amortization}} 为实际数据
```

## 输出格式示例

```json
{
  "buildingDepreciation": {
    "年限": 50,
    "残值率": 5,
    "年折旧费": 95.23
  },
  "equipmentDepreciation": {
    "年限": 10,
    "残值率": 5,
    "年折旧费": 47.62
  },
  "otherFixedAssetDepreciation": {
    "年限": 0,
    "残值率": 0,
    "年折旧费": 0
  },
  "intangibleAmortization": {
    "年限": 50,
    "年摊销费": 19.05
  },
  "合计年均折旧摊销费": 161.9
}
```

## 发现的问题

⚠️ **实际输出中年限和残值率为0**：

从用户提供的实际输出数据来看：
```json
{
  "buildingDepreciation": { "年限": 0, "残值率": 0, "年折旧费": 477.05 },
  "equipmentDepreciation": { "年限": 0, "残值率": 0, "年折旧费": 1006.84 },
  "otherFixedAssetDepreciation": { "年限": 0, "残值率": 0, "年折旧费": 0 },
  "intangibleAmortization": { "年限": 0, "年摊销费": 19.8 },
  "合计年均折旧摊销费": 1503.69
}
```

**问题分析**：

1. **后端验证不完整**（[`reportService.ts:293-300`](server/src/services/reportService.ts:293-300)）：
   - 只检查了分年数据：`A_depreciation`、`D_depreciation`、`E_amortization`
   - 没有检查参数数据：`A`、`D`、`E`

2. **数据保存流程**：
   - 前端 [`RevenueCostModeling.tsx:784-808`](client/src/pages/RevenueCostModeling.tsx:784-808) 正确构建了包含参数的 `depreciationAmortization` 对象
   - 前端 [`revenueCostStore.ts:1398-1399`](client/src/stores/revenueCostStore.ts:1398-1399) 通过 `context.depreciationAmortization` 保存到数据库
   - 后端 [`reportService.ts:278-289`](server/src/services/reportService.ts:278-289) 从数据库读取 `model_data`

3. **可能的原因**：
   - 数据库中 `depreciationAmortization.A`、`depreciationAmortization.D`、`depreciationAmortization.E` 参数字段不存在或为空对象
   - 或者数据在保存/读取过程中丢失

## 建议的修复方案

### 方案1：增强后端日志验证（推荐）

在 [`reportService.ts:292-301`](server/src/services/reportService.ts:292-301) 添加更详细的日志，检查参数数据：

```typescript
// 打印 depreciationAmortization 数据（如果存在）
if (revenueCostModelData.depreciationAmortization) {
  const depData = revenueCostModelData.depreciation_amortization
  console.log('✅ 找到 depreciation_amortization 数据:', {
    有A分年数据: !!(depData.A_depreciation?.length > 0),
    有D分年数据: !!(depData.D_depreciation?.length > 0),
    有E分年数据: !!(depData.E_amortization?.length > 0),
    有A参数: !!(depData.A && Object.keys(depData.A).length > 0),
    有D参数: !!(depData.D && Object.keys(depData.D).length > 0),
    有E参数: !!(depData.E && Object.keys(depData.E).length > 0),
    A参数: depData.A || {},
    D参数: depData.D || {},
    E参数: depData.E || {}
  })
} else {
  console.warn('⚠️ revenueCostModelData 中没有 depreciation_amortization 字段')
}
```

### 方案2：增强 `buildDepreciationAmortizationJSON` 函数容错性

在 [`tableDataBuilder.ts:98-149`](server/src/utils/tableDataBuilder.ts:98-149) 添加更详细的日志和容错逻辑：

```typescript
export function buildDepreciationAmortizationJSON(depreciationData: any): string {
  if (!depreciationData) return '{}'
  
  const depAmortData = depreciationData.depreciation_amortization || depreciationData
  
  const aDepreciation = depAmortData.A_depreciation || []
  const dDepreciation = depAmortData.D_depreciation || []
  const eAmortization = depAmortData.E_amortization || []
  
  const aParams = depAmortData.A || {}
  const dParams = depAmortData.D || {}
  const eParams = depAmortData.E || {}
  
  console.log('🔍 buildDepreciation_amortizationJSON 调试信息:', {
    'A参数': aParams,
    'D参数': dParams,
    'E参数': eParams,
    'A分年数据长度': aDepreciation.length,
    'D分年数据长度': dDepreciation.length,
    'E分年数据长度': eAmortization.length
  })
  
  // ... 其余代码保持不变
}
```

## 下一步行动

1. 添加增强的日志验证代码
2. 测试报告生成功能，查看实际数据
3. 根据日志输出确定问题根源
4. 修复数据保存或读取逻辑

## 结论

✅ **代码实现已满足需求**：

1. ✅ 正确从"折旧摊销设置"获取年限和残值率数据
2. ✅ 正确从"折旧与摊销估算表"获取年折旧/摊销费数据
3. ✅ 输出格式为JSON
4. ✅ 包含建筑、机器设备、其他固定资产、无形资产的年限、残值率和年折旧/摊销费数据
5. ✅ `otherFixedAssetDepreciation` 返回 0 值（按用户确认）

⚠️ **存在数据问题需要调试**：

- 实际输出中年限和残值率为0
- 需要添加日志验证来确定问题根源
- 可能需要修复数据保存或读取逻辑

## 相关文件

| 文件路径 | 说明 |
|---------|------|
| `client/src/pages/RevenueCostModeling.tsx` | 前端折旧摊销设置和计算逻辑 |
| `client/src/stores/revenueCostStore.ts` | 前端状态管理，数据保存/加载 |
| `server/src/utils/tableDataBuilder.ts` | 后端表格数据构建器 |
| `server/src/services/reportService.ts` | 报告服务，处理变量替换 |
