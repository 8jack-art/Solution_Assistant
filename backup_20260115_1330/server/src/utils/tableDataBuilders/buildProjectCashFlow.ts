/**
 * 构建项目投资现金流量表 JSON 数据
 */
import { safeParseJSON } from './shared.js'

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
  
  jsonData.summary.totalCashInflow = jsonData.yearlyData.reduce((sum: number, item: any) => sum + (item.现金流入 || 0), 0)
  jsonData.summary.totalCashOutflow = jsonData.yearlyData.reduce((sum: number, item: any) => sum + (item.现金流出 || 0), 0)
  jsonData.summary.netCashFlow = jsonData.yearlyData.reduce((sum: number, item: any) => sum + (item.净现金流量 || 0), 0)
  
  if (cashFlowData.npv) jsonData.summary.npv = cashFlowData.npv
  if (cashFlowData.irr) jsonData.summary.irr = cashFlowData.irr
  
  return JSON.stringify(jsonData, null, 2)
}
