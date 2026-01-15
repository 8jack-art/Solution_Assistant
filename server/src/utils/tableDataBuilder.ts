/**
 * 表格数据生成器
 * 将投资估算、收入成本等数据格式化为 JSON 格式，用于 LLM 提示词
 * 
 * @deprecated 请使用 server/src/utils/tableDataBuilders/ 中的模块化构建器
 * 该文件已重构为模块化结构，每个构建函数独立一个文件，便于维护和测试
 */

// 从模块化结构导入，保持向后兼容
export * from './tableDataBuilders/shared.js'
export * from './tableDataBuilders/buildInvestmentEstimate.js'
export * from './tableDataBuilders/buildRawMaterials.js'
export * from './tableDataBuilders/buildFuelPower.js'
export * from './tableDataBuilders/buildWages.js'
export * from './tableDataBuilders/buildRevenueTax.js'
export * from './tableDataBuilders/buildDepreciationAmortization.js'
export * from './tableDataBuilders/buildProfitDistribution.js'
export * from './tableDataBuilders/buildProjectCashFlow.js'
export * from './tableDataBuilders/buildLoanRepayment.js'
export * from './tableDataBuilders/buildTotalCost.js'
export * from './tableDataBuilders/buildFinancialIndicators.js'
export * from './tableDataBuilders/buildFinancialStaticDynamic.js'

// 重新导出 buildAllTableDataJSON 聚合函数
import { buildInvestmentEstimateJSON, 
         buildDepreciationAmortizationJSON,
         buildRevenueTaxJSON,
         buildRawMaterialsJSON,
         buildFuelPowerJSON,
         buildWagesJSON,
         buildSalaryWelfareJSON,
         buildProfitDistributionJSON,
         buildProjectCashFlowJSON,
         buildFinancialIndicatorsJSON,
         buildLoanRepaymentJSON,
         buildLoanRepaymentSection12JSON,
         buildTotalCostJSON,
         buildFinancialStaticDynamicJSON } from './tableDataBuilders/index.js'

/**
 * 构建所有表格数据JSON（用于LLM提示词）
 */
export function buildAllTableDataJSON(projectData: any): Record<string, string> {
  const jsonData: Record<string, string> = {}
  
  // 投资估算简表
  jsonData['DATA:investment_estimate'] = buildInvestmentEstimateJSON(projectData.investment)
  
  // 折旧与摊销估算表
  jsonData['DATA:depreciation_amortization'] = buildDepreciationAmortizationJSON(
    projectData.depreciation || projectData.revenueCost
  )
  
  // 营业收入税金及附加估算表
  jsonData['DATA:revenue_tax'] = buildRevenueTaxJSON(
    projectData.revenueTax || projectData.revenueCost || projectData
  )
  
  // 外购原材料费估算表
  jsonData['DATA:raw_materials'] = buildRawMaterialsJSON(
    projectData.rawMaterials || projectData.revenueCost || projectData
  )
  
  // 外购燃料和动力费估算表
  jsonData['DATA:fuel_power'] = buildFuelPowerJSON(
    projectData.fuelPower || projectData.revenueCost || projectData
  )
  
  // 工资及福利费估算表（简洁版本）
  jsonData['DATA:wages'] = buildWagesJSON(
    projectData.wages || projectData.revenueCost || projectData
  )
  
  // 工资及福利费估算表（详细版本，含 parameters 和 rows）
  jsonData['DATA:salary_welfare'] = buildSalaryWelfareJSON(
    projectData.wages || projectData.revenueCost || projectData
  )
  
  // 利润与利润分配表
  jsonData['DATA:profit_distribution'] = buildProfitDistributionJSON(
    projectData.profitDistribution || projectData.revenueCost || projectData
  )
  
  // 项目投资现金流量表
  jsonData['DATA:project_cash_flow'] = buildProjectCashFlowJSON(
    projectData.projectCashFlow || projectData.revenueCost || projectData
  )
  
  // 财务计算指标表
  jsonData['DATA:financial_indicators'] = buildFinancialIndicatorsJSON(projectData)
  
  // 借款还本付息计划表
  jsonData['DATA:loan_repayment'] = buildLoanRepaymentJSON(projectData.investment || projectData)
  
  // 借款还本付息计划表1.2节（简化版本）
  // 传递完整的 projectData，包含 investment 和 revenueCost
  jsonData['DATA:loan_repayment_section12'] = buildLoanRepaymentSection12JSON(projectData)
  
  // 总成本费用估算表
  jsonData['DATA:total_cost'] = buildTotalCostJSON(projectData)
  
  // 财务静态动态指标
  jsonData['DATA:financial_static_dynamic'] = buildFinancialStaticDynamicJSON(projectData)
  
  return jsonData
}
