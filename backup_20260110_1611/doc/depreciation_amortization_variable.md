# 折旧摊销变量 `{{DATA:depreciation_amortization}}` 实现文档

## 任务概述

投资项目方案报告生成中的变量 `{{DATA:depreciation_amortization}}` 从基础数据确认模块中的"折旧摊销设置"及"折旧与摊销估算表"获取数据，转成JSON格式。

## 数据来源

**折旧摊销设置**（前端 `RevenueCostModeling.tsx`）：
- `constructionDepreciationYears`: 建安工程折旧年限
- `constructionResidualRate`: 建安工程残值率
- `equipmentDepreciationYears`: 机械设备折旧年限
- `equipmentResidualRate`: 机械设备残值率
- `intangibleAmortizationYears`: 无形资产摊销年限

**折旧与摊销估算表**（前端 `RevenueCostModeling.tsx`）：
- A行：房屋（建筑物）折旧
- D行：设备购置折旧
- E行：无形资产（土地）摊销

## 输出格式

```json
{
  "建筑折旧": {
    "年限": 50,
    "残值率": 5,
    "年均折旧费": 95.23
  },
  "机器设备折旧": {
    "年限": 10,
    "残值率": 5,
    "年均折旧费": 47.62
  },
  "无形资产摊销": {
    "年限": 50,
    "年摊销费": 19.05
  },
  "年均折旧费合计": 161.9
}
```

## 字段说明

| 字段 | 类型 | 说明 |
|-----|------|------|
| 建筑折旧.年限 | integer | 建筑折旧年限（年） |
| 建筑折旧.残值率 | number | 建筑残值率（%，如 5 表示 5%） |
| 建筑折旧.年均折旧费 | number | 建筑年均折旧费（万元） |
| 机器设备折旧.年限 | integer | 机器设备折旧年限（年） |
| 机器设备折旧.残值率 | number | 机器设备残值率（%，如 5 表示 5%） |
| 机器设备折旧.年均折旧费 | number | 机器设备年均折旧费（万元） |
| 无形资产摊销.年限 | integer | 无形资产摊销年限（年） |
| 无形资产摊销.年摊销费 | number | 无形资产年摊销费（万元） |
| 年均折旧费合计 | number | 合计年均折旧摊销费（万元） |

## 实现位置

**文件位置**: `server/src/utils/tableDataBuilder.ts`

**函数**: `buildDepreciationAmortizationJSON(depreciationData: any): string`

## 相关文件

| 文件路径 | 说明 |
|---------|------|
| `client/src/pages/RevenueCostModeling.tsx` | 前端折旧摊销设置和计算逻辑 |
| `client/src/stores/revenueCostStore.ts` | 前端状态管理，数据保存/加载 |
| `server/src/utils/tableDataBuilder.ts` | 后端表格数据构建器 |
| `server/src/services/reportService.ts` | 报告服务，处理变量替换 |
