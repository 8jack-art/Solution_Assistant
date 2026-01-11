/**
 * 表格数据生成器
 * 将投资估算、收入成本等数据格式化为 JSON 格式，用于 LLM 提示词
 */

/**
 * 辅助函数：安全解析 JSON 字符串
 */
const safeParseJSON = (data: any): any => {
  if (!data) return null
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch (e) {
      return null
    }
  }
  return data
}

/**
 * 构建投资估算简表 JSON 数据
 */
export function buildInvestmentEstimateJSON(estimateData: any): string {
  if (!estimateData) return '{}'
  
  const jsonData: any = {
    title: '投资估算简表',
    summary: {
      totalInvestment: estimateData.partG?.合计 || 0,
      constructionInvestment: estimateData.partE?.合计 || 0,
      interestDuringConstruction: estimateData.partF?.合计 || 0,
      contingency: estimateData.partD?.合计 || 0
    },
    partA: {
      name: '第一部分 工程费用',
      total: estimateData.partA?.合计 || 0,
      children: (estimateData.partA?.children || []).map((item: any) => ({
        序号: item.序号,
        工程或费用名称: item.工程或费用名称,
        建设工程费: item['建设工程费（万元）'] || item.建设工程费 || 0,
        设备购置费: item['设备购置费（万元）'] || item.设备购置费 || 0,
        安装工程费: item['安装工程费（万元）'] || item.安装工程费 || 0,
        其它费用: item['其它费用（万元）'] || item.其它费用 || 0,
        合计: item['合计（万元）'] || item.合计 || 0
      }))
    },
    partB: {
      name: '第二部分 工程其它费用',
      total: estimateData.partB?.合计 || 0,
      children: (estimateData.partB?.children || []).map((item: any) => ({
        序号: item.序号,
        工程或费用名称: item.工程或费用名称,
        其它费用: item['其它费用（万元）'] || item.其它费用 || item.合计 || 0,
        合计: item['合计（万元）'] || item.合计 || 0
      }))
    },
    partC: {
      total: estimateData.partC?.合计 || 0
    },
    partD: {
      total: estimateData.partD?.合计 || 0
    },
    partE: {
      total: estimateData.partE?.合计 || 0
    },
    partF: {
      total: estimateData.partF?.合计 || 0,
      贷款总额: estimateData.partF?.贷款总额 || 0,
      年利率: (estimateData.partF?.年利率 || 0) * 100
    },
    partG: {
      total: estimateData.partG?.合计 || 0
    }
  }
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建折旧与摊销估算表 JSON 数据
 * 折旧数据存储在 revenueCostModelData.depreciationAmortization 中
 * 结构为: { 
 *   A_depreciation: number[], 
 *   D_depreciation: number[], 
 *   E_amortization: number[],
 *   A: { 原值, 年折旧额, 折旧年限, 残值率 },
 *   D: { 原值, 年折旧额, 折旧年限, 残值率 },
 *   E: { 原值, 年摊销额, 摊销年限, 残值率 }
 * }
 * 
 * 输出简化格式，供报告生成使用：
 * - 建筑折旧：年限、残值率（%）、年均折旧费（万元）
 * - 机器设备折旧：年限、残值率（%）、年均折旧费（万元）
 * - 无形资产摊销：年限、年摊销费（万元）
 */
export function buildDepreciationAmortizationJSON(depreciationData: any): string {
  if (!depreciationData) return '{}'
  
  // 获取折旧摊销数据（从 depreciationAmortization 字段）
  const depAmortData = depreciationData.depreciationAmortization || depreciationData
  
  // 调试日志：打印原始数据结构
  console.log('🔍 buildDepreciationAmortizationJSON 调试信息:', {
    '原始数据keys': Object.keys(depreciationData),
    'depAmortData keys': Object.keys(depAmortData),
    'A_depreciation长度': depAmortData.A_depreciation?.length || 0,
    'D_depreciation长度': depAmortData.D_depreciation?.length || 0,
    'E_amortization长度': depAmortData.E_amortization?.length || 0,
    'A参数': JSON.stringify(depAmortData.A || {}),
    'D参数': JSON.stringify(depAmortData.D || {}),
    'E参数': JSON.stringify(depAmortData.E || {})
  })
  
  // 提取年度数据
  const aDepreciation = depAmortData.A_depreciation || []
  const dDepreciation = depAmortData.D_depreciation || []
  const eAmortization = depAmortData.E_amortization || []
  
  // 提取折旧参数（优先从嵌套结构获取，如果为空则从根对象获取）
  const aParams = (depAmortData.A && Object.keys(depAmortData.A).length > 0) 
    ? depAmortData.A 
    : (depreciationData.A || {})
  const dParams = (depAmortData.D && Object.keys(depAmortData.D).length > 0) 
    ? depAmortData.D 
    : (depreciationData.D || {})
  const eParams = (depAmortData.E && Object.keys(depAmortData.E).length > 0) 
    ? depAmortData.E 
    : (depreciationData.E || {})
  
  // 构建简化格式的 JSON 数据（用于报告生成）
  const jsonData: any = {
    // 建筑折旧（房屋建筑物）
    建筑折旧: {
      年限: aParams.折旧年限 || aParams.depreciationYears || 0,
      残值率: aParams.残值率 || aParams.residualRate || 0,
      年均折旧费: aParams.年折旧额 || aParams.annualDepreciation || (aDepreciation[0] || 0)
    },
    // 机器设备折旧
    机器设备折旧: {
      年限: dParams.折旧年限 || dParams.depreciationYears || 0,
      残值率: dParams.残值率 || dParams.residualRate || 0,
      年均折旧费: dParams.年折旧额 || dParams.annualDepreciation || (dDepreciation[0] || 0)
    },
    // 无形资产摊销
    无形资产摊销: {
      年限: eParams.摊销年限 || eParams.amortizationYears || 0,
      年摊销费: eParams.年摊销额 || eParams.annualAmortization || (eAmortization[0] || 0)
    }
  }
  
  // 计算合计年均折旧费
  jsonData.年均折旧费合计 = 
    (jsonData.建筑折旧.年均折旧费 || 0) +
    (jsonData.机器设备折旧.年均折旧费 || 0) +
    (jsonData.无形资产摊销.年摊销费 || 0)
  
  console.log('✅ buildDepreciationAmortizationJSON 输出:', JSON.stringify(jsonData, null, 2))
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建营业收入、税金及附加估算表 JSON 数据
 * 
 * 返回结构包含：
 * - parameters: 营业收入配置表格数据（序号、收入项名称、模板、参数值）
 * - rows: 渲染后的表格数据（序号、合计、运营期）
 */
export function buildRevenueTaxJSON(revenueTaxData: any): string {
  if (!revenueTaxData) return '{}'
  
  const jsonData: any = {
    title: '营业收入、营业税金及附加和增值税估算表',
    urbanTaxRate: revenueTaxData.urbanTaxRate || 0.07,
    parameters: [],
    rows: [],
    updatedAt: revenueTaxData.updatedAt || new Date().toISOString()
  }
  
  // 模板名称映射
  const TEMPLATE_LABELS: Record<string, string> = {
    'quantity-price': '数量 × 单价',
    'area-yield-price': '面积 × 亩产量 × 单价',
    'capacity-utilization': '产能 × 利用率 × 单价',
    'subscription': '订阅数 × 单价',
    'direct-amount': '直接金额',
  }
  
  // 辅助函数：根据单价阈值动态格式化价格显示（与 DynamicRevenueTable.renderFieldValue 保持一致）
  const formatPriceWithUnit = (price: number | undefined, unit: string = '万元'): string => {
    if (price === undefined || price === null) return `0${unit}`
    // 单价 < 0.1万元（1000元）时显示为元
    if (price < 0.1) {
      const priceInYuan = price * 10000
      const displayPrice = parseFloat(priceInYuan.toFixed(2)).toString()
      // 如果单位是万元（无后缀），只显示"元"
      // 如果单位是万元/xxx，显示为"元/xxx"
      if (unit === '万元') {
        return `${displayPrice}元`
      }
      return `${displayPrice}${unit.replace('万元', '元')}`
    }
    // 保留2位小数，使用 parseFloat 去掉末尾的0
    const displayPrice = parseFloat(price.toFixed(2)).toString()
    return `${displayPrice}${unit}`
  }
  
  // 大数值简化函数 - 将大数字转换为万、千万、亿单位
  const formatLargeNumber = (value: number): string => {
    if (value >= 100000000) {
      return `${(value / 100000000).toFixed(2).replace(/\.?0+$/, '')}亿`
    } else if (value >= 10000000) {
      return `${(value / 10000000).toFixed(2).replace(/\.?0+$/, '')}千万`
    } else if (value >= 10000) {
      return `${(value / 10000).toFixed(2).replace(/\.?0+$/, '')}万`
    }
    return value.toString()
  }
  
  // 格式化参数值（与 DynamicRevenueTable.renderFieldValue 保持一致）
  const formatParamValue = (item: any): string => {
    switch (item.fieldTemplate) {
      case 'quantity-price':
        return `${formatLargeNumber(item.quantity || 0)}${item.unit || ''} × ${formatPriceWithUnit(item.unitPrice, item.unit ? `万元/${item.unit}` : '万元')}`
      case 'area-yield-price':
        return `${formatLargeNumber(item.area || 0)}亩 × ${formatLargeNumber(item.yieldPerArea || 0)}${item.yieldPerAreaUnit || ''} × ${formatPriceWithUnit(item.unitPrice, item.yieldPerAreaUnit ? `万元/${item.yieldPerAreaUnit}` : '万元')}`
      case 'capacity-utilization':
        return `${formatLargeNumber(item.capacity || 0)}${item.capacityUnit || ''} × ${((item.utilizationRate || 0) * 100).toFixed(0)}% × ${formatPriceWithUnit(item.unitPrice)}`
      case 'subscription':
        return `${formatLargeNumber(item.subscriptions || 0)} × ${formatPriceWithUnit(item.unitPrice)}`
      case 'direct-amount':
        // 直接金额模板：显示数量 × 单价格式（如果有数量和单价信息）
        if (item.quantity && item.quantity > 0 && item.unitPrice && item.unitPrice > 0) {
          return `${formatLargeNumber(item.quantity)}${item.unit || ''} × ${formatPriceWithUnit(item.unitPrice, item.unit ? `万元/${item.unit}` : '万元')}`
        }
        return `${parseFloat((item.directAmount || 0).toFixed(4)).toString()}万元/年`
      default:
        return ''
    }
  }
  
  // 1. 构建 parameters - 只包含序号为1.1-1.10的收入项
  const revenueItems = safeParseJSON(revenueTaxData.revenueItems)
  if (revenueItems && Array.isArray(revenueItems)) {
    revenueItems.forEach((item: any, idx: number) => {
      if (idx < 10) { // 只保留 1.1-1.10
        jsonData.parameters.push({
          序号: `1.${idx + 1}`,
          收入项目: item.name || '',
          模板: TEMPLATE_LABELS[item.fieldTemplate] || '',
          parametervalue: formatParamValue(item)
        })
      }
    })
  }
  
  // 2. 构建 rows - 渲染后的表格数据
  const revenueTableData = safeParseJSON(revenueTaxData.revenueTableData)
  if (revenueTableData && revenueTableData.rows && Array.isArray(revenueTableData.rows)) {
    jsonData.rows = revenueTableData.rows.map((row: any) => ({
      序号: row.序号,
      合计: Number(row.合计) > 0 ? Number(row.合计).toFixed(2) : row.合计,
      运营期: (row.运营期 || []).map((val: number) => (val > 0 ? Number(val).toFixed(2) : val))
    }))
    // 保留城市维护税率
    jsonData.urbanTaxRate = revenueTableData.urbanTaxRate || jsonData.urbanTaxRate
  }
  
  console.log('✅ buildRevenueTaxJSON 输出:', JSON.stringify(jsonData, null, 2))
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建外购原材料费估算表 JSON 数据
 * 返回结构与 buildRevenueTaxJSON 一致：包含 parameters（参数配置）和 rows（渲染数据）
 * 
 * 数据来源：projectData.revenueCost.costConfig.rawMaterials
 * 优先使用前端渲染好的表格数据 rawMaterialsTableData 和 fuelPowerTableData
 */
export function buildRawMaterialsJSON(rawMaterialsData: any): string {
  if (!rawMaterialsData) return '{}'
  
  const jsonData: any = {
    title: '外购原材料费估算表',
    parameters: [],
    rows: [],
    summary: { totalCost: 0 },
    updatedAt: new Date().toISOString()
  }
  
  // 优先从 rawMaterialsTableData 获取渲染后的表格数据和费用计算信息
  let rawMaterialsTableData = null
  
  // 路径1: rawMaterialsData.revenueCost?.rawMaterialsTableData（前端渲染数据）
  if (rawMaterialsData.revenueCost?.rawMaterialsTableData) {
    rawMaterialsTableData = typeof rawMaterialsData.revenueCost.rawMaterialsTableData === 'string' 
      ? safeParseJSON(rawMaterialsData.revenueCost.rawMaterialsTableData) 
      : rawMaterialsData.revenueCost.rawMaterialsTableData
  }
  // 路径2: rawMaterialsData.rawMaterialsTableData
  else if (rawMaterialsData.rawMaterialsTableData) {
    rawMaterialsTableData = typeof rawMaterialsData.rawMaterialsTableData === 'string'
      ? safeParseJSON(rawMaterialsData.rawMaterialsTableData)
      : rawMaterialsData.rawMaterialsTableData
  }
  
  // 1. 构建 parameters - 从 rawMaterialsTableData.rows 获取渲染数据
  if (rawMaterialsTableData?.rows && Array.isArray(rawMaterialsTableData.rows)) {
    // 过滤出子项（序号为 1.1, 1.2, 1.3... 的行）
    const itemRows = rawMaterialsTableData.rows.filter((row: any) => {
      const serialNum = row.serialNumber || row.序号 || ''
      return /^\d+\.\d+$/.test(serialNum.toString())
    })
    
    // 获取原始配置项用于补充计算方式等信息
    let configItems: any[] = []
    const rawMaterialsConfig = rawMaterialsData.revenueCost?.costConfig?.rawMaterials || rawMaterialsData.costConfig?.rawMaterials
    if (rawMaterialsConfig?.items && Array.isArray(rawMaterialsConfig.items)) {
      configItems = rawMaterialsConfig.items
    }
    
    if (itemRows.length > 0) {
      // 获取收入项数据用于计算收入基数
      let revenueItems: any[] = []
      const rawMaterialsConfig = rawMaterialsData.revenueCost?.costConfig || rawMaterialsData.costConfig
      if (rawMaterialsConfig?.revenueItems && Array.isArray(rawMaterialsConfig.revenueItems)) {
        revenueItems = rawMaterialsConfig.revenueItems
      } else {
        const revenueItemsRaw = rawMaterialsData.revenueCost?.revenueItems || rawMaterialsData.revenueItems
        if (revenueItemsRaw) {
          revenueItems = typeof revenueItemsRaw === 'string' ? safeParseJSON(revenueItemsRaw) : revenueItemsRaw
        }
      }
      
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
      
      jsonData.parameters = itemRows.map((row: any, idx: number) => {
        const configItem = configItems[idx]
        const sourceType = configItem?.sourceType || 'unknown'
        
        // 计算方式描述
        let 计算方式 = ''
        let 单价 = 0
        let 年用量 = 0
        let 年费用: string | number = 0
        let 百分比 = 0
        let 收入基数: string = ''
        let 收入基数金额: number = 0
        
        switch (sourceType) {
          case 'percentage':
            计算方式 = '按收入百分比'
            百分比 = configItem?.percentage || 0
            // 获取收入基数信息
            if (configItem?.linkedRevenueId === 'total' || !configItem?.linkedRevenueId) {
              收入基数 = '项目总收入'
              收入基数金额 = totalRevenue
            } else {
              const linkedRevenue = revenueItems.find((r: any) => r.id === configItem.linkedRevenueId)
              收入基数 = linkedRevenue?.name || '特定收入项'
              // 计算该收入项的金额
              if (linkedRevenue) {
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
                收入基数金额 = totalRevenue
              }
            }
            // 年费用 = 收入基数 × 百分比
            年费用 = 收入基数金额 * (百分比 / 100)
            break
          case 'quantityPrice':
            计算方式 = '数量×单价'
            单价 = configItem?.unitPrice || 0
            年用量 = configItem?.quantity || 0
            年费用 = 单价 * 年用量
            break
          case 'directAmount':
            计算方式 = '直接金额'
            年费用 = configItem?.directAmount || 0
            break
          default:
            计算方式 = sourceType
            年费用 = row.total || 0
        }
        
        // 获取单位用于动态字段名
        const 单位 = configItem?.unit || configItem?.单位 || ''
        
        return {
          序号: row.serialNumber || row.序号 || `1.${idx + 1}`,
          材料名称: row.name || configItem?.name || '',
          ...(单位 ? { 单位 } : {}),
          计算方式,
          // 单价字段：根据计算方式决定单位
          ...(计算方式 === '数量×单价' ? {
            '单价（万元）': 单价 > 0 ? Number(单价).toFixed(4) : undefined
          } : 计算方式 === '按收入百分比' ? {} : {
            '单价（元）': 单价 > 0 ? Number(单价).toFixed(2) : undefined
          }),
          // 年用量字段：动态单位
          ...(年用量 > 0 ? {
            [单位 ? `年用量（${单位}）` : '年用量']: Number(年用量).toFixed(2)
          } : {}),
          '年费用（万元）': typeof 年费用 === 'number' ? (年费用 > 0 ? Number(年费用).toFixed(2) : '0.00') : 年费用,
          ...(百分比 > 0 ? { '百分比（%）': `${百分比}%` } : {}),
          ...(收入基数 ? { 收入基数, '收入基数金额（万元）': Number(收入基数金额).toFixed(2) } : {})
        }
      })
    }
    
    // 2. 构建 rows - 直接使用 rawMaterialsTableData.rows 中的渲染数据
    jsonData.rows = rawMaterialsTableData.rows
      .filter((row: any) => {
        const serialNum = row.serialNumber || row.序号 || ''
        // 只保留主要行（序号为 1, 4, 5 等，不包含 1.1, 1.2 等子项）
        return !/^\d+\.\d+$/.test(serialNum.toString())
      })
      .map((row: any) => ({
        序号: row.serialNumber || row.序号,
        成本项目: row.name || row.成本项目,
        合计: Number(row.total) > 0 ? Number(row.total).toFixed(2) : row.total,
        运营期: (row.years || row.运营期 || []).map((val: number) => 
          Number(val) > 0 ? Number(val).toFixed(2) : val
        )
      }))
    
    // 计算合计金额（从 yearsData 或 rows 中获取）
    if (rawMaterialsTableData.yearsData && Array.isArray(rawMaterialsTableData.yearsData)) {
      jsonData.summary.totalCost = rawMaterialsTableData.yearsData.reduce(
        (sum: number, item: any) => sum + (item.total || 0), 0
      )
    } else {
      // 从 rows 中计算合计
      const mainRow = rawMaterialsTableData.rows.find((row: any) => {
        const serialNum = row.serialNumber || row.序号 || ''
        return serialNum === '1' || serialNum === '5'
      })
      jsonData.summary.totalCost = Number(mainRow?.total) || 0
    }
  }
  else {
    // 降级方案：使用原始配置数据（原有逻辑）
    let items: any[] = []
    
    const rawMaterialsConfig = rawMaterialsData.revenueCost?.costConfig?.rawMaterials
    if (rawMaterialsConfig?.items && Array.isArray(rawMaterialsConfig.items)) {
      items = rawMaterialsConfig.items
    }
    else if (rawMaterialsData.costConfig?.rawMaterials?.items && Array.isArray(rawMaterialsData.costConfig.rawMaterials.items)) {
      items = rawMaterialsData.costConfig.rawMaterials.items
    }
    else {
      const rawItems = safeParseJSON(rawMaterialsData.raw_materials)
      if (rawItems && Array.isArray(rawItems)) {
        items = rawItems
      }
    }
    
    if (items.length > 0) {
      // 获取收入项数据用于计算收入基数
      let revenueItems: any[] = []
      const rawMaterialsConfig = rawMaterialsData.revenueCost?.costConfig || rawMaterialsData.costConfig
      if (rawMaterialsConfig?.revenueItems && Array.isArray(rawMaterialsConfig.revenueItems)) {
        revenueItems = rawMaterialsConfig.revenueItems
      } else {
        const revenueItemsRaw = rawMaterialsData.revenueCost?.revenueItems || rawMaterialsData.revenueItems
        if (revenueItemsRaw) {
          revenueItems = typeof revenueItemsRaw === 'string' ? safeParseJSON(revenueItemsRaw) : revenueItemsRaw
        }
      }
      
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
      
      jsonData.parameters = items.map((item: any, idx: number) => {
        const sourceType = item.sourceType || 'unknown'
        let 计算方式 = ''
        let 单价 = 0
        let 年用量 = 0
        let 年费用: string | number = 0
        let 百分比 = 0
        let 收入基数: string = ''
        let 收入基数金额: number = 0
        
        switch (sourceType) {
          case 'percentage':
            计算方式 = '按收入百分比'
            百分比 = item.percentage || 0
            
            // 获取收入基数信息
            if (item.linkedRevenueId === 'total' || !item.linkedRevenueId) {
              收入基数 = '项目总收入'
              收入基数金额 = totalRevenue
            } else {
              const linkedRevenue = revenueItems.find((r: any) => r.id === item.linkedRevenueId)
              if (linkedRevenue) {
                收入基数 = linkedRevenue.name || '特定收入项'
                // 计算该收入项的金额
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
            
            // 年费用 = 收入基数 × 百分比
            年费用 = 收入基数金额 * (百分比 / 100)
            break
          case 'quantityPrice':
            计算方式 = '数量×单价'
            单价 = item.unitPrice || item.单价 || 0
            年用量 = item.annualQuantity || item.年用量 || item.quantity || 0
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
        
        // 获取单位用于动态字段名
        const 单位 = item.unit || item.单位 || ''
        
        return {
          序号: item.序号 || (idx + 1),
          材料名称: item.name || item.材料名称 || '',
          单位: 单位,
          计算方式,
          // 单价字段：根据计算方式决定单位
          ...(计算方式 === '数量×单价' ? {
            '单价（万元）': 单价 > 0 ? Number(单价).toFixed(4) : undefined
          } : 计算方式 === '按收入百分比' ? {} : {
            '单价（元）': 单价 > 0 ? Number(单价).toFixed(2) : undefined
          }),
          // 年用量字段：动态单位
          ...(年用量 > 0 ? {
            [单位 ? `年用量（${单位}）` : '年用量']: Number(年用量).toFixed(2)
          } : {}),
          '年费用（万元）': typeof 年费用 === 'number' ? (年费用 > 0 ? Number(年费用).toFixed(2) : '0.00') : 年费用,
          ...(百分比 > 0 ? { '百分比（%）': `${百分比}%` } : {}),
          ...(收入基数 ? { 收入基数, '收入基数金额（万元）': Number(收入基数金额).toFixed(2) } : {})
        }
      })
    }
    
    // 从 costTableData 获取 rows
    let costTableData = rawMaterialsData.revenueCost?.costTableData
    if (!costTableData && rawMaterialsData.costTableData) {
      costTableData = rawMaterialsData.costTableData
    }
    
    if (costTableData) {
      const tableData = typeof costTableData === 'string' ? safeParseJSON(costTableData) : costTableData
      if (tableData?.rows && Array.isArray(tableData.rows)) {
        const rawMaterialsRow = tableData.rows.find(
          (r: any) => r.成本项目?.includes('外购原材料费')
        )
        if (rawMaterialsRow) {
          jsonData.rows = [{
            序号: rawMaterialsRow.序号,
            成本项目: rawMaterialsRow.成本项目,
            合计: Number(rawMaterialsRow.合计) > 0 ? Number(rawMaterialsRow.合计).toFixed(2) : rawMaterialsRow.合计,
            运营期: (rawMaterialsRow.运营期 || []).map((val: number) => 
              Number(val) > 0 ? Number(val).toFixed(2) : val
            )
          }]
          jsonData.summary.totalCost = Number(rawMaterialsRow.合计) || 0
        }
      }
    }
  }
  
  // 调试日志
  console.log('🔍 [buildRawMaterialsJSON] 输出:', {
    parameters数量: jsonData.parameters.length,
    rows数量: jsonData.rows.length,
    totalCost: jsonData.summary.totalCost
  })
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建外购燃料和动力费估算表 JSON 数据
 * 返回结构与 buildRevenueTaxJSON 一致：包含 parameters（参数配置）和 rows（渲染数据）
 * 
 * 数据来源：projectData.revenueCost.costConfig.fuelPower
 */
export function buildFuelPowerJSON(fuelPowerData: any): string {
  if (!fuelPowerData) return '{}'
  
  const jsonData: any = {
    title: '外购燃料和动力费估算表',
    parameters: [],
    rows: [],
    summary: { totalCost: 0 },
    updatedAt: new Date().toISOString()
  }
  
  // 1. 构建 parameters - 从 revenueCost.costConfig.fuelPower.items 获取燃料动力参数
  // 兼容多种数据路径
  let items: any[] = []
  
  // 路径1: fuelPowerData.revenueCost?.costConfig?.fuelPower?.items
  const fuelPowerConfig1 = fuelPowerData.revenueCost?.costConfig?.fuelPower
  if (fuelPowerConfig1?.items && Array.isArray(fuelPowerConfig1.items)) {
    items = fuelPowerConfig1.items
  }
  // 路径2: fuelPowerData.costConfig?.fuelPower?.items
  else if (fuelPowerData.costConfig?.fuelPower?.items && Array.isArray(fuelPowerData.costConfig.fuelPower.items)) {
    items = fuelPowerData.costConfig.fuelPower.items
  }
  // 路径3: fuelPowerData.fuel_power（原始格式）
  else {
    const rawItems = safeParseJSON(fuelPowerData.fuel_power)
    if (rawItems && Array.isArray(rawItems)) {
      items = rawItems
    }
  }
  
  if (items.length > 0) {
    jsonData.parameters = items.map((item: any, idx: number) => {
      // 计算年费用：单价 × 年用量（汽油/柴油需除以10000）
      const 单价 = item.price || item.unitPrice || item.单价 || 0
      const 年用量 = item.consumption || item.annualQuantity || item.年用量 || 0
      const 年费用 = (['汽油', '柴油'].includes(item.name) 
        ? 单价 * 年用量 / 10000 
        : 单价 * 年用量)
      
      return {
        序号: item.序号 || (idx + 1),
        名称: item.name || item.名称 || item.fuelType || '',
        单位: item.unit || item.单位 || '',
        '单价（元）': 单价 > 0 ? Number(单价).toFixed(2) : undefined,
        '年用量': 年用量 > 0 ? Number(年用量).toFixed(2) : undefined,
        '年费用（万元）': 年费用 > 0 ? Number(年费用).toFixed(2) : undefined
      }
    })
  }
  
  // 2. 构建 rows - 从 costTableData 获取渲染后的表格数据
  // 路径1: fuelPowerData.revenueCost?.costTableData
  let costTableData = fuelPowerData.revenueCost?.costTableData
  // 路径2: fuelPowerData.costTableData
  if (!costTableData && fuelPowerData.costTableData) {
    costTableData = fuelPowerData.costTableData
  }
  
  if (costTableData) {
    const tableData = typeof costTableData === 'string' ? safeParseJSON(costTableData) : costTableData
    if (tableData?.rows && Array.isArray(tableData.rows)) {
      // 查找"外购燃料及动力费"行（与 DynamicCostTable.tsx 中的成本项目名称一致）
      const fuelPowerRow = tableData.rows.find(
        (r: any) => r.成本项目?.includes('外购燃料及动力费')
      )
      if (fuelPowerRow) {
        jsonData.rows = [{
          序号: fuelPowerRow.序号,
          成本项目: fuelPowerRow.成本项目,
          合计: Number(fuelPowerRow.合计) > 0 ? Number(fuelPowerRow.合计).toFixed(2) : fuelPowerRow.合计,
          运营期: (fuelPowerRow.运营期 || []).map((val: number) => 
            Number(val) > 0 ? Number(val).toFixed(2) : val
          )
        }]
        jsonData.summary.totalCost = Number(fuelPowerRow.合计) || 0
      }
    }
  }
  
  // 调试日志
  console.log('🔍 [buildFuelPowerJSON] 输出:', {
    parameters数量: jsonData.parameters.length,
    rows数量: jsonData.rows.length,
    totalCost: jsonData.summary.totalCost
  })
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建利润与利润分配表 JSON 数据
 */
export function buildProfitDistributionJSON(profitData: any): string {
  if (!profitData) return '{}'
  
  const jsonData: any = {
    title: '利润与利润分配表',
    yearlyData: [],
    summary: {
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      totalTax: 0,
      totalNetProfit: 0
    }
  }
  
  // 解析年度利润数据
  const yearlyData = safeParseJSON(profitData.profit_distribution || profitData.yearlyProfit)
  if (yearlyData && Array.isArray(yearlyData)) {
    jsonData.yearlyData = yearlyData.map((item: any) => ({
      年份: item.year || item.年份 || 0,
      营业收入: item.revenue || item.营业收入 || 0,
      总成本费用: item.totalCost || item.总成本费用 || 0,
      营业税金及附加: item.tax || item.营业税金及附加 || 0,
      利润总额: item.profitBeforeTax || item.利润总额 || 0,
      所得税: item.incomeTax || item.所得税 || 0,
      净利润: item.netProfit || item.净利润 || 0
    }))
  }
  
  // 计算合计
  jsonData.summary.totalRevenue = jsonData.yearlyData.reduce(
    (sum: number, item: any) => sum + (item.营业收入 || 0), 0
  )
  jsonData.summary.totalCost = jsonData.yearlyData.reduce(
    (sum: number, item: any) => sum + (item.总成本费用 || 0), 0
  )
  jsonData.summary.totalProfit = jsonData.yearlyData.reduce(
    (sum: number, item: any) => sum + (item.利润总额 || 0), 0
  )
  jsonData.summary.totalTax = jsonData.yearlyData.reduce(
    (sum: number, item: any) => sum + (item.所得税 || 0), 0
  )
  jsonData.summary.totalNetProfit = jsonData.yearlyData.reduce(
    (sum: number, item: any) => sum + (item.净利润 || 0), 0
  )
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建项目投资现金流量表 JSON 数据
 */
export function buildProjectCashFlowJSON(cashFlowData: any): string {
  if (!cashFlowData) return '{}'
  
  const jsonData: any = {
    title: '项目投资现金流量表',
    yearlyData: [],
    summary: {
      totalCashInflow: 0,
      totalCashOutflow: 0,
      netCashFlow: 0,
      npv: 0,
      irr: 0
    }
  }
  
  // 解析年度现金流量数据
  const yearlyData = safeParseJSON(cashFlowData.project_cash_flow || cashFlowData.yearlyCashFlow)
  if (yearlyData && Array.isArray(yearlyData)) {
    jsonData.yearlyData = yearlyData.map((item: any) => ({
      年份: item.year || item.年份 || 0,
      现金流入: item.cashInflow || item.现金流入 || 0,
      现金流出: item.cashOutflow || item.现金流出 || 0,
      净现金流量: item.netCashFlow || item.净现金流量 || 0,
      累计净现金流量: item.cumulativeCashFlow || item.累计净现金流量 || 0,
      所得税前净现金流量: item.cashFlowBeforeTax || item.所得税前净现金流量 || 0,
      所得税后净现金流量: item.cashFlowAfterTax || item.所得税后净现金流量 || 0
    }))
  }
  
  // 计算合计
  jsonData.summary.totalCashInflow = jsonData.yearlyData.reduce(
    (sum: number, item: any) => sum + (item.现金流入 || 0), 0
  )
  jsonData.summary.totalCashOutflow = jsonData.yearlyData.reduce(
    (sum: number, item: any) => sum + (item.现金流出 || 0), 0
  )
  jsonData.summary.netCashFlow = jsonData.yearlyData.reduce(
    (sum: number, item: any) => sum + (item.净现金流量 || 0), 0
  )
  
  // 获取 NPV 和 IRR
  if (cashFlowData.npv) jsonData.summary.npv = cashFlowData.npv
  if (cashFlowData.irr) jsonData.summary.irr = cashFlowData.irr
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建财务计算指标表 JSON 数据
 */
export function buildFinancialIndicatorsJSON(financialData: any): string {
  if (!financialData) return '{}'
  
  const indicators = financialData.financialIndicators || {}
  const investment = financialData.investment || {}
  const revenueCost = financialData.revenueCost || {}
  
  // 计算年均收入和成本
  const revenueItems = safeParseJSON(revenueCost.revenueItems) || []
  const costItems = safeParseJSON(revenueCost.costItems) || []
  
  const totalRevenue = revenueItems.reduce(
    (sum: number, item: any) => sum + (item.annualRevenue || 0), 0
  ) || indicators.totalRevenue || 0
  
  const totalCost = costItems.reduce(
    (sum: number, item: any) => sum + (item.annualCost || 0), 0
  ) || indicators.totalCost || 0
  
  const jsonData: any = {
    title: '财务计算指标表',
    investment: {
      totalInvestment: investment.partG?.合计 || indicators.totalInvestment || 0,
      constructionInvestment: investment.partE?.合计 || 0,
      interestDuringConstruction: investment.partF?.合计 || 0,
      contingency: investment.partD?.合计 || 0
    },
    annualMetrics: {
      revenue: totalRevenue,
      totalCost: totalCost,
      profit: totalRevenue - totalCost,
      tax: indicators.annualTax || 0,
      vat: indicators.annualVAT || 0,
      ebit: indicators.annualEBIT || (totalRevenue - totalCost + (indicators.annualTax || 0))
    },
    profitability: {
      roi: indicators.roi || 0,
      roe: indicators.roe || 0,
      netProfitMargin: totalRevenue > 0 ? ((totalRevenue - totalCost - (indicators.annualTax || 0)) / totalRevenue) * 100 : 0
    },
    liquidity: {
      interestCoverageRatio: indicators.interestCoverageRatio || 0,
      debtServiceCoverageRatio: indicators.debtServiceCoverageRatio || 0
    },
    investmentReturns: {
      firrBeforeTax: indicators.firrBeforeTax || indicators.irr || 0,
      firrAfterTax: indicators.firrAfterTax || indicators.irr || 0,
      npvBeforeTax: indicators.npvBeforeTax || indicators.npv || 0,
      npvAfterTax: indicators.npvAfterTax || indicators.npv || 0,
      paybackPeriodBeforeTax: indicators.paybackPeriodBeforeTax || indicators.paybackPeriod || 0,
      paybackPeriodAfterTax: indicators.paybackPeriodAfterTax || indicators.paybackPeriod || 0
    }
  }
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建借款还本付息计划表 JSON 数据
 */
export function buildLoanRepaymentJSON(loanData: any, context?: any): string {
  if (!loanData) return '{}'
  
  const constructionYears = context?.constructionYears || loanData.partF?.建设期年限 || 2
  const operationYears = context?.operationYears || 10
  const totalYears = constructionYears + operationYears
  
  const jsonData: any = {
    title: '借款还本付息计划表',
    context: {
      constructionYears,
      operationYears,
      totalYears,
      loanAmount: loanData.partF?.贷款总额 || 0,
      annualInterestRate: (loanData.partF?.年利率 || 0) * 100
    },
    yearlyData: [],
    summary: {
      totalInterest: 0,
      totalRepayment: 0
    }
  }
  
  // 解析还款计划数据
  const repaymentSchedule = loanData.loan_repayment_schedule_simple || 
                            loanData.loan_repayment_schedule_detailed ||
                            loanData.construction_interest_details
  
  if (repaymentSchedule) {
    const scheduleData = safeParseJSON(repaymentSchedule)
    if (scheduleData?.rows && Array.isArray(scheduleData.rows)) {
      jsonData.yearlyData = scheduleData.rows.map((row: any) => ({
        序号: row.序号,
        项目: row.项目,
        合计: row.合计,
        建设期: row.建设期 || [],
        运营期: row.运营期 || []
      }))
    }
  } else if (loanData.partF?.分年利息) {
    // 从分年利息构建
    const yearlyInterest = loanData.partF.分年利息 || []
    for (let i = 0; i < totalYears; i++) {
      const isConstruction = i < constructionYears
      jsonData.yearlyData.push({
        年份: i + 1,
        时期: isConstruction ? '建设期' : '运营期',
        当期借款金额: isConstruction ? (yearlyInterest[i]?.当期借款金额 || 0) : 0,
        当期利息: yearlyInterest[i]?.当期利息 || 0,
        当期付息: yearlyInterest[i]?.当期利息 || 0
      })
    }
    
    jsonData.summary.totalInterest = yearlyInterest.reduce(
      (sum: number, item: any) => sum + (item.当期利息 || 0), 0
    )
  }
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建财务评价指标汇总表 JSON 数据
 */
export function buildFinancialSummaryJSON(financialData: any, context?: any): string {
  if (!financialData) return '{}'
  
  const indicators = financialData.financialIndicators || {}
  const investment = financialData.investment || {}
  const revenueCost = financialData.revenueCost || {}
  
  const constructionYears = context?.constructionYears || investment.partF?.建设期年限 || 2
  const operationYears = context?.operationYears || 10
  
  // 计算年均数据
  const revenueItems = safeParseJSON(revenueCost.revenueItems) || []
  const costItems = safeParseJSON(revenueCost.costItems) || []
  
  const totalRevenue = revenueItems.reduce(
    (sum: number, item: any) => sum + (item.annualRevenue || 0), 0
  ) || indicators.totalRevenue || 0
  
  const totalCost = costItems.reduce(
    (sum: number, item: any) => sum + (item.annualCost || 0), 0
  ) || indicators.totalCost || 0
  
  const totalInvestment = investment.partG?.合计 || indicators.totalInvestment || 0
  const equity = indicators.equity || (totalInvestment * 0.3)
  const constructionInvestment = investment.partE?.合计 || 0
  const constructionInterest = investment.partF?.合计 || 0
  const annualTax = indicators.annualTax || 0
  const annualVAT = indicators.annualVAT || 0
  const annualProfit = totalRevenue - totalCost
  const annualEBIT = indicators.annualEBIT || (annualProfit + annualTax + (constructionInterest / constructionYears))
  const annualNetProfit = annualProfit - annualTax
  
  // 计算指标
  const roi = totalInvestment > 0 ? (annualEBIT / totalInvestment) * 100 : 0
  const investmentTaxRate = totalInvestment > 0 ? ((annualEBIT + annualTax + annualVAT) / totalInvestment) * 100 : 0
  const roe = equity > 0 ? (annualNetProfit / equity) * 100 : 0
  
  const jsonData: any = {
    title: '财务评价指标汇总表',
    basicInfo: {
      projectName: financialData.project?.name || '',
      constructionYears,
      operationYears,
      totalInvestment,
      equity,
      debt: totalInvestment - equity
    },
    annualMetrics: {
      revenue: totalRevenue,
      totalCost,
      profit: annualProfit,
      ebit: annualEBIT,
      netProfit: annualNetProfit,
      tax: annualTax,
      vat: annualVAT
    },
    investment: {
      totalInvestment,
      constructionInvestment,
      interestDuringConstruction: constructionInterest,
      equity,
      debt: totalInvestment - equity
    },
    profitability: {
      roi: { value: roi, unit: '%', description: '总投资收益率' },
      investmentTaxRate: { value: investmentTaxRate, unit: '%', description: '投资利税率' },
      roe: { value: roe, unit: '%', description: '项目资本金净利润率' },
      netProfitMargin: { 
        value: totalRevenue > 0 ? (annualNetProfit / totalRevenue) * 100 : 0, 
        unit: '%', 
        description: '净利润率' 
      }
    },
    liquidity: {
      interestCoverageRatio: { 
        value: indicators.interestCoverageRatio || 0, 
        unit: '-', 
        description: '平均利息备付率' 
      },
      debtServiceCoverageRatio: { 
        value: indicators.debtServiceCoverageRatio || 0, 
        unit: '-', 
        description: '平均偿债备付率' 
      }
    },
    investmentReturns: {
      firrBeforeTax: { 
        value: indicators.firrBeforeTax || indicators.irr || 0, 
        unit: '%', 
        description: '财务内部收益率（税前）' 
      },
      firrAfterTax: { 
        value: indicators.firrAfterTax || indicators.irr || 0, 
        unit: '%', 
        description: '财务内部收益率（税后）' 
      },
      npvBeforeTax: { 
        value: indicators.npvBeforeTax || indicators.npv || 0, 
        unit: '万元', 
        description: '财务净现值（税前）' 
      },
      npvAfterTax: { 
        value: indicators.npvAfterTax || indicators.npv || 0, 
        unit: '万元', 
        description: '财务净现值（税后）' 
      },
      paybackPeriodBeforeTax: { 
        value: indicators.paybackPeriodBeforeTax || indicators.paybackPeriod || 0, 
        unit: '年', 
        description: '投资回收期（税前）' 
      },
      paybackPeriodAfterTax: { 
        value: indicators.paybackPeriodAfterTax || indicators.paybackPeriod || 0, 
        unit: '年', 
        description: '投资回收期（税后）' 
      }
    }
  }
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建所有表格数据 JSON
 */
export function buildAllTableDataJSON(projectData: any): Record<string, string> {
  const jsonData: Record<string, string> = {}
  
  // 获取建设期和运营期
  const context = {
    constructionYears: projectData.investment?.partF?.建设期年限 || 
                      projectData.project?.constructionYears || 2,
    operationYears: projectData.project?.operationYears || 10
  }
  
  // 投资估算简表
  jsonData['DATA:investment_estimate'] = buildInvestmentEstimateJSON(projectData.investment)
  
  // 折旧与摊销估算表 - 从 revenueCost.depreciationAmortization 获取数据
  jsonData['DATA:depreciation_amortization'] = buildDepreciationAmortizationJSON(
    projectData.revenueCost || {}
  )
  
  // 营业收入税金及附加估算表
  jsonData['DATA:revenue_tax'] = buildRevenueTaxJSON(
    projectData.revenueTax || projectData.revenueCost
  )
  
  // 外购原材料费估算表
  jsonData['DATA:raw_materials'] = buildRawMaterialsJSON(projectData)
  
  // 外购燃料和动力费估算表
  jsonData['DATA:fuel_power'] = buildFuelPowerJSON(projectData)
  
  // 利润与利润分配表
  jsonData['DATA:profit_distribution'] = buildProfitDistributionJSON(
    projectData.profitDistribution || projectData.profit
  )
  
  // 项目投资现金流量表
  jsonData['DATA:project_cash_flow'] = buildProjectCashFlowJSON(
    projectData.projectCashFlow || projectData.cashFlow
  )
  
  // 财务计算指标表
  jsonData['DATA:financial_indicators'] = buildFinancialIndicatorsJSON(projectData)
  
  // 借款还本付息计划表
  jsonData['DATA:loan_repayment'] = buildLoanRepaymentJSON(projectData.investment, context)
  
  // 财务评价指标汇总表
  jsonData['DATA:financial_summary'] = buildFinancialSummaryJSON(projectData, context)
  
  return jsonData
}
