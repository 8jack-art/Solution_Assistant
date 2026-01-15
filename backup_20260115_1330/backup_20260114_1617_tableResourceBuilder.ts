import { TableResource } from '../types/report'

/**
 * 表格资源构建器
 * 将投资估算、收入成本等数据格式化为 TableResource 格式
 */

/**
 * 辅助函数：格式化数字为保留两位小数的字符串
 * @param value - 要格式化的值
 * @param defaultValue - 如果值为空或无效时返回的默认值
 * @returns 格式化后的字符串
 */
const formatNumber2 = (value: any, defaultValue: string = '0.00'): string => {
  if (value === null || value === undefined || value === '') {
    return defaultValue
  }
  const num = Number(value)
  if (isNaN(num)) {
    return defaultValue
  }
  return num.toFixed(2)
}

/**
 * 辅助函数：格式化百分比为保留两位小数的字符串
 * @param value - 要格式化的值
 * @param total - 总值（用于计算百分比）
 * @returns 格式化后的百分比字符串
 */
const formatPercent = (value: number, total: number): string => {
  if (!total || total === 0) {
    return '0.00%'
  }
  return `${((value / total) * 100).toFixed(2)}%`
}

/**
 * 构建投资估算简表
 * 与Excel导出的12列结构保持一致
 * 
 * 正确的表格结构顺序：
 * 1. A - 第一部分 工程费用（主行，序号'A'）
 * 2. 一/二/三 - 主体/辅助/其它工程（A的子项）
 * 3. B - 第二部分 工程其它费用（主行，序号'B'）
 * 4. 1/2/3... - 建设单位管理费等（B的子项）
 * 5. C - 第一、二部分合计（序号'C'）
 * 6. D - 基本预备费（序号'D'）
 * 7. E - 建设投资（序号'E'）
 * 8. F - 建设期利息（序号'F'）
 * 9. G - 项目总资金（序号'G'）
 */
export function buildInvestmentEstimateTable(estimateData: any, thirdLevelItems: Record<number, any[]> = {}): TableResource | null {
  if (!estimateData) return null

  const tableData: Record<string, any>[] = []
  const totalInvestment = estimateData.partG?.合计 || 0

  // 获取三级子项数据的辅助函数
  const getThirdLevelItems = (parentIndex: number): any[] => {
    return thirdLevelItems[parentIndex] || []
  }

  // 计算A部分各费用合计（用于A主行和C部分）
  const aConstructionTotal = estimateData.partA?.children?.reduce((sum: number, item: any) => sum + (item.建设工程费 || 0), 0) || 0
  const aEquipTotal = estimateData.partA?.children?.reduce((sum: number, item: any) => sum + (item.设备购置费 || 0), 0) || 0
  const aInstallTotal = estimateData.partA?.children?.reduce((sum: number, item: any) => sum + (item.安装工程费 || 0), 0) || 0
  const aOtherTotal = estimateData.partA?.children?.reduce((sum: number, item: any) => sum + (item.其它费用 || 0), 0) || 0

  // 计算B部分其它费用合计（用于B主行和C部分）
  const bOtherTotal = estimateData.partB?.children?.reduce((sum: number, item: any) => sum + (item.其它费用 || item.合计 || 0), 0) || 0

  // === 1. 添加A部分主行（第一部分 工程费用） ===
  if (estimateData.partA) {
    tableData.push({
      序号: 'A',
      工程或费用名称: '第一部分 工程费用',
      '建设工程费（万元）': formatNumber2(aConstructionTotal),
      '设备购置费（万元）': formatNumber2(aEquipTotal),
      '安装工程费（万元）': formatNumber2(aInstallTotal),
      '其它费用（万元）': formatNumber2(aOtherTotal),
      '合计（万元）': formatNumber2(estimateData.partA.合计),
      单位: '',
      数量: '',
      '单位价值（元）': '',
      占总投资比例: formatPercent(estimateData.partA.合计 || 0, totalInvestment),
      备注: estimateData.partA.备注 || ''
    })
  }

  // === 2. 添加A部分子项（一、二、三） ===
  if (estimateData.partA?.children && Array.isArray(estimateData.partA.children)) {
    estimateData.partA.children.forEach((item: any, parentIndex: number) => {
      // 添加二级子项
      tableData.push({
        序号: item.序号 || `${parentIndex + 1}`,
        工程或费用名称: item.工程或费用名称 || '',
        '建设工程费（万元）': formatNumber2(item['建设工程费（万元）'] || item.建设工程费),
        '设备购置费（万元）': formatNumber2(item['设备购置费（万元）'] || item.设备购置费),
        '安装工程费（万元）': formatNumber2(item['安装工程费（万元）'] || item.安装工程费),
        '其它费用（万元）': formatNumber2(item['其它费用（万元）'] || item.其它费用),
        '合计（万元）': formatNumber2(item['合计（万元）'] || item.合计),
        单位: '',
        数量: '',
        '单位价值（元）': '',
        占总投资比例: formatPercent(item.合计 || 0, totalInvestment),
        备注: item.备注 || ''
      })

      // 添加三级子项（如果有）
      const thirdItems = getThirdLevelItems(parentIndex)
      if (thirdItems && thirdItems.length > 0) {
        thirdItems.forEach((subItem: any, subIndex: number) => {
          const totalPrice = (subItem.quantity * subItem.unit_price) / 10000
          const constructionCost = totalPrice * (subItem.construction_ratio || 0)
          const equipmentCost = totalPrice * (subItem.equipment_ratio || 0)
          const installationCost = totalPrice * (subItem.installation_ratio || 0)
          const otherCost = totalPrice * (subItem.other_ratio || 0)

          tableData.push({
            序号: subIndex + 1,
            工程或费用名称: subItem.name || '',
            '建设工程费（万元）': constructionCost > 0 ? formatNumber2(constructionCost) : '',
            '设备购置费（万元）': equipmentCost > 0 ? formatNumber2(equipmentCost) : '',
            '安装工程费（万元）': installationCost > 0 ? formatNumber2(installationCost) : '',
            '其它费用（万元）': otherCost > 0 ? formatNumber2(otherCost) : '',
            '合计（万元）': totalPrice > 0 ? formatNumber2(totalPrice) : '',
            单位: subItem.unit || '',
            数量: subItem.quantity > 0 ? formatNumber2(subItem.quantity) : '',
            '单位价值（元）': subItem.unit_price > 0 ? formatNumber2(subItem.unit_price) : '',
            占总投资比例: formatPercent(totalPrice, totalInvestment),
            备注: ''
          })
        })
      }
    })
  }

  // === 3. 添加B部分主行（第二部分 工程其它费用） ===
  if (estimateData.partB) {
    tableData.push({
      序号: 'B',
      工程或费用名称: '第二部分 工程其它费用',
      '建设工程费（万元）': '0.00',
      '设备购置费（万元）': '0.00',
      '安装工程费（万元）': '0.00',
      '其它费用（万元）': formatNumber2(bOtherTotal),
      '合计（万元）': formatNumber2(estimateData.partB.合计),
      单位: '',
      数量: '',
      '单位价值（元）': '',
      占总投资比例: formatPercent(estimateData.partB.合计 || 0, totalInvestment),
      备注: estimateData.partB.备注 || ''
    })
  }

  // === 4. 添加B部分子项（1、2、3...） ===
  if (estimateData.partB?.children && Array.isArray(estimateData.partB.children)) {
    estimateData.partB.children.forEach((item: any) => {
      tableData.push({
        序号: item.序号 || '',
        工程或费用名称: item.工程或费用名称 || '',
        '建设工程费（万元）': '',
        '设备购置费（万元）': '',
        '安装工程费（万元）': '',
        '其它费用（万元）': formatNumber2(item['其它费用（万元）'] || item.其它费用 || item.合计),
        '合计（万元）': formatNumber2(item['合计（万元）'] || item.合计),
        单位: '',
        数量: '',
        '单位价值（元）': '',
        占总投资比例: formatPercent(item.合计 || 0, totalInvestment),
        备注: item.备注 || ''
      })
    })
  }

  // === 5. 添加C部分（第一、二部分合计） ===
  if (estimateData.partC) {
    tableData.push({
      序号: 'C',
      工程或费用名称: '第一、二部分合计',
      '建设工程费（万元）': formatNumber2(aConstructionTotal),
      '设备购置费（万元）': formatNumber2(aEquipTotal),
      '安装工程费（万元）': formatNumber2(aInstallTotal),
      '其它费用（万元）': formatNumber2(aOtherTotal + bOtherTotal),
      '合计（万元）': formatNumber2(estimateData.partC.合计),
      单位: '',
      数量: '',
      '单位价值（元）': '',
      占总投资比例: formatPercent(estimateData.partC.合计 || 0, totalInvestment),
      备注: estimateData.partC.备注 || 'C=A+B'
    })
  }

  // === 6. 添加D部分（基本预备费） ===
  if (estimateData.partD) {
    tableData.push({
      序号: 'D',
      工程或费用名称: '基本预备费',
      '建设工程费（万元）': '',
      '设备购置费（万元）': '',
      '安装工程费（万元）': '',
      '其它费用（万元）': '',
      '合计（万元）': formatNumber2(estimateData.partD.合计),
      单位: '',
      数量: '',
      '单位价值（元）': '',
      占总投资比例: formatPercent(estimateData.partD.合计 || 0, totalInvestment),
      备注: estimateData.partD.备注 || '按(A+B)×8%'
    })
  }

  // === 7. 添加E部分（建设投资） ===
  if (estimateData.partE) {
    tableData.push({
      序号: 'E',
      工程或费用名称: '建设投资',
      '建设工程费（万元）': '',
      '设备购置费（万元）': '',
      '安装工程费（万元）': '',
      '其它费用（万元）': '',
      '合计（万元）': formatNumber2(estimateData.partE.合计),
      单位: '',
      数量: '',
      '单位价值（元）': '',
      占总投资比例: formatPercent(estimateData.partE.合计 || 0, totalInvestment),
      备注: estimateData.partE.备注 || 'E=C+D'
    })
  }

  // === 8. 添加F部分（建设期利息详细信息） ===
  if (estimateData.partF) {
    const loanAmount = Number(estimateData.partF.贷款总额 || 0)
    const loanDetails = [
      `贷款总额: ${formatNumber2(loanAmount)}万元 (占总投资${formatPercent(loanAmount, totalInvestment)})`,
      `年利率: ${((estimateData.partF.年利率 || 0) * 100).toFixed(1)}%`,
      `建设期: ${estimateData.partF.建设期年限 || 0}年`
    ].join('; ')

    tableData.push({
      序号: 'F',
      工程或费用名称: '建设期利息',
      '建设工程费（万元）': '',
      '设备购置费（万元）': '',
      '安装工程费（万元）': '',
      '其它费用（万元）': '',
      '合计（万元）': formatNumber2(estimateData.partF.合计),
      单位: '',
      数量: '',
      '单位价值（元）': '',
      占总投资比例: formatPercent(estimateData.partF.合计 || 0, totalInvestment),
      备注: loanDetails
    })
  }

  // === 9. 添加G部分（项目总资金） ===
  if (estimateData.partG) {
    tableData.push({
      序号: 'G',
      工程或费用名称: estimateData.partG.工程或费用名称 || '项目总资金',
      '建设工程费（万元）': '',
      '设备购置费（万元）': '',
      '安装工程费（万元）': '',
      '其它费用（万元）': '',
      '合计（万元）': formatNumber2(estimateData.partG.合计),
      单位: '',
      数量: '',
      '单位价值（元）': '',
      占总投资比例: '100.00%',
      备注: estimateData.partG.备注 || 'G=E+F'
    })
  }

  return {
    id: 'investment_estimate',
    title: '投资估算简表',
    columns: [
      '序号', '工程或费用名称',
      '建设工程费（万元）', '设备购置费（万元）', '安装工程费（万元）', '其它费用（万元）', '合计（万元）',
      '单位', '数量', '单位价值（元）',
      '占总投资比例', '备注'
    ],
    data: tableData,
    style: {
      headerBg: 'F7F8FA',
      stripe: true,
      align: 'center'
    }
  }
}

/**
 * 构建营业收入、营业税金及附加和增值税估算表
 * 返回 TableResource 格式，包含 parameters 和 rows 两个部分
 */
export function buildRevenueTaxTable(revenueCostData: any): TableResource | null {
  if (!revenueCostData) return null

  // 辅助函数：安全解析JSON
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

  // 获取运营期年份数
  const operationYears = 10 // 默认10年
  const years = Array.from({ length: operationYears }, (_, i) => i + 1)

  // 解析渲染后的表格数据
  const revenueTableData = safeParseJSON(revenueCostData.revenueTableData)
  const rows = revenueTableData?.rows || []

  // 构建表格数据
  const tableData: Record<string, any>[] = rows.map((row: any) => {
    const rowData: Record<string, any> = {
      序号: row.序号 || '',
    }
    
    // 添加合计列
    if (row.合计 !== undefined) {
      rowData.合计 = formatNumber2(row.合计)
    }
    
    // 添加运营期各年数据
    if (row.运营期 && Array.isArray(row.运营期)) {
      row.运营期.forEach((value: number, idx: number) => {
        if (idx < years.length) {
          rowData[years[idx].toString()] = formatNumber2(value)
        }
      })
    }
    
    return rowData
  })

  // 构建列名
  const columns: string[] = ['序号', '合计']
  years.forEach((year) => {
    columns.push(year.toString())
  })

  return {
    id: 'revenue_tax',
    title: '营业收入、营业税金及附加和增值税估算表',
    columns: columns,
    data: tableData,
    style: {
      headerBg: 'F7F8FA',
      stripe: true,
      align: 'center'
    }
  }
}

/**
 * 构建收入成本明细表
 */
export function buildRevenueCostTable(revenueCostData: any): TableResource | null {
  if (!revenueCostData) return null

  const tableData: Record<string, any>[] = []

  // 收入项目
  if (revenueCostData.revenueItems && Array.isArray(revenueCostData.revenueItems)) {
    const totalRevenue = revenueCostData.revenueItems.reduce((sum: number, item: any) => sum + (item.annualRevenue || 0), 0)
    
    revenueCostData.revenueItems.forEach((item: any, index: number) => {
      tableData.push({
        序号: index + 1,
        类型: '收入',
        名称: item.name || '',
        单价: (item.price || 0).toFixed(2),
        数量: item.quantity || 0,
        单位: item.unit || '',
        年收入: (item.annualRevenue || 0).toFixed(2),
        占收入比例: totalRevenue > 0 ? `${((item.annualRevenue / totalRevenue) * 100).toFixed(2)}%` : '0%'
      })
    })

    // 收入合计
    tableData.push({
      序号: '',
      类型: '收入合计',
      名称: '',
      单价: '',
      数量: '',
      单位: '',
      年收入: totalRevenue.toFixed(2),
      占收入比例: '100.00%'
    })
  }

  // 成本项目
  if (revenueCostData.costItems && Array.isArray(revenueCostData.costItems)) {
    const totalCost = revenueCostData.costItems.reduce((sum: number, item: any) => sum + (item.annualCost || 0), 0)

    revenueCostData.costItems.forEach((item: any, index: number) => {
      tableData.push({
        序号: index + 1,
        类型: '成本',
        名称: item.name || '',
        单价: (item.unitCost || 0).toFixed(2),
        数量: item.quantity || 0,
        单位: item.unit || '',
        年成本: (item.annualCost || 0).toFixed(2),
        占成本比例: totalCost > 0 ? `${((item.annualCost / totalCost) * 100).toFixed(2)}%` : '0%'
      })
    })

    // 成本合计
    tableData.push({
      序号: '',
      类型: '成本合计',
      名称: '',
      单价: '',
      数量: '',
      单位: '',
      年成本: totalCost.toFixed(2),
      占成本比例: '100.00%'
    })
  }

  return {
    id: 'revenue_cost_detail',
    title: '收入成本明细表',
    columns: ['序号', '类型', '名称', '单价', '数量', '单位', '年收入/成本', '占比'],
    data: tableData,
    style: {
      headerBg: 'EEEEEE',
      stripe: true,
      align: 'center'
    }
  }
}

/**
 * 构建财务指标汇总表
 * 与用户提供的格式一致，包含18个指标项
 */
export function buildFinancialIndicatorsTable(financialData: any): TableResource | null {
  if (!financialData) return null

  const indicators = financialData.financialIndicators || {}
  const estimateData = financialData.investment || {}
  const revenueCost = financialData.revenueCost || {}
  
  // 计算年收入和年成本（用于年均指标）
  const totalRevenue = revenueCost.revenueItems?.reduce((sum: number, item: any) => sum + (item.annualRevenue || 0), 0) || 0
  const totalCost = revenueCost.costItems?.reduce((sum: number, item: any) => sum + (item.annualCost || 0), 0) || 0
  const annualProfit = totalRevenue - totalCost
  
  // 获取总投资（从投资估算表）
  const totalInvestment = estimateData.partG?.合计 || indicators.totalInvestment || 0
  
  // 获取建设投资
  const constructionInvestment = estimateData.partE?.合计 || 0
  
  // 获取建设期利息
  const constructionInterest = estimateData.partF?.合计 || 0
  
  // 获取年均销售税金及附加和年均增值税
  const annualTax = indicators.annualTax || 0
  const annualVAT = indicators.annualVAT || 0
  
  // 计算年均息税前利润（EBIT）
  const annualEBIT = indicators.annualEBIT || (annualProfit + annualTax + (constructionInterest / (estimateData.partF?.建设期年限 || 2)))
  
  // 计算年均利润总额
  const annualProfitTotal = annualProfit
  
  // 计算年均所得税
  const annualIncomeTax = annualTax
  
  // 计算年均净利润
  const annualNetProfit = annualProfit - annualIncomeTax
  
  // 计算总投资收益率 (ROI) = 年均息税前利润 / 总投资 × 100%
  const roi = totalInvestment > 0 ? (annualEBIT / totalInvestment) * 100 : 0
  
  // 计算投资利税率 = (年均息税前利润 + 年均销售税金及附加 + 年均增值税) / 总投资 × 100%
  const investmentTaxRate = totalInvestment > 0 ? ((annualEBIT + annualTax + annualVAT) / totalInvestment) * 100 : 0
  
  // 计算项目资本金净利润率 (ROE) = 年均净利润 / 项目资本金 × 100%
  const equity = indicators.equity || (totalInvestment * 0.3) // 假设项目资本金占30%
  const roe = equity > 0 ? (annualNetProfit / equity) * 100 : 0
  
  // 平均利息备付率 = 年均息税前利润 / 年均利息支出
  const interestCoverageRatio = indicators.interestCoverageRatio || 0
  
  // 平均偿债备付率 = (年均息税前利润 + 年均折旧摊销 - 年均所得税) / 年均还本付息额
  const debtServiceCoverageRatio = indicators.debtServiceCoverageRatio || 0
  
  // 财务内部收益率 (FIRR) - 税前
  const firrBeforeTax = indicators.firrBeforeTax || indicators.irr || 0
  
  // 财务内部收益率 (FIRR) - 税后
  const firrAfterTax = indicators.firrAfterTax || indicators.irr || 0
  
  // 项目投资财务净现值 (Ic=6%) - 税前
  const npvBeforeTax = indicators.npvBeforeTax || indicators.npv || 0
  
  // 项目投资财务净现值 (Ic=6%) - 税后
  const npvAfterTax = indicators.npvAfterTax || indicators.npv || 0
  
  // 全部投资回收期 - 税前
  const paybackPeriodBeforeTax = indicators.paybackPeriodBeforeTax || indicators.paybackPeriod || 0
  
  // 全部投资回收期 - 税后
  const paybackPeriodAfterTax = indicators.paybackPeriodAfterTax || indicators.paybackPeriod || 0
  
  // 资本金内部收益率
  const equityIRR = indicators.equityIRR || indicators.irr || 0
  
  // 格式化数值为保留两位小数
  const formatVal = (val: any, decimals: number = 2): string => {
    if (val === null || val === undefined || val === '') return ''
    const num = Number(val)
    if (isNaN(num)) return ''
    return num === 0 ? '' : num.toFixed(decimals)
  }

  const tableData: Record<string, any>[] = [
    // 1 项目总投资
    { 序号: '1', 项目名称: '项目总投资', 单位: '万元', 数值: formatVal(totalInvestment) },
    { 序号: '1.1', 项目名称: '建设投资', 单位: '万元', 数值: formatVal(constructionInvestment) },
    { 序号: '1.2', 项目名称: '建设期利息', 单位: '万元', 数值: formatVal(constructionInterest) },
    // 2 资金筹措
    { 序号: '2', 项目名称: '资金筹措', 单位: '万元', 数值: formatVal(totalInvestment) },
    { 序号: '2.1', 项目名称: '项目资本金', 单位: '万元', 数值: formatVal(equity) },
    { 序号: '2.2', 项目名称: '项目债务资金', 单位: '万元', 数值: formatVal(totalInvestment - equity) },
    // 3 年均销售收入
    { 序号: '3', 项目名称: '年均销售收入', 单位: '万元', 数值: formatVal(totalRevenue) },
    // 4 年均总成本费用
    { 序号: '4', 项目名称: '年均总成本费用', 单位: '万元', 数值: formatVal(totalCost) },
    // 5 年均销售税金及附加
    { 序号: '5', 项目名称: '年均销售税金及附加', 单位: '万元', 数值: formatVal(annualTax) },
    // 6 年均增值税
    { 序号: '6', 项目名称: '年均增值税', 单位: '万元', 数值: formatVal(annualVAT) },
    // 7 年均息税前利润（EBIT）
    { 序号: '7', 项目名称: '年均息税前利润（EBIT）', 单位: '万元', 数值: formatVal(annualEBIT) },
    // 8 年均利润总额
    { 序号: '8', 项目名称: '年均利润总额', 单位: '万元', 数值: formatVal(annualProfitTotal) },
    // 9 年均所得税
    { 序号: '9', 项目名称: '年均所得税', 单位: '万元', 数值: formatVal(annualIncomeTax) },
    // 10 年均净利润
    { 序号: '10', 项目名称: '年均净利润', 单位: '万元', 数值: formatVal(annualNetProfit) },
    // 11 总投资收益率
    { 序号: '11', 项目名称: '总投资收益率', 单位: '％', 数值: formatVal(roi) },
    // 12 投资利税率
    { 序号: '12', 项目名称: '投资利税率', 单位: '％', 数值: formatVal(investmentTaxRate) },
    // 13 项目资本金净利润率
    { 序号: '13', 项目名称: '项目资本金净利润率', 单位: '％', 数值: formatVal(roe) },
    // 14 平均利息备付率
    { 序号: '14', 项目名称: '平均利息备付率', 单位: '-', 数值: formatVal(interestCoverageRatio) },
    // 15 平均偿债备付率
    { 序号: '15', 项目名称: '平均偿债备付率', 单位: '-', 数值: formatVal(debtServiceCoverageRatio) },
    // 16 项目投资税前指标
    { 序号: '16', 项目名称: '项目投资税前指标', 单位: '', 数值: '' },
    { 序号: '16.1', 项目名称: '财务内部收益率', 单位: '％', 数值: formatVal(firrBeforeTax) },
    { 序号: '16.2', 项目名称: '项目投资财务净现值（Ic=6％）', 单位: '万元', 数值: formatVal(npvBeforeTax) },
    { 序号: '16.3', 项目名称: '全部投资回收期', 单位: '年', 数值: formatVal(paybackPeriodBeforeTax) },
    // 17 项目投资税后指标
    { 序号: '17', 项目名称: '项目投资税后指标', 单位: '', 数值: '' },
    { 序号: '17.1', 项目名称: '财务内部收益率', 单位: '％', 数值: formatVal(firrAfterTax) },
    { 序号: '17.2', 项目名称: '项目投资财务净现值（Ic=6％）', 单位: '万元', 数值: formatVal(npvAfterTax) },
    { 序号: '17.3', 项目名称: '全部投资回收期', 单位: '年', 数值: formatVal(paybackPeriodAfterTax) },
    // 18 资本金内部收益率
    { 序号: '18', 项目名称: '资本金内部收益率', 单位: '％', 数值: formatVal(equityIRR) }
  ]

  return {
    id: 'financial_indicators',
    title: '财务指标汇总表',
    columns: ['序号', '项目名称', '单位', '数值'],
    data: tableData,
    style: {
      headerBg: 'F7F8FA',
      stripe: true,
      align: 'center'
    }
  }
}

/**
 * 构建还款计划表
 * 与借款还本付息计划表格式一致
 * 列结构：序号、项目、合计、建设期(1,2...)、运营期(1,2...)
 */
export function buildLoanRepaymentTable(loanData: any, context?: any): TableResource | null {
  if (!loanData) return null

  // 获取建设期和运营期年限
  let constructionYears = 2
  let operationYears = 10
  
  // 1. 首先尝试从 context 获取
  if (context) {
    constructionYears = context.constructionYears || constructionYears
    operationYears = context.operationYears || operationYears
  }
  
  // 2. 尝试从 loanData.partF 获取建设期年限
  if (loanData?.partF?.建设期年限) {
    constructionYears = loanData.partF.建设期年限
  }

  // 从 construction_interest_details 或 loan_repayment_schedule 获取数据
  const repaymentSchedule = loanData.loan_repayment_schedule_simple || loanData.loan_repayment_schedule_detailed || loanData.construction_interest_details
  
  // 解析已保存的数据
  let savedData: any = null
  if (repaymentSchedule) {
    if (typeof repaymentSchedule === 'string') {
      try {
        savedData = JSON.parse(repaymentSchedule)
      } catch (e) {
        console.warn('解析还款计划数据失败:', e)
      }
    } else {
      savedData = repaymentSchedule
    }
  }

  // 格式化数值为两位小数
  const formatVal = (val: any): string => {
    if (val === null || val === undefined || val === '') return ''
    const num = Number(val)
    if (isNaN(num)) return String(val)
    return num === 0 ? '' : num.toFixed(2)
  }

  // 计算合计值
  const calculateTotal = (values: any[]): number => {
    if (!values || !Array.isArray(values)) return 0
    return values.reduce((sum, val) => sum + (Number(val) || 0), 0)
  }

  const tableData: Record<string, any>[] = []

  // 如果有保存的数据，直接使用
  if (savedData?.rows && Array.isArray(savedData.rows)) {
    savedData.rows.forEach((row: any) => {
      const rowData: Record<string, any> = {
        序号: row.序号 || '',
        项目: row.项目 || '',
        合计: row.合计 !== null && row.合计 !== undefined ? formatVal(row.合计) : ''
      }
      
      // 填充建设期和运营期数据（使用连续年份编号）
      const totalYears = constructionYears + operationYears
      const allPeriod = Array(totalYears).fill('')
      
      // 填充建设期数据
      if (row.建设期 && Array.isArray(row.建设期)) {
        row.建设期.forEach((val: any, idx: number) => {
          allPeriod[idx] = formatVal(val)
        })
      }
      
      // 填充运营期数据
      if (row.运营期 && Array.isArray(row.运营期)) {
        row.运营期.forEach((val: any, idx: number) => {
          allPeriod[constructionYears + idx] = formatVal(val)
        })
      }
      
      // 添加到行数据
      allPeriod.forEach((val: any, idx: number) => {
        rowData[`${idx + 1}`] = val
      })
      
      tableData.push(rowData)
    })
  } else {
    // 如果没有保存的数据，从 partF 构建数据
    const yearlyInterestData = loanData.partF?.分年利息 || []
    
    // 计算建设期各年数据
    const calculateEndOfYearBalance = (yearIndex: number): number => {
      let balance = 0
      for (let i = 0; i <= yearIndex; i++) {
        if (yearlyInterestData[i]) {
          balance += yearlyInterestData[i].当期借款金额 || 0
        }
      }
      return balance
    }

    const constructionBeginningBalance = Array(constructionYears).fill(0).map((_, index) => {
      if (index === 0) return 0
      return calculateEndOfYearBalance(index - 1)
    })
    
    const constructionInterest = Array(constructionYears).fill(0).map((_, index) => {
      return yearlyInterestData[index]?.当期利息 || 0
    })
    
    const constructionEndingBalance = Array(constructionYears).fill(0).map((_, index) => {
      return calculateEndOfYearBalance(index)
    })
    
    const constructionRepayment = Array(constructionYears).fill(0).map((_, index) => {
      return yearlyInterestData[index]?.当期利息 || 0
    })
    
    const constructionPrincipalRepayment = Array(constructionYears).fill(0)
    const constructionInterestPayment = Array(constructionYears).fill(0).map((_, index) => {
      return yearlyInterestData[index]?.当期利息 || 0
    })

    // 总年限
    const totalYears = constructionYears + operationYears
    
    // 构建空数据数组（用于填充运营期为空的情况）
    const emptyConstruction = Array(constructionYears).fill('')
    const emptyOperation = Array(operationYears).fill('')
    const emptyAllPeriod = Array(totalYears).fill('')

    // 辅助函数：创建带有连续年份编号的行数据
    const createRowWithContinuousYears = (baseData: Record<string, any>, constructionData: any[], operationData: any[]) => {
      const allPeriod = Array(totalYears).fill('')
      // 填充建设期数据
      constructionData.forEach((val, idx) => {
        allPeriod[idx] = formatVal(val)
      })
      // 填充运营期数据
      operationData.forEach((val, idx) => {
        allPeriod[constructionYears + idx] = formatVal(val)
      })
      
      const rowData = { ...baseData }
      allPeriod.forEach((val, idx) => {
        rowData[`${idx + 1}`] = val
      })
      return rowData
    }

    // 辅助函数：创建空行（所有年份列为空）
    const createEmptyRow = (baseData: Record<string, any>) => {
      const rowData = { ...baseData }
      for (let i = 1; i <= totalYears; i++) {
        rowData[`${i}`] = ''
      }
      return rowData
    }

    // 1 借款还本付息计划（分类标题行）
    tableData.push(createEmptyRow({
      序号: '1',
      项目: '借款还本付息计划',
      合计: ''
    }))

    // 1.1 期初借款余额
    tableData.push(createRowWithContinuousYears({
      序号: '1.1',
      项目: '期初借款余额',
      合计: ''
    }, constructionBeginningBalance, emptyOperation))

    // 1.2 当期还本付息
    const repaymentTotal = calculateTotal(constructionRepayment)
    tableData.push(createRowWithContinuousYears({
      序号: '1.2',
      项目: '当期还本付息',
      合计: formatVal(repaymentTotal)
    }, constructionRepayment, emptyOperation))

    // 其中：还本
    tableData.push(createRowWithContinuousYears({
      序号: '',
      项目: '其中：还本',
      合计: ''
    }, constructionPrincipalRepayment, emptyOperation))

    // 付息
    const interestTotal = calculateTotal(constructionInterestPayment)
    tableData.push(createRowWithContinuousYears({
      序号: '',
      项目: '付息',
      合计: formatVal(interestTotal)
    }, constructionInterestPayment, emptyOperation))

    // 1.3 期末借款余额
    tableData.push(createRowWithContinuousYears({
      序号: '1.3',
      项目: '期末借款余额',
      合计: ''
    }, constructionEndingBalance, emptyOperation))

    // 2 还本付息资金来源（分类标题行）
    tableData.push(createEmptyRow({
      序号: '2',
      项目: '还本付息资金来源',
      合计: ''
    }))

    // 2.1 折旧摊销费
    tableData.push(createRowWithContinuousYears({
      序号: '2.1',
      项目: '折旧摊销费',
      合计: ''
    }, emptyConstruction, emptyOperation))

    // 2.2 所得税
    tableData.push(createRowWithContinuousYears({
      序号: '2.2',
      项目: '所得税',
      合计: ''
    }, emptyConstruction, emptyOperation))

    // 2.3 息税前利润
    tableData.push(createRowWithContinuousYears({
      序号: '2.3',
      项目: '息税前利润',
      合计: ''
    }, emptyConstruction, emptyOperation))

    // 2.4 其他还利息资金
    tableData.push(createRowWithContinuousYears({
      序号: '2.4',
      项目: '其他还利息资金',
      合计: ''
    }, emptyConstruction, emptyOperation))

    // 3 计算指标（分类标题行）
    tableData.push(createEmptyRow({
      序号: '3',
      项目: '计算指标',
      合计: ''
    }))

    // 3.1 息税折旧摊销前利润
    tableData.push(createRowWithContinuousYears({
      序号: '3.1',
      项目: '息税折旧摊销前利润',
      合计: ''
    }, emptyConstruction, emptyOperation))

    // 3.2 还利息
    tableData.push(createRowWithContinuousYears({
      序号: '3.2',
      项目: '还利息',
      合计: ''
    }, emptyConstruction, emptyOperation))

    // 3.3 还本金
    tableData.push(createRowWithContinuousYears({
      序号: '3.3',
      项目: '还本金',
      合计: ''
    }, emptyConstruction, emptyOperation))

    // 3.4 利息备付率（建设期显示"-"，运营期为空）
    const interestCoverageRow: Record<string, any> = {
      序号: '3.4',
      项目: '利息备付率',
      合计: ''
    }
    for (let i = 1; i <= totalYears; i++) {
      interestCoverageRow[`${i}`] = i <= constructionYears ? '-' : ''
    }
    tableData.push(interestCoverageRow)

    // 3.5 偿债备付率（建设期显示"-"，运营期为空）
    const debtServiceCoverageRow: Record<string, any> = {
      序号: '3.5',
      项目: '偿债备付率',
      合计: ''
    }
    for (let i = 1; i <= totalYears; i++) {
      debtServiceCoverageRow[`${i}`] = i <= constructionYears ? '-' : ''
    }
    tableData.push(debtServiceCoverageRow)
  }

  // 构建列名 - 修正为连续年份编号格式
  const columns: string[] = ['序号', '项目', '合计']
  // 添加所有年份列（1, 2, 3...直到总年限）
  const totalYears = constructionYears + operationYears
  for (let i = 1; i <= totalYears; i++) {
    columns.push(`${i}`)
  }

  return {
    id: 'loan_repayment',
    title: '借款还本付息计划表',
    columns: columns,
    data: tableData,
    style: {
      headerBg: 'F7F8FA',
      stripe: true,
      align: 'center'
    }
  }
}

/**
 * 根据项目数据构建所有表格资源
 */
export function buildAllTableResources(projectData: any): Record<string, TableResource> {
  const tables: Record<string, TableResource> = {}

  // 投资估算表格（支持传递thirdLevelItems）
  const thirdLevelItems = projectData.investment?.thirdLevelItems || {}
  const investmentTable = buildInvestmentEstimateTable(projectData.investment, thirdLevelItems)
  if (investmentTable) {
    tables[investmentTable.id] = investmentTable
  }

  // 营业收入、营业税金及附加和增值税估算表
  const revenueTaxTable = buildRevenueTaxTable(projectData.revenueCost)
  if (revenueTaxTable) {
    tables[revenueTaxTable.id] = revenueTaxTable
  }

  // 收入成本表格
  const revenueCostTable = buildRevenueCostTable(projectData.revenueCost)
  if (revenueCostTable) {
    tables[revenueCostTable.id] = revenueCostTable
  }

  // 财务指标表格
  const financialTable = buildFinancialIndicatorsTable(projectData)
  if (financialTable) {
    tables[financialTable.id] = financialTable
  }

  // 还款计划表格（传递 context 以获取建设期和运营期年限）
  const loanTable = buildLoanRepaymentTable(projectData.investment, projectData.context)
  if (loanTable) {
    tables[loanTable.id] = loanTable
  }

  return tables
}

/**
 * 构建投资估算简表JSON数据（用于LLM提示词）
 * 支持传递thirdLevelItems参数
 */
export function buildInvestmentEstimateJSON(estimateData: any, thirdLevelItems?: Record<number, any[]>): string {
  if (!estimateData) return '{}'
  
  // 获取三级子项数据
  const thirdLevel = thirdLevelItems || estimateData.thirdLevelItems || {}
  
  const jsonData: any = {
    title: '投资估算简表',
    summary: {
      totalInvestment: estimateData.partG?.合计 || 0,
      constructionInvestment: estimateData.partE?.合计 || 0,
      interestDuringConstruction: estimateData.partF?.合计 || 0,
      预备费: estimateData.partD?.合计 || 0
    },
    partA: {
      name: '第一部分 工程费用',
      total: estimateData.partA?.合计 || 0,
      children: []
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
    }
  }
  
  // 构建partA的children，包含三级子项
  if (estimateData.partA?.children && Array.isArray(estimateData.partA.children)) {
    jsonData.partA.children = estimateData.partA.children.map((item: any, parentIndex: number) => {
      // 获取三级子项
      const thirdItems = thirdLevel[parentIndex] || []
      
      // 构建基础对象
      const baseItem: any = {
        序号: item.序号,
        工程或费用名称: item.工程或费用名称,
        建设工程费: item['建设工程费（万元）'] || item.建设工程费 || 0,
        设备购置费: item['设备购置费（万元）'] || item.设备购置费 || 0,
        安装工程费: item['安装工程费（万元）'] || item.安装工程费 || 0,
        其它费用: item['其它费用（万元）'] || item.其它费用 || 0,
        合计: item['合计（万元）'] || item.合计 || 0
      }
      
      // 只有当存在三级子项时才添加children字段
      if (thirdItems.length > 0) {
        baseItem.children = thirdItems.map((subItem: any, subIndex: number) => {
          const totalPrice = (subItem.quantity * subItem.unit_price) / 10000
          const constructionCost = totalPrice * (subItem.construction_ratio || 0)
          const equipmentCost = totalPrice * (subItem.equipment_ratio || 0)
          const installationCost = totalPrice * (subItem.installation_ratio || 0)
          const otherCost = totalPrice * (subItem.other_ratio || 0)
          
          return {
            序号: subIndex + 1,
            名称: subItem.name || '',
            单位: subItem.unit || '',
            数量: subItem.quantity || 0,
            单价: subItem.unit_price || 0,
            单价万元: (subItem.unit_price || 0) / 10000,
            工程总价: totalPrice,
            建设工程费: constructionCost,
            设备购置费: equipmentCost,
            安装工程费: installationCost,
            其它费用: otherCost,
            占总价比例: subItem.construction_ratio 
              ? `${(subItem.construction_ratio * 100).toFixed(1)}%` : ''
          }
        })
      }
      
      return baseItem
    })
  }
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建折旧与摊销估算表JSON数据（用于LLM提示词）
 * 数据来源：projectData.revenueCost.depreciationAmortization
 * 结构为: { 
 *   A_depreciation: number[], 
 *   D_depreciation: number[], 
 *   E_amortization: number[],
 *   A: { 原值, 年折旧额, 折旧年限, 残值率 },
 *   D: { 原值, 年折旧额, 折旧年限, 残值率 },
 *   E: { 原值, 年摊销额, 摊销年限, 残值率 }
 * }
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
 * 构建营业收入、税金及附加估算表JSON数据（用于LLM提示词）
 * 
 * 返回结构包含：
 * - parameters: 营业收入配置表格数据（序号、收入项名称、模板、参数值）
 * - rows: 渲染后的表格数据（序号、合计、运营期）
 */
export function buildRevenueTaxJSON(revenueTaxData: any, context?: any): string {
  if (!revenueTaxData) return '{}'
  
  const jsonData: any = {
    title: '营业收入、营业税金及附加和增值税估算表',
    urbanTaxRate: revenueTaxData.urbanTaxRate || 0.07,
    parameters: [],
    rows: [],
    updatedAt: revenueTaxData.updatedAt || new Date().toISOString()
  }
  
  // 辅助函数：安全解析JSON
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
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建外购原材料费估算表JSON数据（用于LLM提示词）
 * 返回结构与 buildRevenueTaxJSON 一致：包含 parameters（参数配置）和 rows（渲染数据）
 */
export function buildRawMaterialsJSON(rawMaterialsData: any, context?: any): string {
  if (!rawMaterialsData) return '{}'
  
  const jsonData: any = {
    title: '外购原材料费估算表',
    parameters: [],
    rows: [],
    summary: {
      totalCost: 0
    },
    updatedAt: new Date().toISOString()
  }
  
  // 1. 构建 parameters - 从原始配置获取材料参数
  if (rawMaterialsData.raw_materials) {
    let items = rawMaterialsData.raw_materials
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items)
      } catch (e) {
        items = []
      }
    }
    
    jsonData.parameters = (Array.isArray(items) ? items : []).map((item: any) => ({
      序号: item.序号 || item.index,
      材料名称: item.name || item.材料名称 || '',
      单位: item.unit || item.单位 || '',
      单价: item.unitPrice || item.单价 || 0,
      年用量: item.annualQuantity || item.年用量 || 0,
      年费用: item.annualCost || item.年费用 || 0
    }))
  }
  
  // 2. 构建 rows - 从 costTableData 获取渲染后的表格数据
  const costTableData = rawMaterialsData.costTableData
  if (costTableData) {
    let tableData = costTableData
    if (typeof costTableData === 'string') {
      try {
        tableData = JSON.parse(costTableData)
      } catch (e) {
        tableData = null
      }
    }
    
    if (tableData?.rows && Array.isArray(tableData.rows)) {
      // 查找"外购原材料费"行
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
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建外购燃料和动力费估算表JSON数据（用于LLM提示词）
 * 返回结构与 buildRevenueTaxJSON 一致：包含 parameters（参数配置）和 rows（渲染数据）
 */
export function buildFuelPowerJSON(fuelPowerData: any, context?: any): string {
  if (!fuelPowerData) return '{}'
  
  const jsonData: any = {
    title: '外购燃料和动力费估算表',
    parameters: [],
    rows: [],
    summary: {
      totalCost: 0
    },
    updatedAt: new Date().toISOString()
  }
  
  // 1. 构建 parameters - 从原始配置获取燃料动力参数
  if (fuelPowerData.fuel_power) {
    let items = fuelPowerData.fuel_power
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items)
      } catch (e) {
        items = []
      }
    }
    
    jsonData.parameters = (Array.isArray(items) ? items : []).map((item: any) => ({
      序号: item.序号 || item.index,
      名称: item.name || item.名称 || item.fuelType || '',
      单位: item.unit || item.单位 || '',
      单价: item.unitPrice || item.单价 || 0,
      年用量: item.annualQuantity || item.年用量 || 0,
      年费用: item.annualCost || item.年费用 || 0
    }))
  }
  
  // 2. 构建 rows - 从 costTableData 获取渲染后的表格数据
  const costTableData = fuelPowerData.costTableData
  if (costTableData) {
    let tableData = costTableData
    if (typeof costTableData === 'string') {
      try {
        tableData = JSON.parse(costTableData)
      } catch (e) {
        tableData = null
      }
    }
    
    if (tableData?.rows && Array.isArray(tableData.rows)) {
      // 查找"外购燃料和动力费"行
      const fuelPowerRow = tableData.rows.find(
        (r: any) => r.成本项目?.includes('外购燃料和动力费')
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
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建利润与利润分配表JSON数据（用于LLM提示词）
 */
export function buildProfitDistributionJSON(profitData: any, context?: any): string {
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
  if (profitData.profit_distribution || profitData.yearlyProfit) {
    let yearlyData = profitData.profit_distribution || profitData.yearlyProfit
    if (typeof yearlyData === 'string') {
      try {
        yearlyData = JSON.parse(yearlyData)
      } catch (e) {}
    }
    
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
 * 构建项目投资现金流量表JSON数据（用于LLM提示词）
 */
export function buildProjectCashFlowJSON(cashFlowData: any, context?: any): string {
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
  if (cashFlowData.project_cash_flow || cashFlowData.yearlyCashFlow) {
    let yearlyData = cashFlowData.project_cash_flow || cashFlowData.yearlyCashFlow
    if (typeof yearlyData === 'string') {
      try {
        yearlyData = JSON.parse(yearlyData)
      } catch (e) {}
    }
    
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
  
  // 获取NPV和IRR
  if (cashFlowData.npv) jsonData.summary.npv = cashFlowData.npv
  if (cashFlowData.irr) jsonData.summary.irr = cashFlowData.irr
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建财务计算指标表JSON数据（用于LLM提示词）
 */
export function buildFinancialIndicatorsJSON(financialData: any, context?: any): string {
  if (!financialData) return '{}'
  
  const indicators = financialData.financialIndicators || {}
  const investment = financialData.investment || {}
  const revenueCost = financialData.revenueCost || {}
  
  // 计算年均收入和成本
  const totalRevenue = revenueCost.revenueItems?.reduce(
    (sum: number, item: any) => sum + (item.annualRevenue || 0), 0
  ) || indicators.totalRevenue || 0
  
  const totalCost = revenueCost.costItems?.reduce(
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
      roi: indicators.roi || 0,  // 总投资收益率
      roe: indicators.roe || 0,  // 项目资本金净利润率
      netProfitMargin: totalRevenue > 0 ? ((totalRevenue - totalCost - (indicators.annualTax || 0)) / totalRevenue) * 100 : 0
    },
    liquidity: {
      interestCoverageRatio: indicators.interestCoverageRatio || 0,
      debtServiceCoverageRatio: indicators.debtServiceCoverageRatio || 0
    },
    investmentReturns: {
      firrBeforeTax: indicators.firrBeforeTax || indicators.irr || 0,  // 税前财务内部收益率
      firrAfterTax: indicators.firrAfterTax || indicators.irr || 0,      // 税后财务内部收益率
      npvBeforeTax: indicators.npvBeforeTax || indicators.npv || 0,      // 税前财务净现值
      npvAfterTax: indicators.npvAfterTax || indicators.npv || 0,        // 税后财务净现值
      paybackPeriodBeforeTax: indicators.paybackPeriodBeforeTax || indicators.paybackPeriod || 0,  // 税前投资回收期
      paybackPeriodAfterTax: indicators.paybackPeriodAfterTax || indicators.paybackPeriod || 0     // 税后投资回收期
    }
  }
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建借款还本付息计划表JSON数据（用于LLM提示词）
 */
export function buildLoanRepaymentJSON(loanData: any, context?: any): string {
  if (!loanData) return '{}'
  
  // 获取建设期和运营期
  let constructionYears = 2
  let operationYears = 10
  
  if (context) {
    constructionYears = context.constructionYears || constructionYears
    operationYears = context.operationYears || operationYears
  }
  
  if (loanData.partF?.建设期年限) {
    constructionYears = loanData.partF.建设期年限
  }
  
  const totalYears = constructionYears + operationYears
  const jsonData: any = {
    title: '借款还本付息计划表',
    context: {
      constructionYears,
      operationYears,
      totalYears,
      loanAmount: loanData.partF?.贷款总额 || 0,
      annualInterestRate: loanData.partF?.年利率 || 0
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
    let scheduleData = repaymentSchedule
    if (typeof scheduleData === 'string') {
      try {
        scheduleData = JSON.parse(scheduleData)
      } catch (e) {}
    }
    
    if (scheduleData?.rows && Array.isArray(scheduleData.rows)) {
      jsonData.yearlyData = scheduleData.rows.map((row: any, idx: number) => ({
        序号: row.序号,
        项目: row.项目,
        合计: row.合计,
        constructionPeriod: row.建设期 || [],
        operationPeriod: row.运营期 || []
      }))
    }
  } else if (loanData.partF?.分年利息) {
    // 如果没有保存的计划数据，从分年利息构建
    const yearlyInterest = loanData.partF.分年利息 || []
    for (let i = 0; i < totalYears; i++) {
      const isConstruction = i < constructionYears
      jsonData.yearlyData.push({
        年份: i + 1,
        时期: isConstruction ? '建设期' : '运营期',
        期初借款余额: isConstruction ? (i === 0 ? 0 : yearlyInterest[i-1]?.期末借款余额 || 0) : 0,
        当期借款金额: isConstruction ? (yearlyInterest[i]?.当期借款金额 || 0) : 0,
        当期利息: yearlyInterest[i]?.当期利息 || 0,
        当期还本: isConstruction ? 0 : 0,
        当期付息: yearlyInterest[i]?.当期利息 || 0,
        期末借款余额: isConstruction ? (yearlyInterest[i]?.期末借款余额 || 0) : 0
      })
    }
    
    jsonData.summary.totalInterest = yearlyInterest.reduce(
      (sum: number, item: any) => sum + (item.当期利息 || 0), 0
    )
  }
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建借款还本付息计划表JSON数据 - 仅1.2节（当期还本付息及子项）
 * 用于LLM提示词
 * 
 * 输出结构：
 * - basicInfo: 基本信息（贷款总额、年利率、贷款期限、建设期年限、运营期年限）
 * - section12: 序号1.2及其子项数据（当期还本付息、其中还本、付息）
 * - interestSummary: 利息汇总（建设期利息总和、运营期利息总和、贷款利息总和）
 */
export function buildLoanRepaymentSection12JSON(loanData: any, context?: any): string {
  console.log('[buildLoanRepaymentSection12JSON] 🔍 函数被调用')
  console.log('[buildLoanRepaymentSection12JSON] loanData:', loanData ? '存在' : '为空')
  console.log('[buildLoanRepaymentSection12JSON] context:', context)
  
  if (!loanData) {
    console.log('[buildLoanRepaymentSection12JSON] ❌ loanData为空，返回{}')
    return '{}'
  }
  
  // 获取建设期和运营期
  let constructionYears = 2
  let operationYears = 10
  
  if (context) {
    constructionYears = context.constructionYears || constructionYears
    operationYears = context.operationYears || operationYears
  }
  
  if (loanData.partF?.建设期年限) {
    constructionYears = loanData.partF.建设期年限
  }
  
  const totalYears = constructionYears + operationYears
  const loanTerm = context?.loanTerm || totalYears // 贷款期限
  
  console.log('[buildLoanRepaymentSection12JSON] 建设期:', constructionYears, '运营期:', operationYears, '总年限:', totalYears)
  
  // 解析还款计划数据
  const repaymentSchedule = loanData.loan_repayment_schedule_simple || 
                            loanData.loan_repayment_schedule_detailed ||
                            loanData.construction_interest_details
  
  console.log('[buildLoanRepaymentSection12JSON] repaymentSchedule来源:', 
    loanData.loan_repayment_schedule_simple ? 'loan_repayment_schedule_simple' :
    loanData.loan_repayment_schedule_detailed ? 'loan_repayment_schedule_detailed' :
    loanData.construction_interest_details ? 'construction_interest_details' : '无数据')
  
  let scheduleData: any = null
  if (repaymentSchedule) {
    console.log('[buildLoanRepaymentSection12JSON] repaymentSchedule类型:', typeof repaymentSchedule)
    console.log('[buildLoanRepaymentSection12JSON] repaymentSchedule完整对象:', JSON.stringify(repaymentSchedule, null, 2).substring(0, 500))
    
    if (typeof repaymentSchedule === 'string') {
      try {
        scheduleData = JSON.parse(repaymentSchedule)
        console.log('[buildLoanRepaymentSection12JSON] JSON解析成功, rows数量:', scheduleData?.rows?.length)
      } catch (e) {
        console.log('[buildLoanRepaymentSection12JSON] ❌ JSON解析失败:', e)
      }
    } else {
      scheduleData = repaymentSchedule
      console.log('[buildLoanRepaymentSection12JSON] 直接使用对象')
      console.log('[buildLoanRepaymentSection12JSON] scheduleData keys:', Object.keys(scheduleData))
      console.log('[buildLoanRepaymentSection12JSON] scheduleData.rows:', scheduleData?.rows)
      console.log('[buildLoanRepaymentSection12JSON] scheduleData.rows类型:', typeof scheduleData?.rows)
      
      // 尝试查找其他可能的数组属性
      const possibleArrayKeys = ['data', 'tableData', 'result', 'items', 'repaymentSchedule']
      possibleArrayKeys.forEach(key => {
        if ((scheduleData as any)[key]) {
          console.log(`[buildLoanRepaymentSection12JSON] 发现可能的数据: ${key}`, Array.isArray((scheduleData as any)[key]) ? `数组，长度${(scheduleData as any)[key].length}` : (scheduleData as any)[key])
        }
      })
    }
  } else {
    console.log('[buildLoanRepaymentSection12JSON] ❌ repaymentSchedule为空')
  }
  
  // 构建JSON结构 - 隐藏section12字段，只保留汇总信息
  const jsonData: any = {
    title: '借款还本付息计划表',
    basicInfo: {
      贷款总额: loanData.partF?.贷款总额 || (scheduleData?.基本信息?.贷款总额 || 0),
      年利率: loanData.partF?.年利率 || (scheduleData?.基本信息?.年利率 || 0),
      贷款期限: loanTerm,
      建设期年限: constructionYears,
      运营期年限: operationYears
    },
    interestSummary: {
      建设期利息总和: 0,
      运营期利息总和: 0,
      贷款利息总和: 0
    }
  }
  
  console.log('[buildLoanRepaymentSection12JSON] 数据源结构:', {
    hasBasicInfo: !!scheduleData?.基本信息,
    hasRepaymentPlan: !!scheduleData?.还款计划,
    repaymentPlanLength: scheduleData?.还款计划?.length
  })
  
  // 从分年利息获取建设期利息数据
  const yearlyInterestData = loanData.partF?.分年利息 || []
  let constructionInterestTotal = 0
  yearlyInterestData.forEach((data: any, idx: number) => {
    if (idx < constructionYears) {
      constructionInterestTotal += data?.当期利息 || 0
    }
  })
  jsonData.interestSummary.建设期利息总和 = Number(constructionInterestTotal.toFixed(2))
  
  // 计算运营期利息总和 - 隐藏section12
  const repaymentPlan = scheduleData?.还款计划
  if (repaymentPlan && Array.isArray(repaymentPlan)) {
    console.log('[buildLoanRepaymentSection12JSON] ✅ 使用还款计划数组, 长度:', repaymentPlan.length)
    
    // 计算运营期利息总和（从还款计划中获取）
    let operationInterestTotal = 0
    repaymentPlan.forEach((item: any) => {
      operationInterestTotal += Number(item.当期付息?.toFixed(2) || 0)
    })
    jsonData.interestSummary.运营期利息总和 = operationInterestTotal
    
    console.log('[buildLoanRepaymentSection12JSON] ✅ 运营期利息总和:', operationInterestTotal)
  } else if (scheduleData?.rows && Array.isArray(scheduleData.rows)) {
    // 兼容旧版数据结构（rows数组）- 隐藏section12
    console.log('[buildLoanRepaymentSection12JSON] 使用旧版rows数组结构')
    
    // 计算运营期利息总和
    let operationInterestTotal = 0
    scheduleData.rows.forEach((row: any) => {
      if (row.序号 === '' && row.项目 === '付息' && row.运营期 && Array.isArray(row.运营期)) {
        operationInterestTotal = row.运营期.reduce((sum: number, val: number) => sum + (Number(val) || 0), 0)
      }
    })
    
    jsonData.interestSummary.运营期利息总和 = Number(operationInterestTotal.toFixed(2))
    console.log('[buildLoanRepaymentSection12JSON] 运营期利息总和:', operationInterestTotal)
  } else {
    console.log('[buildLoanRepaymentSection12JSON] 未找到有效数据')
  }
  
  // 计算贷款利息总和
  jsonData.interestSummary.贷款利息总和 = Number(
    (jsonData.interestSummary.建设期利息总和 + jsonData.interestSummary.运营期利息总和).toFixed(2)
  )
  
  console.log('[buildLoanRepaymentSection12JSON] 最终结果:', {
    basicInfo: jsonData.basicInfo,
    interestSummary: jsonData.interestSummary
  })
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建财务评价指标汇总表JSON数据（用于LLM提示词）
 */
export function buildFinancialSummaryJSON(financialData: any, context?: any): string {
  if (!financialData) return '{}'
  
  const indicators = financialData.financialIndicators || {}
  const investment = financialData.investment || {}
  const revenueCost = financialData.revenueCost || {}
  
  // 获取建设期和运营期
  let constructionYears = 2
  let operationYears = 10
  
  if (context) {
    constructionYears = context.constructionYears || constructionYears
    operationYears = context.operationYears || operationYears
  }
  
  if (investment.partF?.建设期年限) {
    constructionYears = investment.partF.建设期年限
  }
  
  // 计算年均数据
  const totalRevenue = revenueCost.revenueItems?.reduce(
    (sum: number, item: any) => sum + (item.annualRevenue || 0), 0
  ) || indicators.totalRevenue || 0
  
  const totalCost = revenueCost.costItems?.reduce(
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
 * 构建所有表格数据JSON（用于LLM提示词）
 */
export function buildAllTableDataJSON(projectData: any): Record<string, string> {
  const jsonData: Record<string, string> = {}
  
  // 获取建设期和运营期
  const context = {
    constructionYears: projectData.investment?.partF?.建设期年限 || 
                      projectData.project?.constructionYears || 2,
    operationYears: projectData.project?.operationYears || 10
  }
  
  // 投资估算简表（传递thirdLevelItems）
  jsonData['DATA:investment_estimate'] = buildInvestmentEstimateJSON(
    projectData.investment,
    projectData.investment?.thirdLevelItems
  )
  
  // 折旧与摊销估算表 - 使用 revenueCost 对象
  jsonData['DATA:depreciation_amortization'] = buildDepreciationAmortizationJSON(
    projectData.revenueCost
  )
  
  // 营业收入税金及附加估算表 - 使用 revenueCost 对象
  jsonData['DATA:revenue_tax'] = buildRevenueTaxJSON(
    projectData.revenueCost
  )
  
  // 外购原材料费估算表 - 使用 revenueCost 对象
  jsonData['DATA:raw_materials'] = buildRawMaterialsJSON(
    projectData.revenueCost
  )
  
  // 外购燃料和动力费估算表 - 使用 revenueCost 对象
  jsonData['DATA:fuel_power'] = buildFuelPowerJSON(
    projectData.revenueCost
  )
  
  // 工资及福利费用估算表 - 使用 revenueCost 对象
  jsonData['DATA:salary_welfare'] = buildSalaryWelfareJSON(
    projectData.revenueCost
  )
  
  // 利润与利润分配表 - 使用 revenueCost 对象
  jsonData['DATA:profit_distribution'] = buildProfitDistributionJSON(
    projectData.revenueCost
  )
  
  // 项目投资现金流量表 - 使用 revenueCost 对象
  jsonData['DATA:project_cash_flow'] = buildProjectCashFlowJSON(
    projectData.revenueCost
  )
  
  // 财务计算指标表 - 使用完整 projectData
  jsonData['DATA:financial_indicators'] = buildFinancialIndicatorsJSON(projectData, context)
  
  // 借款还本付息计划表 - 使用 investment 对象
  jsonData['DATA:loan_repayment'] = buildLoanRepaymentJSON(projectData.investment, context)
  
  // 借款还本付息计划表1.2节（当期还本付息及子项）
  jsonData['DATA:loan_repayment_section12'] = buildLoanRepaymentSection12JSON(projectData.investment, context)
  
  // 财务评价指标汇总表
  jsonData['DATA:financial_summary'] = buildFinancialSummaryJSON(projectData, context)
  
  // 财务静态动态指标
  jsonData['DATA:financial_static_dynamic'] = buildFinancialStaticDynamicJSON(projectData)
  
  // 总成本费用估算表
  jsonData['DATA:total_cost'] = buildTotalCostJSON(projectData)
  
  return jsonData
}

/**
 * 构建总成本费用估算表JSON数据（用于LLM提示词）
 * 从 costTableData 获取成本数据并计算含税金额
 */
export function buildTotalCostJSON(projectData: any): string {
  // 辅助函数：安全解析JSON
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
  if (!projectData) return '{}'
  
  const jsonData: any = {
    title: '总成本费用估算表',
    yearlyData: [],
    summary: {
      totalCost: 0,
      variableCost: 0,
      fixedCost: 0
    }
  }
  
  // 获取运营期年限
  const operationYears = projectData.project?.operationYears || 10
  
  // 尝试从多个路径获取 costTableData
  let costTableData = projectData.revenueCost?.costTableData
  if (!costTableData && projectData.costTableData) {
    costTableData = projectData.costTableData
  }
  
  if (costTableData) {
    const tableData = typeof costTableData === 'string' ? safeParseJSON(costTableData) : costTableData
    
    if (tableData?.rows && Array.isArray(tableData.rows)) {
      // 查找序号为7的行"总成本费用合计"
      const totalCostRow = tableData.rows.find((r: any) => r.序号 === '7')
      
      if (totalCostRow && totalCostRow.运营期) {
        // 构建年度数据
        jsonData.yearlyData = totalCostRow.运营期.map((value: number, idx: number) => ({
          年份: idx + 1,
          总成本费用: Number(value) || 0
        }))
        
        // 计算合计（保留2位小数）
        jsonData.summary.totalCost = Number((totalCostRow.合计 || 0).toFixed(2))
        
        // 尝试获取各成本项目的详细数据
        const rawMaterialsRow = tableData.rows.find((r: any) => r.序号 === '1.1')
        const fuelPowerRow = tableData.rows.find((r: any) => r.序号 === '1.2')
        const wagesRow = tableData.rows.find((r: any) => r.序号 === '1.3')
        const repairRow = tableData.rows.find((r: any) => r.序号 === '1.4')
        const otherRow = tableData.rows.find((r: any) => r.序号 === '1.5')
        const depreciationRow = tableData.rows.find((r: any) => r.序号 === '4')
        const amortizationRow = tableData.rows.find((r: any) => r.序号 === '5')
        const interestRow = tableData.rows.find((r: any) => r.序号 === '3')
        
        // 获取进项税额数据
        const inputTaxRow = tableData.rows.find((r: any) => r.序号 === '2' || r.成本项目?.includes('进项税额'))
        
        // 填充详细数据（所有数值字段保留2位小数）
        if (rawMaterialsRow?.运营期) {
          jsonData.yearlyData = jsonData.yearlyData.map((item: any, idx: number) => {
            const excludingTax = Number(rawMaterialsRow.运营期[idx]) || 0
            const rawMaterialsInputTax = inputTaxRow?.运营期?.[idx] 
              ? (Number(inputTaxRow.运营期[idx]) * 0.5)
              : excludingTax * 0.13
            const withTax = excludingTax + rawMaterialsInputTax
            return {
              ...item,
              外购原材料费: Number(withTax.toFixed(2))
            }
          })
        }
        if (fuelPowerRow?.运营期) {
          jsonData.yearlyData = jsonData.yearlyData.map((item: any, idx: number) => {
            const excludingTax = Number(fuelPowerRow.运营期[idx]) || 0
            const fuelPowerInputTax = inputTaxRow?.运营期?.[idx] 
              ? (Number(inputTaxRow.运营期[idx]) * 0.5)
              : excludingTax * 0.13
            const withTax = excludingTax + fuelPowerInputTax
            return {
              ...item,
              外购燃料及动力费: Number(withTax.toFixed(2))
            }
          })
        }
        if (wagesRow?.运营期) {
          jsonData.yearlyData = jsonData.yearlyData.map((item: any, idx: number) => ({
            ...item,
            工资及福利费: Number((Number(wagesRow.运营期[idx]) || 0).toFixed(2))
          }))
        }
        if (repairRow?.运营期) {
          jsonData.yearlyData = jsonData.yearlyData.map((item: any, idx: number) => ({
            ...item,
            修理费: Number((Number(repairRow.运营期[idx]) || 0).toFixed(2))
          }))
        }
        // 其他费用加回进项税额
        if (otherRow?.运营期) {
          jsonData.yearlyData = jsonData.yearlyData.map((item: any, idx: number) => {
            const excludingTax = Number(otherRow.运营期[idx]) || 0
            const otherInputTax = inputTaxRow?.运营期?.[idx] 
              ? Math.max(0, Number(inputTaxRow.运营期[idx]) - 
                ((Number(rawMaterialsRow?.运营期?.[idx]) || 0) * 0.13) - 
                ((Number(fuelPowerRow?.运营期?.[idx]) || 0) * 0.13))
              : excludingTax * 0.09
            const withTax = excludingTax + otherInputTax
            return {
              ...item,
              其他费用: Number(withTax.toFixed(2))
            }
          })
        }
        if (depreciationRow?.运营期) {
          jsonData.yearlyData = jsonData.yearlyData.map((item: any, idx: number) => ({
            ...item,
            折旧费: Number((Number(depreciationRow.运营期[idx]) || 0).toFixed(2))
          }))
        }
        if (amortizationRow?.运营期) {
          jsonData.yearlyData = jsonData.yearlyData.map((item: any, idx: number) => ({
            ...item,
            摊销费: Number((Number(amortizationRow.运营期[idx]) || 0).toFixed(2))
          }))
        }
        if (interestRow?.运营期) {
          jsonData.yearlyData = jsonData.yearlyData.map((item: any, idx: number) => ({
            ...item,
            利息支出: Number((Number(interestRow.运营期[idx]) || 0).toFixed(2))
          }))
        }
        
        // 计算各年度的总成本费用
        jsonData.yearlyData = jsonData.yearlyData.map((item: any) => {
          const totalCost = 
            (item.外购原材料费 || 0) +
            (item.外购燃料及动力费 || 0) +
            (item.工资及福利费 || 0) +
            (item.修理费 || 0) +
            (item.其他费用 || 0) +
            (item.折旧费 || 0) +
            (item.摊销费 || 0) +
            (item.利息支出 || 0)
          return {
            ...item,
            总成本费用: Number(totalCost.toFixed(2))
          }
        })
        
        // 计算总合计
        jsonData.summary.totalCost = Number(jsonData.yearlyData.reduce(
          (sum: number, item: any) => sum + (item.总成本费用 || 0), 0
        ).toFixed(2))
      }
    }
  }
  
  console.log('🔍 [buildTotalCostJSON] 输出:', {
    yearlyData数量: jsonData.yearlyData.length,
    totalCost: jsonData.summary.totalCost
  })
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建工资及福利费用估算表JSON数据（用于LLM提示词）
 */
export function buildSalaryWelfareJSON(wagesData: any): string {
  if (!wagesData) return '{}'
  
  const jsonData: any = {
    title: '工资及福利费用估算表',
    parameters: [],
    rows: [],
    summary: {
      totalWages: 0,
      totalWelfare: 0,
      total: 0
    }
  }
  
  // 从 costConfig.wages 获取工资配置数据
  const wagesConfig = wagesData.revenueCost?.costConfig?.wages || wagesData.costConfig?.wages || {}
  
  if (wagesConfig.items && Array.isArray(wagesConfig.items)) {
    jsonData.parameters = wagesConfig.items.map((item: any, idx: number) => ({
      序号: item.序号 || (idx + 1),
      岗位: item.position || item.岗位 || '',
      人数: item.count || item.人数 || 0,
      年工资: item.annualWage || item.年工资 || 0,
      年福利费: item.annualWelfare || item.年福利费 || 0,
      备注: item.备注 || ''
    }))
    
    // 计算合计
    jsonData.summary.totalWages = jsonData.parameters.reduce(
      (sum: number, item: any) => sum + (item.年工资 || 0), 0
    )
    jsonData.summary.totalWelfare = jsonData.parameters.reduce(
      (sum: number, item: any) => sum + (item.年福利费 || 0), 0
    )
    jsonData.summary.total = jsonData.summary.totalWages + jsonData.summary.totalWelfare
  }
  
  // 从 costTableData 获取渲染后的表格数据
  const costTableData = wagesData.revenueCost?.costTableData || wagesData.costTableData
  if (costTableData) {
    let tableData = costTableData
    if (typeof costTableData === 'string') {
      try {
        tableData = JSON.parse(costTableData)
      } catch (e) {
        tableData = null
      }
    }
    
    if (tableData?.rows && Array.isArray(tableData.rows)) {
      const wagesRow = tableData.rows.find(
        (r: any) => r.成本项目?.includes('工资及福利费')
      )
      if (wagesRow) {
        jsonData.rows = [{
          序号: wagesRow.序号,
          成本项目: wagesRow.成本项目,
          合计: Number(wagesRow.合计) > 0 ? Number(wagesRow.合计).toFixed(2) : wagesRow.合计,
          运营期: (wagesRow.运营期 || []).map((val: number) => 
            Number(val) > 0 ? Number(val).toFixed(2) : val
          )
        }]
      }
    }
  }
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建财务静态动态指标JSON数据（用于LLM提示词）
 */
export function buildFinancialStaticDynamicJSON(financialData: any): string {
  if (!financialData) return '{}'
  
  const indicators = financialData.financialIndicators || {}
  const investment = financialData.investment || {}
  const revenueCost = financialData.revenueCost || {}
  
  // 计算年均数据
  const operationYears = financialData.project?.operationYears || 10
  
  const totalRevenue = revenueCost.revenueItems?.reduce(
    (sum: number, item: any) => sum + (item.annualRevenue || 0), 0
  ) || indicators.totalRevenue || 0
  
  const totalCost = revenueCost.costItems?.reduce(
    (sum: number, item: any) => sum + (item.annualCost || 0), 0
  ) || indicators.totalCost || 0
  
  const totalInvestment = investment.partG?.合计 || indicators.totalInvestment || 0
  const constructionInvestment = investment.partE?.合计 || 0
  const constructionInterest = investment.partF?.合计 || 0
  
  const annualRevenue = operationYears > 0 ? totalRevenue / operationYears : 0
  const annualTotalCost = operationYears > 0 ? totalCost / operationYears : 0
  const annualProfit = annualRevenue - annualTotalCost
  
  // 计算指标
  const roi = totalInvestment > 0 ? (annualProfit / totalInvestment) * 100 : 0
  const roe = totalInvestment > 0 ? (annualProfit / totalInvestment * 0.7) * 100 : 0  // 假设资本金占70%
  
  const jsonData: any = {
    title: '财务静态动态指标',
    basicInfo: {
      项目总投资: totalInvestment,
      建设投资: constructionInvestment,
      建设期利息: constructionInterest,
      建设期: financialData.project?.constructionYears || 2,
      运营期: operationYears
    },
    annualMetrics: {
      年均销售收入: annualRevenue,
      年均总成本费用: annualTotalCost,
      年均利润总额: annualProfit
    },
    staticIndicators: {
      总投资收益率: roi,
      项目资本金净利润率: roe
    },
    dynamicIndicators: {
      财务内部收益率税前: indicators.firrBeforeTax || indicators.irr || 0,
      财务内部收益率税后: indicators.firrAfterTax || indicators.irr || 0,
      财务净现值税前: indicators.npvBeforeTax || indicators.npv || 0,
      财务净现值税后: indicators.npvAfterTax || indicators.npv || 0,
      投资回收期税前: indicators.paybackPeriodBeforeTax || indicators.paybackPeriod || 0,
      投资回收期税后: indicators.paybackPeriodAfterTax || indicators.paybackPeriod || 0
    }
  }
  
  return JSON.stringify(jsonData, null, 2)
}
