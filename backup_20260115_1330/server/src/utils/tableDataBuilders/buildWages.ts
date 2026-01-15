/**
 * 构建工资及福利费估算表 JSON 数据
 * 数据来源：projectData.revenueCost.wages.items（与 WagesModal 表格数据一致）
 */
import { safeParseJSON } from './shared.js'

export function buildWagesJSON(wagesData: any): string {
  if (!wagesData) return '{}'
  
  // 获取工资福利费配置数据
  const wagesConfig = wagesData.costConfig?.wages || wagesData.wages || {}
  const items = wagesConfig.items || []
  
  // 构建表格数据（与 WagesModal 表格结构一致）
  const rows = items.map((item: any, idx: number) => {
    const 工资小计 = (item.employees || 0) * (item.salaryPerEmployee || 0)
    const 福利费 = 工资小计 * ((item.welfareRate || 0) / 100)
    const 合计 = 工资小计 + 福利费
    
    // 计算备注字段
    const changeInterval = item.changeInterval || 0
    const changePercentage = item.changePercentage || 0
    let 备注 = ''
    
    if (changeInterval === 0 || changePercentage === 0) {
      备注 = '工资幅度无变化'
    } else {
      备注 = `工资每${changeInterval}年上涨${changePercentage}%`
    }
    
    return {
      序号: idx + 1,
      岗位名称: item.name || '',
      人数: item.employees || 0,
      '初始年基础工资（万元）': item.salaryPerEmployee || 0,
      '工资小计（万元）': Number(工资小计.toFixed(2)),
      '福利费率（%）': item.welfareRate || 0,
      '福利费（万元）': Number(福利费.toFixed(2)),
      '初始年工资福利费合计（万元）': Number(合计.toFixed(2)),
      '变化(年)': changeInterval,
      '幅度(%)': changePercentage,
      备注
    }
  })
  
  // 计算合计行
  const totalEmployees = items.reduce((sum: number, item: any) => sum + (item.employees || 0), 0)
  const totalSalary = items.reduce((sum: number, item: any) => 
    sum + ((item.employees || 0) * (item.salaryPerEmployee || 0)), 0)
  const totalWelfare = items.reduce((sum: number, item: any) => {
    const 工资小计 = (item.employees || 0) * (item.salaryPerEmployee || 0)
    return sum + (工资小计 * ((item.welfareRate || 0) / 100))
  }, 0)
  const grandTotal = totalSalary + totalWelfare
  
  // 从 costTableData 获取运营期数据（查找序号为 1.3 的行）
  let operationPeriodData: number[] = []
  const costTableData = wagesData.costTableData
  if (costTableData) {
    const tableData = typeof costTableData === 'string' ? safeParseJSON(costTableData) : costTableData
    if (tableData?.rows && Array.isArray(tableData.rows)) {
      const wagesRow = tableData.rows.find((r: any) => r.序号 === '1.3')
      if (wagesRow?.运营期) {
        operationPeriodData = wagesRow.运营期.map((val: number) =>
          Number(val) > 0 ? Number(val).toFixed(2) : val
        )
      }
    }
  }

  // 计算运营期合计和年平均工资福利费
  const operationPeriodTotal = operationPeriodData.reduce((sum: number, val: any) => {
    return sum + (Number(val) || 0)
  }, 0)
  const annualAverageWelfareCost = operationPeriodData.length > 0 ? operationPeriodTotal / operationPeriodData.length : 0

  const jsonData: any = {
    title: '工资及福利费估算表',
    rows: rows,
    运营期: operationPeriodData,
    summary: {
      totalEmployees,
      grandTotal: Number(operationPeriodTotal.toFixed(2)),
      annualAverageWelfareCost: Number(annualAverageWelfareCost.toFixed(2))
    }
  }
  
  return JSON.stringify(jsonData, null, 2)
}

/**
 * 构建工资及福利费JSON数据（用于LLM提示词）
 * 与 buildWagesJSON 输出相同格式，确保小眼睛和 LLM 使用的数据一致
 * 对应变量：DATA:salary_welfare
 */
export function buildSalaryWelfareJSON(wagesData: any): string {
  // 直接调用 buildWagesJSON，确保输出格式完全一致
  return buildWagesJSON(wagesData)
}
