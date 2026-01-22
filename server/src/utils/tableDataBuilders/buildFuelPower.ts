/**
 * 构建外购燃料和动力费估算表 JSON 数据
 * 
 * 数据来源：
 * - parameters: costConfig.fuelPower.items
 * - rows: costTableData.rows 中查找序号为 1.2 的行
 */
import { safeParseJSON } from './shared.js'

export function buildFuelPowerJSON(fuelPowerData: any): string {
  if (!fuelPowerData) return '{}'
  
  const jsonData: any = {
    title: '外购燃料和动力费估算表',
    parameters: [],
    summary: { totalCost: 0 },
    updatedAt: new Date().toISOString()
  }
  
  // 获取 items（用于 parameters）
  const fuelPowerConfig = fuelPowerData.costConfig?.fuelPower
  const items = fuelPowerConfig?.items || []
  
  // 从外购燃料和动力费估算表modal表格数据中获取运营期数据
  let fuelPowerModalData: any = null
  if (fuelPowerData.costConfig?.fuelPower) {
    // 构建类似modal中的表格数据结构
    const operationYears = fuelPowerData.operationYears || 17
    const years = Array.from({ length: operationYears }, (_, i) => i + 1)
    
    // 计算各年的达产率
    const getProductionRate = (year: number) => {
      // 【修复】优先检查外购燃料和动力费是否配置了"应用达产率"
      const applyProductionRate = fuelPowerData.costConfig?.fuelPower?.applyProductionRate
      if (applyProductionRate === false) {
        return 1  // 不应用达产率，返回100%
      }
      
      const productionRates = fuelPowerData.productionRates || []
      return productionRates.find(p => p.yearIndex === year)?.rate || 1
    }
    
    // 计算单个燃料动力项目的年度金额（根据modal简化逻辑）
    const calculateItemYearAmount = (item: any, year: number) => {
      const productionRate = getProductionRate(year)
      const consumption = item.consumption || 0
      const price = item.price || 0
      
      // 根据modal中的逻辑，燃料动力费只有简单的数量×单价计算
      // 对汽油和柴油进行特殊处理：单价×数量/10000（元转万元）
      if (['汽油', '柴油'].includes(item.name)) {
        return (price * consumption / 10000) * productionRate
      } else {
        return (consumption * price) * productionRate
      }
    }
    
    // 为每个燃料动力项目构建各自的运营期数据
    const itemsOperationPeriodData = items.map((item: any) => {
      return years.map(year => {
        return calculateItemYearAmount(item, year)
      })
    })
    
    fuelPowerModalData = {
      itemsOperationPeriodData
    }
  }
  
  // 构建 parameters（根据modal简化逻辑）
  if (items.length > 0) {
    jsonData.parameters = items.map((item: any, idx: number) => {
      // 根据modal字段结构生成JSON
      const getQuantityLabel = (itemName: string) => {
        const labelMap: { [key: string]: string } = {
          '水费': '数量（万m³）',
          '电费': '数量（万kWh）',
          '汽油': '数量（吨）',
          '柴油': '数量（吨）',
          '天然气': '数量（万m³）'
        };
        return labelMap[itemName] || '数量';
      };

      return {
        序号: item.序号 || (idx + 1),
        费用项目名称: item.name || item.名称 || item.燃料名称 || '',
        [getQuantityLabel(item.name || '')]: Number(item.consumption || 0).toFixed(2),
        '单价（元）': Number(item.price || 0).toFixed(2),
        '进项税率(%)': 13,
        运营期: fuelPowerModalData?.itemsOperationPeriodData[idx]?.map((val: number) =>
          Number(val) > 0 ? Number(val).toFixed(2) : val
        ) || [],
        '合计（万元）': (() => {
          const operationData = fuelPowerModalData?.itemsOperationPeriodData[idx] || []
          const total = operationData.reduce((sum: number, val: number) => sum + (Number(val) || 0), 0)
          return total > 0 ? Number(total).toFixed(2) : '0.00'
        })(),
        '年均（万元）': (() => {
          const operationData = fuelPowerModalData?.itemsOperationPeriodData[idx] || []
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
  const operationYears = fuelPowerData.operationYears || 17
  jsonData.summary.averageAnnual = Number((jsonData.summary.totalCost / operationYears).toFixed(2))
  
  console.log('🔍 [buildFuelPowerJSON] 输出:', {
    items数量: items.length,
    parameters数量: jsonData.parameters.length,
    totalCost: jsonData.summary.totalCost,
    averageAnnual: jsonData.summary.averageAnnual
  })
  
  return JSON.stringify(jsonData, null, 2)
}
