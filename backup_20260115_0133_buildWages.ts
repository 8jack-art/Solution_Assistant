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
    
    return {
      序号: idx + 1,
      岗位名称: item.name || '',
      人数: item.employees || 0,
      '人均年工资（万元）': item.salaryPerEmployee || 0,
      '工资小计（万元）': Number(工资小计.toFixed(2)),
      '福利费率（%）': item.welfareRate || 0,
      '福利费（万元）': Number(福利费.toFixed(2)),
      '合计（万元）': Number(合计.toFixed(2)),
      '变化(年)': item.changeInterval || 0,
      '幅度(%)': item.changePercentage || 0
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
  
  const jsonData: any = {
    title: '工资及福利费估算表',
    columns: ['序号', '岗位名称', '人数', '人均年工资（万元）', '工资小计（万元）', '福利费率（%）', '福利费（万元）', '合计（万元）', '变化(年)', '幅度(%)'],
    rows: rows,
    summary: {
      totalEmployees,
      totalSalary: Number(totalSalary.toFixed(2)),
      totalWelfare: Number(totalWelfare.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2))
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
