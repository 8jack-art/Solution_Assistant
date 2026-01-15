/**
 * 构建营业收入、税金及附加估算表 JSON 数据
 */
import { safeParseJSON } from './shared.js'

export function buildRevenueTaxJSON(revenueTaxData: any): string {
  if (!revenueTaxData) return '{}'
  
  // 获取税率信息
  const revenueTableDataRaw = safeParseJSON(revenueTaxData.revenueTableData)
  const urbanTaxRate = revenueTableDataRaw?.urbanTaxRate || 0.07
  
  const jsonData: any = {
    title: '营业收入、营业税金及附加和增值税估算表',
    parameters: [],
    tax: {
      incomeTaxRate: 25,
      urbanTaxRate: Number((urbanTaxRate * 100).toFixed(0)),
      educationTaxRate: 5
    },
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
  
  // 大数值简化函数
  const formatLargeNumber = (value: number): string => {
    if (value >= 100000000) return `${(value / 100000000).toFixed(2).replace(/\.?0+$/, '')}亿`
    if (value >= 10000000) return `${(value / 10000000).toFixed(2).replace(/\.?0+$/, '')}千万`
    if (value >= 10000) return `${(value / 10000).toFixed(2).replace(/\.?0+$/, '')}万`
    return value.toString()
  }
  
  // 格式化参数值
  const formatParamValue = (item: any): string => {
    switch (item.fieldTemplate) {
      case 'quantity-price':
        return `${formatLargeNumber(item.quantity || 0)}${item.unit || ''} × ${formatLargeNumber(item.unitPrice || 0)}万元`
      case 'area-yield-price':
        return `${formatLargeNumber(item.area || 0)}亩 × ${formatLargeNumber(item.yieldPerArea || 0)}${item.yieldPerAreaUnit || ''} × ${formatLargeNumber(item.unitPrice || 0)}万元`
      case 'capacity-utilization':
        return `${formatLargeNumber(item.capacity || 0)}${item.capacityUnit || ''} × ${((item.utilizationRate || 0) * 100).toFixed(0)}% × ${formatLargeNumber(item.unitPrice || 0)}万元`
      case 'subscription':
        return `${formatLargeNumber(item.subscriptions || 0)} × ${formatLargeNumber(item.unitPrice || 0)}万元`
      case 'direct-amount':
        return `${parseFloat((item.directAmount || 0).toFixed(4)).toString()}万元/年`
      default:
        return ''
    }
  }
  
  // 构建 parameters
  const revenueItems = safeParseJSON(revenueTaxData.revenueItems)
  if (revenueItems && Array.isArray(revenueItems)) {
    revenueItems.forEach((item: any, idx: number) => {
      if (idx < 10) {
        jsonData.parameters.push({
          序号: `1.${idx + 1}`,
          收入项目: item.name || '',
          模板: TEMPLATE_LABELS[item.fieldTemplate] || '',
          parametervalue: formatParamValue(item)
        })
      }
    })
  }
  
  // 构建 rows
  const revenueTableData = safeParseJSON(revenueTaxData.revenueTableData)
  if (revenueTableData && revenueTableData.rows && Array.isArray(revenueTableData.rows)) {
    jsonData.rows = revenueTableData.rows
      .filter((row: any) => /^1\.\d+$/.test(row.序号?.toString() || ''))
      .map((row: any) => {
        const yearsData = row.运营期 || []
        const calculatedTotal = yearsData.reduce((sum: number, val: number) => sum + (Number(val) || 0), 0)
        const operationYears = yearsData.length
        const annualRevenue = operationYears > 0 ? calculatedTotal / operationYears : 0
        
        return {
          序号: row.序号,
          收入项目: row.收入项目 || row.成本项目 || '',
          年均收入: Number(annualRevenue.toFixed(2)),
          合计: Number(calculatedTotal.toFixed(2)),
          运营期: yearsData.map((val: number) => (val > 0 ? Number(val).toFixed(2) : val))
        }
      })
  }
  
  console.log('✅ buildRevenueTaxJSON 输出:', JSON.stringify(jsonData, null, 2))
  
  return JSON.stringify(jsonData, null, 2)
}
