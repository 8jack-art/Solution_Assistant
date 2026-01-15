/**
 * 构建外购原材料费估算表 JSON 数据
 * 
 * 数据来源：
 * - parameters: costConfig.rawMaterials.items
 * - rows: costTableData.rows 中查找序号为 1.1 的行
 */
import { safeParseJSON } from './shared.js'

export function buildRawMaterialsJSON(rawMaterialsData: any): string {
  if (!rawMaterialsData) return '{}'
  
  const jsonData: any = {
    title: '外购原材料费估算表',
    parameters: [],
    summary: { totalCost: 0 },
    updatedAt: new Date().toISOString()
  }
  
  // 从 costTableData 获取 rows（查找序号为 1.1 的行）
  let rawMaterialsRow: any = null
  const costTableData = rawMaterialsData.costTableData
  if (costTableData) {
    const tableData = typeof costTableData === 'string' ? safeParseJSON(costTableData) : costTableData
    if (tableData?.rows && Array.isArray(tableData.rows)) {
      rawMaterialsRow = tableData.rows.find((r: any) => r.序号 === '1.1')
    }
  }
  
  // 从外购原材料费估算表modal表格数据中获取运营期数据
  let rawMaterialsModalData: any = null
  if (rawMaterialsData.costConfig?.rawMaterials) {
    // 构建类似modal中的表格数据结构
    const operationYears = rawMaterialsData.operationYears || 17
    const years = Array.from({ length: operationYears }, (_, i) => i + 1)
    
    // 获取收入项数据
    const revenueItems = rawMaterialsData.costConfig?.revenueItems || rawMaterialsData.revenueItems || []
    
    // 获取原材料项目数据
    const items = rawMaterialsData.costConfig?.rawMaterials?.items || []
    
    // 计算项目总收入（含税）
    const calculateTotalRevenue = () => {
      return revenueItems.reduce((sum: number, item: any) => {
        let itemRevenue = 0
        switch (item.fieldTemplate) {
          case 'quantity-price':
            itemRevenue = (item.quantity || 0) * (item.unitPrice || 0)
            break
          case 'area-yield-price':
            itemRevenue = (item.area || 0) * (item.yieldPerArea || 0) * (item.unitPrice || 0)
            break
          case 'capacity-utilization':
            itemRevenue = (item.capacity || 0) * (item.utilizationRate || 0) * (item.unitPrice || 0)
            break
          case 'subscription':
            itemRevenue = (item.subscriptions || 0) * (item.unitPrice || 0)
            break
          case 'direct-amount':
            itemRevenue = item.directAmount || 0
            break
        }
        return sum + itemRevenue
      }, 0)
    }
    
    const totalRevenue = calculateTotalRevenue()
    
    // 计算各年的达产率
    const getProductionRate = (year: number) => {
      const productionRates = rawMaterialsData.productionRates || []
      return productionRates.find(p => p.yearIndex === year)?.rate || 1
    }
    
    // 计算单个原材料项目的年度金额
    const calculateItemYearAmount = (item: any, year: number) => {
      const productionRate = getProductionRate(year)
      if (item.sourceType === 'percentage') {
        let revenueBase = 0
        if (item.linkedRevenueId === 'total' || !item.linkedRevenueId) {
          revenueBase = totalRevenue
        } else {
          const revItem = revenueItems.find(r => r.id === item.linkedRevenueId)
          if (revItem) {
            let itemRevenue = 0
            switch (revItem.fieldTemplate) {
              case 'quantity-price':
                itemRevenue = (revItem.quantity || 0) * (revItem.unitPrice || 0)
                break
              case 'area-yield-price':
                itemRevenue = (revItem.area || 0) * (revItem.yieldPerArea || 0) * (revItem.unitPrice || 0)
                break
              case 'capacity-utilization':
                itemRevenue = (revItem.capacity || 0) * (revItem.utilizationRate || 0) * (revItem.unitPrice || 0)
                break
              case 'subscription':
                itemRevenue = (revItem.subscriptions || 0) * (revItem.unitPrice || 0)
                break
              case 'direct-amount':
                itemRevenue = revItem.directAmount || 0
                break
            }
            revenueBase = itemRevenue
          }
        }
        return (revenueBase * (item.percentage ?? 0) / 100) * productionRate
      } else if (item.sourceType === 'quantityPrice') {
        return ((item.quantity ?? 0) * (item.unitPrice ?? 0)) * productionRate
      } else {
        return (item.directAmount ?? 0) * productionRate
      }
    }
    
    // 为每个原材料项目构建各自的运营期数据
    const itemsOperationPeriodData = items.map((item: any) => {
      return years.map(year => {
        return calculateItemYearAmount(item, year)
      })
    })
    
    rawMaterialsModalData = {
      itemsOperationPeriodData
    }
  }
  
  // 重新获取 items（用于 parameters）
  const rawMaterialsConfig = rawMaterialsData.costConfig?.rawMaterials
  const items = rawMaterialsConfig?.items || []
  
  // 重新获取收入项数据
  const revenueItems = rawMaterialsData.costConfig?.revenueItems || rawMaterialsData.revenueItems || []
  
  // 计算项目总收入（含税）
  const calculateTotalRevenue = () => {
    return revenueItems.reduce((sum: number, item: any) => {
      let itemRevenue = 0
      switch (item.fieldTemplate) {
        case 'quantity-price':
          itemRevenue = (item.quantity || 0) * (item.unitPrice || 0)
          break
        case 'area-yield-price':
          itemRevenue = (item.area || 0) * (item.yieldPerArea || 0) * (item.unitPrice || 0)
          break
        case 'capacity-utilization':
          itemRevenue = (item.capacity || 0) * (item.utilizationRate || 0) * (item.unitPrice || 0)
          break
        case 'subscription':
          itemRevenue = (item.subscriptions || 0) * (item.unitPrice || 0)
          break
        case 'direct-amount':
          itemRevenue = item.directAmount || 0
          break
      }
      return sum + itemRevenue
    }, 0)
  }
  
  const totalRevenue = calculateTotalRevenue()
  
  // 构建 parameters
  if (items.length > 0) {
    jsonData.parameters = items.map((item: any, idx: number) => {
      const sourceType = item.sourceType || 'unknown'
      let 计算方式 = ''
      let 单价 = 0
      let 年用量 = 0
      let 年费用: string | number = 0
      let 百分比 = 0
      let 收入基数 = ''
      let 收入基数金额 = 0
      
      switch (sourceType) {
        case 'percentage':
          计算方式 = '按收入百分比'
          百分比 = item.percentage || 0
          if (item.linkedRevenueId === 'total' || !item.linkedRevenueId) {
            收入基数 = '项目总收入'
            收入基数金额 = totalRevenue
          } else {
            const linkedRevenue = revenueItems.find((r: any) => r.id === item.linkedRevenueId)
            if (linkedRevenue) {
              收入基数 = linkedRevenue.name || '特定收入项'
              let revAmount = 0
              switch (linkedRevenue.fieldTemplate) {
                case 'quantity-price':
                  revAmount = (linkedRevenue.quantity || 0) * (linkedRevenue.unitPrice || 0)
                  break
                case 'area-yield-price':
                  revAmount = (linkedRevenue.area || 0) * (linkedRevenue.yieldPerArea || 0) * (linkedRevenue.unitPrice || 0)
                  break
                case 'capacity-utilization':
                  revAmount = (linkedRevenue.capacity || 0) * (linkedRevenue.utilizationRate || 0) * (linkedRevenue.unitPrice || 0)
                  break
                case 'subscription':
                  revAmount = (linkedRevenue.subscriptions || 0) * (linkedRevenue.unitPrice || 0)
                  break
                case 'direct-amount':
                  revAmount = linkedRevenue.directAmount || 0
                  break
              }
              收入基数金额 = revAmount
            } else {
              收入基数 = '项目总收入'
              收入基数金额 = totalRevenue
            }
          }
          年费用 = 收入基数金额 * (百分比 / 100)
          break
        case 'quantityPrice':
          计算方式 = '数量×单价'
          单价 = item.unitPrice || item.单价 || 0
          年用量 = item.quantity || 0
          年费用 = 单价 * 年用量
          break
        case 'directAmount':
          计算方式 = '直接金额'
          年费用 = item.directAmount || 0
          break
        default:
          计算方式 = sourceType
          年费用 = item.annualCost || item.年费用 || 0
      }
      
      // 当计算方式为"按收入百分比"或"直接金额"时，单位字段填充"-"
      const 单位 = (sourceType === 'percentage' || sourceType === 'directAmount') ? '-' : (item.unit || item.单位 || '')
      
      return {
        序号: item.序号 || (idx + 1),
        材料名称: item.name || item.材料名称 || '',
        单位,
        计算方式,
        ...(计算方式 === '数量×单价' ? {
          '单价（万元）': 单价 > 0 ? Number(单价).toFixed(4) : undefined
        } : {}),
        ...(年用量 > 0 ? {
          [单位 ? `年用量（${单位}）` : '年用量']: Number(年用量).toFixed(2)
        } : {}),
        '达产年费用（万元）': typeof 年费用 === 'number' ? (年费用 > 0 ? Number(年费用).toFixed(2) : '0.00') : 年费用,
        ...(百分比 > 0 ? { '百分比（%）': `${百分比}%` } : {}),
        ...(收入基数 ? { 收入基数, '收入基数金额（万元）': Number(收入基数金额).toFixed(2) } : {}),
        运营期: rawMaterialsModalData?.itemsOperationPeriodData[idx]?.map((val: number) =>
          Number(val) > 0 ? Number(val).toFixed(2) : val
        ) || [],
        '合计（万元）': (() => {
          const operationData = rawMaterialsModalData?.itemsOperationPeriodData[idx] || []
          const total = operationData.reduce((sum: number, val: number) => sum + (Number(val) || 0), 0)
          return total > 0 ? Number(total).toFixed(2) : '0.00'
        })(),
        '年均（万元）': (() => {
          const operationData = rawMaterialsModalData?.itemsOperationPeriodData[idx] || []
          const total = operationData.reduce((sum: number, val: number) => sum + (Number(val) || 0), 0)
          const years = operationData.length || 1
          const average = total / years
          return average > 0 ? Number(average).toFixed(2) : '0.00'
        })()
      }
    })
  }
  
  // 计算所有参数项的合计值
  const calculateParametersTotal = () => {
    return jsonData.parameters.reduce((total: number, item: any) => {
      const itemTotal = Number(item['合计（万元）']) || 0
      return total + itemTotal
    }, 0)
  }
  
  // 设置summary中的totalCost为所有参数项合计值的总和
  jsonData.summary.totalCost = calculateParametersTotal()
  
  // 添加年均字段
  const operationYears = rawMaterialsData.operationYears || 17
  jsonData.summary.averageAnnual = Number((jsonData.summary.totalCost / operationYears).toFixed(2))
  
  console.log('🔍 [buildRawMaterialsJSON] 输出:', {
    items数量: items.length,
    parameters数量: jsonData.parameters.length,
    totalCost: jsonData.summary.totalCost,
    averageAnnual: jsonData.summary.averageAnnual,
    totalRevenue
  })
  
  return JSON.stringify(jsonData, null, 2)
}
