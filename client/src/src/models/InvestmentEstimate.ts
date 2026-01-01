import { pool } from '../db/config.js'
import { InvestmentEstimate } from '../types/index.js'
import { randomUUID } from 'crypto'

export class InvestmentEstimateModel {
  /**
   * 从简化字段重建完整的estimate_data结构
   */
  static rebuildEstimateData(row: any): any {
    const { construction_cost, equipment_cost, installation_cost, other_cost, land_cost, basic_reserve, price_reserve, construction_period, loan_amount, loan_rate } = row
    
    const partAChildren = [
      {
        序号: '一',
        费用名称: '第一部分 工程费用',
        建设工程费: construction_cost || 0,
        设备购置费: equipment_cost || 0,
        安装工程费: installation_cost || 0,
        其它费用: other_cost || 0,
        土地费用: land_cost || 0,
        合计: (construction_cost || 0) + (equipment_cost || 0) + (installation_cost || 0) + (other_cost || 0) + (land_cost || 0)
      }
    ]
    
    const partBChildren = [
      {
        序号: '1',
        工程或费用名称: '第二部分 工程建设其他费用',
        金额: 0,
        占比: '0%',
        备注: ''
      },
      {
        序号: '2',
        工程或费用名称: '土地费用',
        金额: land_cost || 0,
        占比: land_cost > 0 ? ((land_cost / ((construction_cost || 0) + (equipment_cost || 0) + (installation_cost || 0) + (other_cost || 0) + (land_cost || 0))) * 100).toFixed(2) + '%' : '0%',
        备注: ''
      }
    ]
    
    const partDChildren = [
      {
        序号: '1',
        费用名称: '基本预备费',
        费率: '5%',
        金额: basic_reserve || 0,
        备注: '基本预备费=工程费用×5%+其他费用×5%'
      },
      {
        序号: '2',
        费用名称: '涨价预备费',
        费率: '3%',
        金额: price_reserve || 0,
        备注: '涨价预备费=工程费用×3%'
      }
    ]
    
    const partETotal = (construction_cost || 0) + (installation_cost || 0) + (other_cost || 0)
    const partFTotal = loan_amount > 0 ? loan_amount * (loan_rate || 0.049) * ((construction_period || 3) / 2) : 0
    
    return {
      id: row.id,
      projectId: row.project_id,
      gapRate: 0,
      projectType: 'construction',
      iterationCount: 1,
      partA: {
        name: '第一部分 工程费用',
        total: (construction_cost || 0) + (equipment_cost || 0) + (installation_cost || 0) + (other_cost || 0) + (land_cost || 0),
        children: partAChildren
      },
      partB: {
        name: '第二部分 工程建设其他费用',
        total: land_cost || 0,
        children: partBChildren
      },
      partC: {
        name: '第三部分 预备费',
        total: 0,
        children: []
      },
      partD: {
        name: '第四部分 建设期利息',
        total: partFTotal,
        children: [
          {
            序号: '1',
            费用名称: '建设期利息',
            金额: partFTotal,
            备注: `贷款${loan_amount || 0}万元，年利率${((loan_rate || 0.049) * 100).toFixed(2)}%，建设期${construction_period || 3}年`
          }
        ]
      },
      partE: {
        name: '建安工程费',
        total: partETotal,
        children: [
          {
            序号: '1',
            费用名称: '建筑工程费',
            金额: construction_cost || 0
          },
          {
            序号: '2',
            费用名称: '安装工程费',
            金额: installation_cost || 0
          },
          {
            序号: '3',
            费用名称: '工程建设其他费用',
            金额: other_cost || 0
          }
        ]
      },
      partF: {
        name: '建设期利息',
        total: partFTotal,
        贷款总额: loan_amount || 0,
        年利率: loan_rate || 0.049,
        贷款期限: construction_period || 3,
        分年利息: construction_period > 0 ? Array.from({ length: construction_period }, (_, i) => ({
          年份: i + 1,
          当期借款金额: loan_amount / (construction_period || 1),
          当期利息: (loan_amount / (construction_period || 1)) * (loan_rate || 0.049) * ((construction_period || 1) - i - 0.5)
        })) : []
      },
      partG: {
        name: '项目总投资',
        total: (construction_cost || 0) + (equipment_cost || 0) + (installation_cost || 0) + (other_cost || 0) + (land_cost || 0) + (basic_reserve || 0) + partFTotal,
        children: [
          { 序号: '1', 费用名称: '固定资产投资', 金额: (construction_cost || 0) + (equipment_cost || 0) + (installation_cost || 0) + (other_cost || 0) + (basic_reserve || 0) + partFTotal },
          { 序号: '2', 费用名称: '无形资产投资', 金额: land_cost || 0 },
          { 序号: '3', 费用名称: '流动资金', 金额: 0 }
        ]
      },
      partH: {
        name: '资金来源',
        total: (construction_cost || 0) + (equipment_cost || 0) + (installation_cost || 0) + (other_cost || 0) + (land_cost || 0) + (basic_reserve || 0) + partFTotal,
        children: [
          { 序号: '1', 资金来源: '资本金', 金额: (construction_cost || 0) + (equipment_cost || 0) + (installation_cost || 0) + (other_cost || 0) + (land_cost || 0) + (basic_reserve || 0) + partFTotal - (loan_amount || 0) },
          { 序号: '2', 资金来源: '债务资金', 金额: loan_amount || 0 }
        ]
      },
      reconstructed: true,
      reconstructedAt: new Date().toISOString()
    }
  }

  static async findById(id: string): Promise<InvestmentEstimate | null> {
    if (!id) {
      console.warn('[InvestmentEstimate] 无效的ID:', id)
      return null
    }

    let retryCount = 0
    const maxRetries = 2
    
    while (retryCount <= maxRetries) {
      try {
        console.log(`[InvestmentEstimate] 查询ID${id}投资估算数据 (尝试 ${retryCount + 1}/${maxRetries + 1})`)
        
        const [rows] = await pool.execute({
          sql: 'SELECT * FROM investment_estimates WHERE id = ?',
          values: [id],
          timeout: 30000 // 30秒超时
        }) as any[]
        
        if (rows.length === 0) {
          console.log(`[InvestmentEstimate] 未找到ID为${id}的投资估算数据`)
          return null
        }
        
        const row = rows[0]
        console.log(`[InvestmentEstimate] 找到ID${id}的投资估算数据，开始解析JSON字段`)
        
        // 安全解析JSON字段，添加错误处理
        try {
          if (row.estimate_data && typeof row.estimate_data === 'string') {
            row.estimate_data = JSON.parse(row.estimate_data)
          }
        } catch (jsonError) {
          console.error(`[InvestmentEstimate] 解析estimate_data JSON失败，ID${id}:`, jsonError)
          // 返回基本结构，避免完全失败
          row.estimate_data = {
            id: id,
            parseError: true,
            rawData: row.estimate_data
          }
        }
        
        try {
          if (row.construction_interest_details && typeof row.construction_interest_details === 'string') {
            row.construction_interest_details = JSON.parse(row.construction_interest_details)
          }
        } catch (jsonError) {
          console.error(`[InvestmentEstimate] 解析construction_interest_details JSON失败，ID${id}:`, jsonError)
          row.construction_interest_details = null
        }
        
        try {
          if (row.loan_repayment_schedule_simple && typeof row.loan_repayment_schedule_simple === 'string') {
            row.loan_repayment_schedule_simple = JSON.parse(row.loan_repayment_schedule_simple)
          }
        } catch (jsonError) {
          console.error(`[InvestmentEstimate] 解析loan_repayment_schedule_simple JSON失败，ID${id}:`, jsonError)
          row.loan_repayment_schedule_simple = null
        }
        
        try {
          if (row.loan_repayment_schedule_detailed && typeof row.loan_repayment_schedule_detailed === 'string') {
            row.loan_repayment_schedule_detailed = JSON.parse(row.loan_repayment_schedule_detailed)
          }
        } catch (jsonError) {
          console.error(`[InvestmentEstimate] 解析loan_repayment_schedule_detailed JSON失败，ID${id}:`, jsonError)
          row.loan_repayment_schedule_detailed = null
        }
        
        console.log(`[InvestmentEstimate] 成功加载ID为${id}的投资估算数据`)
        
        // 检查estimate_data是否完整，如果不完整则尝试重建
        const isComplete = row.estimate_data?.partA?.children?.length > 0 && 
                          row.estimate_data?.partG?.合计 > 0
        
        if (!isComplete && row.construction_cost > 0) {
          console.log(`[InvestmentEstimate] 检测到不完整的estimate_data，尝试从简化字段重建完整结构`)
          row.estimate_data = InvestmentEstimateModel.rebuildEstimateData(row)
        }
        
        return row
        
      } catch (error: any) {
        retryCount++
        console.error(`[InvestmentEstimate] 查询失败 (尝试 ${retryCount}/${maxRetries + 1})，ID${id}:`, error)
        
        // 如果是超时错误，记录详细信息
        if (error.code === 'ETIMEDOUT' || error.code === 'QUERY_TIMEOUT' || error.message === '查询超时') {
          console.error(`[InvestmentEstimate] 数据库查询超时，ID: ${id}，尝试: ${retryCount}`)
        }
        
        if (retryCount <= maxRetries) {
          // 指数退避重试
          const delay = 1000 * Math.pow(2, retryCount - 1)
          console.log(`[InvestmentEstimate] ${delay}ms后重试查询ID${id}`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
        
        // 最后一次重试失败，返回null而不是抛出错误
        console.error(`[InvestmentEstimate] 查询ID${id}投资估算最终失败，已重试${maxRetries}次`)
        return null
      }
    }
    
    return null
  }
  
  static async findByProjectId(projectId: string): Promise<InvestmentEstimate | null> {
    if (!projectId) {
      console.warn('[InvestmentEstimate] 项目ID为空')
      return null
    }

    let retryCount = 0
    const maxRetries = 2
    
    while (retryCount <= maxRetries) {
      try {
        console.log(`[InvestmentEstimate] 查询项目${projectId}投资估算数据 (尝试 ${retryCount + 1}/${maxRetries + 1})`)
        
        // 添加查询超时设置（30秒）
        const [rows] = await pool.execute({
          sql: 'SELECT * FROM investment_estimates WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1',
          values: [projectId],
          timeout: 30000 // 30秒超时
        }) as any[]
        
        if (rows.length === 0) {
          console.log(`[InvestmentEstimate] 未找到项目${projectId}的投资估算数据`)
          return null
        }
        
        const row = rows[0]
        console.log(`[InvestmentEstimate] 找到项目${projectId}的投资估算数据，开始解析JSON字段`)
        
        // 安全解析JSON字段，添加错误处理
        try {
          if (row.estimate_data && typeof row.estimate_data === 'string') {
            row.estimate_data = JSON.parse(row.estimate_data)
          }
        } catch (jsonError) {
          console.error(`[InvestmentEstimate] 解析estimate_data JSON失败，项目${projectId}:`, jsonError)
          // 返回基本结构，避免完全失败
          row.estimate_data = {
            projectId: projectId,
            parseError: true,
            rawData: row.estimate_data
          }
        }
        
        try {
          if (row.construction_interest_details && typeof row.construction_interest_details === 'string') {
            row.construction_interest_details = JSON.parse(row.construction_interest_details)
          }
        } catch (jsonError) {
          console.error(`[InvestmentEstimate] 解析construction_interest_details JSON失败，项目${projectId}:`, jsonError)
          row.construction_interest_details = null
        }
        
        try {
          if (row.loan_repayment_schedule_simple && typeof row.loan_repayment_schedule_simple === 'string') {
            row.loan_repayment_schedule_simple = JSON.parse(row.loan_repayment_schedule_simple)
          }
        } catch (jsonError) {
          console.error(`[InvestmentEstimate] 解析loan_repayment_schedule_simple JSON失败，项目${projectId}:`, jsonError)
          row.loan_repayment_schedule_simple = null
        }
        
        try {
          if (row.loan_repayment_schedule_detailed && typeof row.loan_repayment_schedule_detailed === 'string') {
            row.loan_repayment_schedule_detailed = JSON.parse(row.loan_repayment_schedule_detailed)
          }
        } catch (jsonError) {
          console.error(`[InvestmentEstimate] 解析loan_repayment_schedule_detailed JSON失败，项目${projectId}:`, jsonError)
          row.loan_repayment_schedule_detailed = null
        }
        
        console.log(`[InvestmentEstimate] 成功加载项目${projectId}的投资估算数据`)
        
        // 检查estimate_data是否完整，如果不完整则尝试重建
        const isComplete = row.estimate_data?.partA?.children?.length > 0 && 
                          row.estimate_data?.partG?.合计 > 0
        
        if (!isComplete && row.construction_cost > 0) {
          console.log(`[InvestmentEstimate] 检测到不完整的estimate_data，尝试从简化字段重建完整结构`)
          row.estimate_data = InvestmentEstimateModel.rebuildEstimateData(row)
        }
        
        return row
        
      } catch (error: any) {
        retryCount++
        console.error(`[InvestmentEstimate] 查询失败 (尝试 ${retryCount}/${maxRetries + 1})，项目${projectId}:`, error)
        
        // 如果是超时错误，记录详细信息
        if (error.code === 'ETIMEDOUT' || error.code === 'QUERY_TIMEOUT' || error.message === '查询超时') {
          console.error(`[InvestmentEstimate] 数据库查询超时，项目ID: ${projectId}，尝试: ${retryCount}`)
        }
        
        if (retryCount <= maxRetries) {
          // 指数退避重试
          const delay = 1000 * Math.pow(2, retryCount - 1)
          console.log(`[InvestmentEstimate] ${delay}ms后重试查询项目${projectId}`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
        
        // 最后一次重试失败，返回null而不是抛出错误
        console.error(`[InvestmentEstimate] 查询项目${projectId}投资估算最终失败，已重试${maxRetries}次`)
        return null
      }
    }
    
    return null
  }
  
  static async create(estimateData: Omit<InvestmentEstimate, 'id' | 'created_at' | 'updated_at'>): Promise<InvestmentEstimate | null> {
    try {
      // 生成UUID
      const id = randomUUID()
      
      const [result] = await pool.execute(
        `INSERT INTO investment_estimates 
         (id, project_id, estimate_data, total_investment, building_investment, 
          construction_interest, gap_rate, construction_cost, equipment_cost, 
          installation_cost, other_cost, land_cost, basic_reserve, price_reserve, 
          construction_period, iteration_count, final_total, loan_amount, loan_rate, 
          custom_loan_amount, custom_land_cost, construction_interest_details, 
          loan_repayment_schedule_simple, loan_repayment_schedule_detailed) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          estimateData.project_id,
          estimateData.estimate_data ? JSON.stringify(estimateData.estimate_data) : null,
          estimateData.total_investment || null,
          estimateData.building_investment || null,
          estimateData.construction_interest || null,
          estimateData.gap_rate || null,
          estimateData.construction_cost || 0,
          estimateData.equipment_cost || 0,
          estimateData.installation_cost || 0,
          estimateData.other_cost || 0,
          estimateData.land_cost || 0,
          estimateData.basic_reserve || 0,
          estimateData.price_reserve || 0,
          estimateData.construction_period || 3,
          estimateData.iteration_count || 0,
          estimateData.final_total || 0,
          estimateData.loan_amount || 0,
          estimateData.loan_rate || 0.049,
          estimateData.custom_loan_amount || null,
          estimateData.custom_land_cost || null,
          estimateData.construction_interest_details ? JSON.stringify(estimateData.construction_interest_details) : null,
          estimateData.loan_repayment_schedule_simple ? JSON.stringify(estimateData.loan_repayment_schedule_simple) : null,
          estimateData.loan_repayment_schedule_detailed ? JSON.stringify(estimateData.loan_repayment_schedule_detailed) : null
        ]
      ) as any[]
 
      return await this.findById(id)
    } catch (error) {
      console.error('创建投资估算失败:', error)
      return null
    }
  }
  
  static async update(id: string, updates: Partial<InvestmentEstimate>): Promise<InvestmentEstimate | null> {
    try {
      // 过滤掉undefined值的字段
      const fields = Object.keys(updates).filter(key => key !== 'id' && updates[key as keyof InvestmentEstimate] !== undefined)
      const values = fields.map(field => {
        if (['estimate_data', 'construction_interest_details', 'loan_repayment_schedule_simple', 'loan_repayment_schedule_detailed'].includes(field)) {
          return JSON.stringify((updates as any)[field])
        }
        const value = (updates as any)[field]
        // 将undefined转换为null
        return value === undefined ? null : value
      })
      const setClause = fields.map(field => `${field} = ?`).join(', ')
 
      await pool.execute(
        `UPDATE investment_estimates SET ${setClause} WHERE id = ?`,
        [...values, id]
      )
 
      return await this.findById(id)
    } catch (error) {
      console.error('更新投资估算失败:', error)
      return null
    }
  }
  
  static async delete(id: string): Promise<boolean> {
    try {
      const [result] = await pool.execute(
        'DELETE FROM investment_estimates WHERE id = ?',
        [id]
      ) as any[]
 
      return result.affectedRows > 0
    } catch (error) {
      console.error('删除投资估算失败:', error)
      return false
    }
  }
}
