/**
 * 构建利润与利润分配表 JSON 数据
 */
import { safeParseJSON } from './shared.js'

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
  
  jsonData.summary.totalRevenue = jsonData.yearlyData.reduce((sum: number, item: any) => sum + (item.营业收入 || 0), 0)
  jsonData.summary.totalCost = jsonData.yearlyData.reduce((sum: number, item: any) => sum + (item.总成本费用 || 0), 0)
  jsonData.summary.totalProfit = jsonData.yearlyData.reduce((sum: number, item: any) => sum + (item.利润总额 || 0), 0)
  jsonData.summary.totalTax = jsonData.yearlyData.reduce((sum: number, item: any) => sum + (item.所得税 || 0), 0)
  jsonData.summary.totalNetProfit = jsonData.yearlyData.reduce((sum: number, item: any) => sum + (item.净利润 || 0), 0)
  
  return JSON.stringify(jsonData, null, 2)
}
