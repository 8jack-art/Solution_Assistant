/**
 * 构建财务静态动态指标JSON数据（用于LLM提示词）
 * 
 * 数据来源：
 * - 基准收益率（所得税前）%: 从 revenueCost.financialIndicators.preTaxRate 或 revenueCost.preTaxRate 获取
 * - 基准收益率（所得税后）%: 从 revenueCost.financialIndicators.postTaxRate 或 revenueCost.postTaxRate 获取
 * 
 * 注意：这两个值来自前端"设置基准收益率"modal，存储在 localStorage 中，
 * 前端需要在调用API时将这些值传递给后端，或者存储到 revenueCost 中。
 */
import { safeParseJSON } from './shared.js'

export function buildFinancialStaticDynamicJSON(financialData: any): string {
  console.log('buildFinancialStaticDynamicJSON 开始处理')
  console.log('financialData keys:', Object.keys(financialData || {}))
  
  if (!financialData) {
    console.log('financialData 为空，返回简化结构')
    return JSON.stringify({
      title: '财务静态动态指标',
      基准收益率: {
        所得税前: 0,
        所得税后: 0
      }
    }, null, 2)
  }
  
  // 提取数据
  const revenueCost = financialData.revenueCost || {}
  const financialIndicators = revenueCost.financialIndicators || revenueCost
  
  // 获取基准收益率（从多个数据源查找，确保有默认值6%）
  const preTaxRate = Number(financialIndicators.preTaxRate || 
                            financialIndicators.preTaxRateInput || 
                            financialIndicators.基准收益率所得税前 ||
                            revenueCost.preTaxRate ||
                            financialData.tableDataJSON?.['DATA:financial_static_dynamic']?.基准收益率?.所得税前 ||
                            6)
  
  const postTaxRate = Number(financialIndicators.postTaxRate || 
                             financialIndicators.postTaxRateInput || 
                             financialIndicators.基准收益率所得税后 ||
                             revenueCost.postTaxRate ||
                             financialData.tableDataJSON?.['DATA:financial_static_dynamic']?.基准收益率?.所得税后 ||
                             6)
  
  console.log('获取基准收益率:')
  console.log('  所得税前:', preTaxRate)
  console.log('  所得税后:', postTaxRate)
  
  // 返回简化结构，只包含基准收益率
  const jsonData: any = {
    title: '财务静态动态指标',
    基准收益率: {
      所得税前: preTaxRate,
      所得税后: postTaxRate
    }
  }
  
  console.log('最终生成的 jsonData:', jsonData)
  
  return JSON.stringify(jsonData, null, 2)
}
