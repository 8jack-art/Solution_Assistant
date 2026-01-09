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
 */
export function buildInvestmentEstimateJSON(estimateData: any): string {
  if (!estimateData) return '{}'
  
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
      children: estimateData.partA?.children?.map((item: any) => ({
        序号: item.序号,
        工程或费用名称: item.工程或费用名称,
        建设工程费: item['建设工程费（万元）'] || item.建设工程费 || 0,
        设备购置费: item['设备购置费（万元）'] || item.设备购置费 || 0,
        安装工程费: item['安装工程费（万元）'] || item.安装工程费 || 0,
        其它费用: item['其它费用（万元）'] || item.其它费用 || 0,
        合计: item['合计（万元）'] || item.合计 || 0
      })) || []
    },
    partB: {
      name: '第二部分 工程其它费用',
      total: estimateData.partB?.合计 || 0,
      children: estimateData.partB?.children?.map((item: any) => ({
        序号: item.序号,
        工程或费用名称: item.工程或费用名称,
        其它费用: item['其它费用（万元）'] || item.其它费用 || item.合计 || 0,
        合计: item['合计（万元）'] || item.合计 || 0
      })) || []
    }
  }
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建折旧与摊销估算表JSON数据（用于LLM提示词）
 */
export function buildDepreciationAmortizationJSON(depreciationData: any, context?: any): string {
  if (!depreciationData) return '{}'
  
  const jsonData: any = {
    title: '折旧与摊销估算表',
    summary: {
      totalDepreciation: 0,
      totalAmortization: 0
    },
    depreciation: [],
    amortization: []
  }
  
  // 解析折旧数据
  if (depreciationData.depreciation_schedule) {
    let scheduleData = depreciationData.depreciation_schedule
    if (typeof scheduleData === 'string') {
      try {
        scheduleData = JSON.parse(scheduleData)
      } catch (e) {}
    }
    
    if (scheduleData && Array.isArray(scheduleData)) {
      jsonData.depreciation = scheduleData.map((item: any) => ({
        资产名称: item.assetName || item.name,
        资产原值: item.originalValue || item.assetValue || 0,
        折旧年限: item.depreciationYears || item.years || 0,
        年折旧率: item.depreciationRate || item.rate || 0,
        年折旧额: item.annualDepreciation || item.amount || 0
      }))
      
      jsonData.summary.totalDepreciation = jsonData.depreciation.reduce(
        (sum: number, item: any) => sum + (item.年折旧额 || 0), 0
      )
    }
  }
  
  // 解析摊销数据
  if (depreciationData.amortization_schedule) {
    let scheduleData = depreciationData.amortization_schedule
    if (typeof scheduleData === 'string') {
      try {
        scheduleData = JSON.parse(scheduleData)
      } catch (e) {}
    }
    
    if (scheduleData && Array.isArray(scheduleData)) {
      jsonData.amortization = scheduleData.map((item: any) => ({
        资产名称: item.assetName || item.name,
        资产原值: item.originalValue || item.assetValue || 0,
        摊销年限: item.amortizationYears || item.years || 0,
        年摊销额: item.annualAmortization || item.amount || 0
      }))
      
      jsonData.summary.totalAmortization = jsonData.amortization.reduce(
        (sum: number, item: any) => sum + (item.年摊销额 || 0), 0
      )
    }
  }
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建营业收入、税金及附加估算表JSON数据（用于LLM提示词）
 */
export function buildRevenueTaxJSON(revenueTaxData: any, context?: any): string {
  if (!revenueTaxData) return '{}'
  
  const jsonData: any = {
    title: '营业收入、营业税金及附加和增值税估算表',
    revenueItems: [],
    taxItems: [],
    summary: {
      totalRevenue: 0,
      totalTax: 0,
      totalVAT: 0
    }
  }
  
  // 收入项目
  if (revenueTaxData.revenueItems) {
    const items = typeof revenueTaxData.revenueItems === 'string' 
      ? JSON.parse(revenueTaxData.revenueItems) 
      : revenueTaxData.revenueItems
    
    jsonData.revenueItems = (Array.isArray(items) ? items : []).map((item: any) => ({
      序号: item.序号 || item.index,
      项目名称: item.name || item.项目名称 || '',
      产品名称: item.productName || item.product_name || '',
      单位: item.unit || item.单位 || '',
      单价: item.price || item.单价 || 0,
      销量: item.quantity || item.销量 || 0,
      年营业收入: item.annualRevenue || item.年营业收入 || 0
    }))
    
    jsonData.summary.totalRevenue = jsonData.revenueItems.reduce(
      (sum: number, item: any) => sum + (item.年营业收入 || 0), 0
    )
  }
  
  // 税金项目
  if (revenueTaxData.taxItems) {
    const items = typeof revenueTaxData.taxItems === 'string'
      ? JSON.parse(revenueTaxData.taxItems)
      : revenueTaxData.taxItems
    
    jsonData.taxItems = (Array.isArray(items) ? items : []).map((item: any) => ({
      序号: item.序号 || item.index,
      项目名称: item.name || item.项目名称 || '',
      税率: item.taxRate || item.税率 || 0,
      年税金: item.annualTax || item.年税金 || 0
    }))
    
    jsonData.summary.totalTax = jsonData.taxItems.reduce(
      (sum: number, item: any) => sum + (item.年税金 || 0), 0
    )
  }
  
  // 增值税
  if (revenueTaxData.vatItems) {
    const items = typeof revenueTaxData.vatItems === 'string'
      ? JSON.parse(revenueTaxData.vatItems)
      : revenueTaxData.vatItems
    
    jsonData.vatItems = (Array.isArray(items) ? items : []).map((item: any) => ({
      序号: item.序号 || item.index,
      项目名称: item.name || item.项目名称 || '',
      税率: item.vatRate || item.税率 || 0,
      年增值税: item.annualVAT || item.年增值税 || 0
    }))
    
    jsonData.summary.totalVAT = jsonData.vatItems.reduce(
      (sum: number, item: any) => sum + (item.年增值税 || 0), 0
    )
  }
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建外购原材料费估算表JSON数据（用于LLM提示词）
 */
export function buildRawMaterialsJSON(rawMaterialsData: any, context?: any): string {
  if (!rawMaterialsData) return '{}'
  
  const jsonData: any = {
    title: '外购原材料费估算表',
    items: [],
    summary: {
      totalCost: 0
    }
  }
  
  if (rawMaterialsData.raw_materials) {
    let items = rawMaterialsData.raw_materials
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items)
      } catch (e) {}
    }
    
    jsonData.items = (Array.isArray(items) ? items : []).map((item: any) => ({
      序号: item.序号 || item.index,
      材料名称: item.name || item.材料名称 || '',
      单位: item.unit || item.单位 || '',
      单价: item.unitPrice || item.单价 || 0,
      年用量: item.annualQuantity || item.年用量 || 0,
      年费用: item.annualCost || item.年费用 || 0
    }))
    
    jsonData.summary.totalCost = jsonData.items.reduce(
      (sum: number, item: any) => sum + (item.年费用 || 0), 0
    )
  }
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建外购燃料和动力费估算表JSON数据（用于LLM提示词）
 */
export function buildFuelPowerJSON(fuelPowerData: any, context?: any): string {
  if (!fuelPowerData) return '{}'
  
  const jsonData: any = {
    title: '外购燃料和动力费估算表',
    items: [],
    summary: {
      totalCost: 0
    }
  }
  
  if (fuelPowerData.fuel_power) {
    let items = fuelPowerData.fuel_power
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items)
      } catch (e) {}
    }
    
    jsonData.items = (Array.isArray(items) ? items : []).map((item: any) => ({
      序号: item.序号 || item.index,
      名称: item.name || item.名称 || item.fuelType || '',
      单位: item.unit || item.单位 || '',
      单价: item.unitPrice || item.单价 || 0,
      年用量: item.annualQuantity || item.年用量 || 0,
      年费用: item.annualCost || item.年费用 || 0
    }))
    
    jsonData.summary.totalCost = jsonData.items.reduce(
      (sum: number, item: any) => sum + (item.年费用 || 0), 0
    )
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
  
  // 投资估算简表
  jsonData['DATA:investment_estimate'] = buildInvestmentEstimateJSON(projectData.investment)
  
  // 折旧与摊销估算表
  jsonData['DATA:depreciation_amortization'] = buildDepreciationAmortizationJSON(
    projectData.depreciation, context
  )
  
  // 营业收入税金及附加估算表
  jsonData['DATA:revenue_tax'] = buildRevenueTaxJSON(
    projectData.revenueTax || projectData, context
  )
  
  // 外购原材料费估算表
  jsonData['DATA:raw_materials'] = buildRawMaterialsJSON(
    projectData.rawMaterials || projectData, context
  )
  
  // 外购燃料和动力费估算表
  jsonData['DATA:fuel_power'] = buildFuelPowerJSON(
    projectData.fuelPower || projectData, context
  )
  
  // 利润与利润分配表
  jsonData['DATA:profit_distribution'] = buildProfitDistributionJSON(
    projectData.profitDistribution || projectData, context
  )
  
  // 项目投资现金流量表
  jsonData['DATA:project_cash_flow'] = buildProjectCashFlowJSON(
    projectData.projectCashFlow || projectData, context
  )
  
  // 财务计算指标表
  jsonData['DATA:financial_indicators'] = buildFinancialIndicatorsJSON(projectData, context)
  
  // 借款还本付息计划表
  jsonData['DATA:loan_repayment'] = buildLoanRepaymentJSON(projectData.investment, context)
  
  // 财务评价指标汇总表
  jsonData['DATA:financial_summary'] = buildFinancialSummaryJSON(projectData, context)
  
  return jsonData
}
