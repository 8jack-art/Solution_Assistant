/**
 * 构建总成本费用估算表 JSON 数据
 */
import { safeParseJSON } from './shared.js'

export function buildTotalCostJSON(projectData: any): string {
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
  
  const operationYears = projectData.project?.operationYears || 10
  
  let costTableData = projectData.revenueCost?.costTableData
  if (!costTableData && projectData.costTableData) {
    costTableData = projectData.costTableData
  }
  
  if (costTableData) {
    const tableData = typeof costTableData === 'string' ? safeParseJSON(costTableData) : costTableData
    
    if (tableData?.rows && Array.isArray(tableData.rows)) {
      const totalCostRow = tableData.rows.find((r: any) => r.序号 === '7')
      
      if (totalCostRow && totalCostRow.运营期) {
        jsonData.yearlyData = totalCostRow.运营期.map((value: number, idx: number) => ({
          年份: idx + 1,
          总成本费用: Number(value) || 0
        }))
        
        jsonData.summary.totalCost = Number((totalCostRow.合计 || 0).toFixed(2))
        
        const rawMaterialsRow = tableData.rows.find((r: any) => r.序号 === '1.1')
        const fuelPowerRow = tableData.rows.find((r: any) => r.序号 === '1.2')
        const wagesRow = tableData.rows.find((r: any) => r.序号 === '1.3')
        
        if (rawMaterialsRow?.运营期) {
          jsonData.yearlyData = jsonData.yearlyData.map((item: any, idx: number) => ({
            ...item,
            外购原材料费: Number(rawMaterialsRow.运营期[idx]) || 0
          }))
        }
        
        if (fuelPowerRow?.运营期) {
          jsonData.yearlyData = jsonData.yearlyData.map((item: any, idx: number) => ({
            ...item,
            外购燃料和动力费: Number(fuelPowerRow.运营期[idx]) || 0
          }))
        }
        
        if (wagesRow?.运营期) {
          jsonData.yearlyData = jsonData.yearlyData.map((item: any, idx: number) => ({
            ...item,
            工资及福利费: Number(wagesRow.运营期[idx]) || 0
          }))
        }

        // 添加管理费用处理逻辑
        const managementExpensesRow = tableData.rows.find((r: any) => r.序号 === '2')

        if (managementExpensesRow?.运营期) {
          // 计算运营期合计和年均管理费
          const managementValues = managementExpensesRow.运营期.map((value: number) => Number(value) || 0)
          const operationPeriodTotal = managementValues.reduce((sum: number, value: number) => sum + value, 0)
          const averageManagementFee = operationYears > 0 ? operationPeriodTotal / operationYears : 0
          
          // 获取费用名称（优先使用费用名称字段，否则使用费用或name字段）
          const expenseName = managementExpensesRow.费用名称 || managementExpensesRow.费用 || managementExpensesRow.name || '管理费用'
          
          jsonData.yearlyData = jsonData.yearlyData.map((item: any, idx: number) => ({
            ...item,
            管理费用: managementValues[idx] || 0
          }))
          
          // 将年均管理费和运营期合计添加到summary中
          jsonData.summary.年均管理费 = Number(averageManagementFee.toFixed(2))
          jsonData.summary.运营期合计 = Number(operationPeriodTotal.toFixed(2))
          jsonData.summary.费用名称 = expenseName
        }
      }
    }
  }

  return JSON.stringify(jsonData, null, 2)
}
