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
      }
    }
  }
  
  return JSON.stringify(jsonData, null, 2)
}
