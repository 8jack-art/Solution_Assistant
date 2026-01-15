# 投资估算简表JSON三级子项数据添加计划

## 问题描述

投资项目方案报告生成模块中，可用变量card中的投资估算简表变量（`{{DATA:investment_estimate}}`）的JSON数据没有包含三级子项的数据。

当前JSON输出只包含：
- 二级子项（partA.children，如"一/二/三"代表主体/辅助/其它工程）

缺少：
- 三级子项（二级子项下的具体工程，如"1/2/3/4"对应的肉牛养殖舍建设、蚯蚓养殖大棚建设等）

## 目标

修改 `buildInvestmentEstimateJSON` 函数，使其在输出JSON数据时包含partA部分二级子项中的三级子项数据。

## 数据结构分析

### 当前三级子项存储位置
```
estimateData.thirdLevelItems 或 estimateData.partA.thirdLevelItems
```

### 三级子项数据结构（根据llm.ts定义）
```typescript
interface ThirdLevelItem {
  name: string           // 三级子项名称
  quantity: number       // 工程量（数值）
  unit: string           // 单位
  unit_price: number     // 单价（元）
  construction_ratio: number  // 建设工程费占比
  equipment_ratio: number     // 设备购置费占比
  installation_ratio: number  // 安装工程费占比
  other_ratio: number         // 其它费用占比
}
```

### 三级子项数据存储格式
```typescript
// Record<number, any[]> - key是二级子项的索引（0, 1, 2...）
thirdLevelItems: {
  0: [/* 二级子项"一"下的三级子项数组 */],
  1: [/* 二级子项"二"下的三级子项数组 */],
  2: [/* 二级子项"三"下的三级子项数组 */]
}
```

## 需要修改的文件

1. **服务端**：`server/src/utils/tableDataBuilder.ts`
   - 函数：`buildInvestmentEstimateJSON`
   - 目标：在JSON输出中添加三级子项数据

2. **客户端**：`client/src/utils/tableResourceBuilder.ts`
   - 函数：`buildInvestmentEstimateJSON`
   - 目标：在JSON输出中添加三级子项数据

## 实施步骤

### 步骤1：修改服务端 `server/src/utils/tableDataBuilder.ts`

**位置**：第52行开始 `buildInvestmentEstimateJSON` 函数

**修改内容**：

1. 获取三级子项数据：
   ```typescript
   const thirdLevelItems = estimateData.thirdLevelItems || estimateData.partA?.thirdLevelItems || {}
   ```

2. 在partA的children中添加嵌套的thirdLevelItems（处理三级子项为空的情况）：
   ```typescript
   partA: {
     name: '第一部分 工程费用',
     total: formatNumber2(estimateData.partA?.合计),
     children: (estimateData.partA?.children || []).map((item: any, parentIndex: number) => {
       const thirdItems = thirdLevelItems[parentIndex] || []
       
       const baseItem = {
         序号: formatString(item.序号),
         工程或费用名称: formatString(item.工程或费用名称),
         建设工程费: formatNumber2(item['建设工程费（万元）'] || item.建设工程费),
         设备购置费: formatNumber2(item['设备购置费（万元）'] || item.设备购置费),
         安装工程费: formatNumber2(item['安装工程费（万元）'] || item.安装工程费),
         其它费用: formatNumber2(item['其它费用（万元）'] || item.其它费用),
         合计: formatNumber2(item['合计（万元）'] || item.合计),
         备注: formatString(item.备注)
       }
       
       // 只有当存在三级子项时才添加children字段
       if (thirdItems.length > 0) {
         baseItem.children = thirdItems.map((subItem: any) => ({
           名称: subItem.name || '',
           单位: subItem.unit || '',
           数量: formatNumber2(subItem.quantity),
           单价: formatNumber2(subItem.unit_price),  // 注意：unit_price是元为单位
           单价万元: formatNumber2(subItem.unit_price / 10000),  // 转换为万元
           工程总价: formatNumber2((subItem.quantity * subItem.unit_price) / 10000),
           建设工程费: formatNumber2((subItem.quantity * subItem.unit_price / 10000) * (subItem.construction_ratio || 0)),
           设备购置费: formatNumber2((subItem.quantity * subItem.unit_price / 10000) * (subItem.equipment_ratio || 0)),
           安装工程费: formatNumber2((subItem.quantity * subItem.unit_price / 10000) * (subItem.installation_ratio || 0)),
           其它费用: formatNumber2((subItem.quantity * subItem.unit_price / 10000) * (subItem.other_ratio || 0)),
           占总价比例: subItem.construction_ratio 
             ? `${(subItem.construction_ratio * 100).toFixed(1)}%` : ''
         }))
       }
       
       return baseItem
     })
   }
   ```

### 步骤2：修改客户端 `client/src/utils/tableResourceBuilder.ts`

**位置**：第948行开始 `buildInvestmentEstimateJSON` 函数

**修改内容**：与服务端类似，在partA的children中添加嵌套的thirdLevelItems

### 步骤3：测试验证

1. 确认三级子项数据正确加载
2. 验证JSON输出包含三级子项
3. 检查报告生成时LLM能接收到三级子项数据

## 输出JSON结构示例

修改后的 `{{DATA:investment_estimate}}` JSON将包含：

```json
{
  "title": "投资估算简表",
  "partA": {
    "name": "第一部分 工程费用",
    "children": [
      {
        "序号": "一",
        "工程或费用名称": "主体工程",
        "children": [
          {
            "名称": "肉牛养殖舍建设",
            "单位": "m²",
            "数量": 5628.87,
            "单价": 1865.32,
            "单价万元": 0.19,
            "工程总价": 1049.96,
            "建设工程费": 469.07,
            "设备购置费": 347.94,
            "安装工程费": 174.62,
            "其它费用": 58.33
          },
          {
            "名称": "蚯蚓养殖大棚建设",
            "单位": "m²",
            "数量": 12565.4,
            "单价": 642.47,
            "单价万元": 0.06,
            "工程总价": 807.29,
            ...
          }
        ]
      },
      {
        "序号": "二",
        "工程或费用名称": "辅助工程",
        "children": [
          {
            "名称": "道路硬化工程",
            "单位": "m²",
            ...
          }
        ]
      }
    ]
  }
}
```

## 注意事项

1. **空值处理**：三级子项数据可能为空（某些二级子项可能没有对应的三级子项），需要做好兜底处理，只有当 `thirdItems.length > 0` 时才添加 `children` 字段
2. **单位转换**：单价是元为单位，需要除以10000转换为万元
3. **费用计算**：各项费用 = 工程总价 × 对应占比
4. **向后兼容**：保持现有JSON结构不变，只在children中添加嵌套的thirdLevelItems（当存在时）
