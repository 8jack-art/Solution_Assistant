import { pool } from '../db/config.js'
import { InvestmentEstimate } from '../types/index.js'
import { randomUUID } from 'crypto'

export class InvestmentEstimateModel {
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
            // 先验证JSON是否有效
            const parsed = JSON.parse(row.estimate_data)
            row.estimate_data = parsed
            
            // 检查是否包含partA和partG，如果缺失则记录警告
            if (!parsed.partA || !parsed.partG) {
              console.warn(`[InvestmentEstimate] ID${id}的estimate_data缺少partA或partG结构`)
            }
          }
        } catch (jsonError) {
          console.error(`[InvestmentEstimate] 解析estimate_data JSON失败，ID${id}:`, jsonError)
          // 返回基本结构，避免完全失败
          row.estimate_data = {
            id: id,
            parseError: true,
            rawData: row.estimate_data,
            // 提供基本的结构以避免前端错误
            partA: { 序号: 'A', 工程或费用名称: '第一部分 工程费用', 合计: 0 },
            partG: { 序号: 'G', 工程或费用名称: '项目总资金', 合计: 0 }
          }
        }
        
        // 反序列化 construction_interest_details
        try {
          if (row.construction_interest_details && typeof row.construction_interest_details === 'string') {
            row.construction_interest_details = JSON.parse(row.construction_interest_details)
            console.log(`[InvestmentEstimate] 成功反序列化 construction_interest_details，类型: ${Array.isArray(row.construction_interest_details) ? '数组' : '对象'}`)
          }
        } catch (jsonError) {
          console.error(`[InvestmentEstimate] 解析construction_interest_details JSON失败，ID${id}:`, jsonError)
          row.construction_interest_details = null
        }
        
        // 反序列化 loan_repayment_schedule_simple
        try {
          if (row.loan_repayment_schedule_simple && typeof row.loan_repayment_schedule_simple === 'string') {
            row.loan_repayment_schedule_simple = JSON.parse(row.loan_repayment_schedule_simple)
          }
        } catch (jsonError) {
          console.error(`[InvestmentEstimate] 解析loan_repayment_schedule_simple JSON失败，ID${id}:`, jsonError)
          row.loan_repayment_schedule_simple = null
        }
        
        // 反序列化 loan_repayment_schedule_detailed
        try {
          if (row.loan_repayment_schedule_detailed && typeof row.loan_repayment_schedule_detailed === 'string') {
            row.loan_repayment_schedule_detailed = JSON.parse(row.loan_repayment_schedule_detailed)
          }
        } catch (jsonError) {
          console.error(`[InvestmentEstimate] 解析loan_repayment_schedule_detailed JSON失败，ID${id}:`, jsonError)
          row.loan_repayment_schedule_detailed = null
        }
        
        console.log(`[InvestmentEstimate] 成功加载ID为${id}的投资估算数据`)
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
            // 先验证JSON是否有效
            const parsed = JSON.parse(row.estimate_data)
            row.estimate_data = parsed
            
            // 检查是否包含partA和partG，如果缺失则记录警告
            if (!parsed.partA || !parsed.partG) {
              console.warn(`[InvestmentEstimate] 项目${projectId}的estimate_data缺少partA或partG结构`)
            }
          }
        } catch (jsonError) {
          console.error(`[InvestmentEstimate] 解析estimate_data JSON失败，项目${projectId}:`, jsonError)
          // 返回基本结构，避免完全失败
          row.estimate_data = {
            projectId: projectId,
            parseError: true,
            rawData: row.estimate_data,
            // 提供基本的结构以避免前端错误
            partA: { 序号: 'A', 工程或费用名称: '第一部分 工程费用', 合计: 0 },
            partG: { 序号: 'G', 工程或费用名称: '项目总资金', 合计: 0 }
          }
        }
        
        // 反序列化 construction_interest_details
        try {
          if (row.construction_interest_details && typeof row.construction_interest_details === 'string') {
            row.construction_interest_details = JSON.parse(row.construction_interest_details)
            console.log(`[InvestmentEstimate] 成功反序列化 construction_interest_details，类型: ${Array.isArray(row.construction_interest_details) ? '数组' : '对象'}`)
          }
        } catch (jsonError) {
          console.error(`[InvestmentEstimate] 解析construction_interest_details JSON失败，项目${projectId}:`, jsonError)
          row.construction_interest_details = null
        }
        
        // 反序列化 loan_repayment_schedule_simple
        try {
          if (row.loan_repayment_schedule_simple && typeof row.loan_repayment_schedule_simple === 'string') {
            row.loan_repayment_schedule_simple = JSON.parse(row.loan_repayment_schedule_simple)
          }
        } catch (jsonError) {
          console.error(`[InvestmentEstimate] 解析loan_repayment_schedule_simple JSON失败，项目${projectId}:`, jsonError)
          row.loan_repayment_schedule_simple = null
        }
        
        // 反序列化 loan_repayment_schedule_detailed
        try {
          if (row.loan_repayment_schedule_detailed && typeof row.loan_repayment_schedule_detailed === 'string') {
            row.loan_repayment_schedule_detailed = JSON.parse(row.loan_repayment_schedule_detailed)
          }
        } catch (jsonError) {
          console.error(`[InvestmentEstimate] 解析loan_repayment_schedule_detailed JSON失败，项目${projectId}:`, jsonError)
          row.loan_repayment_schedule_detailed = null
        }
        
        console.log(`[InvestmentEstimate] 成功加载项目${projectId}的投资估算数据`)
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
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      const fields = Object.keys(updates).filter(key => {
        const value = (updates as any)[key]
        return key !== 'id' && value !== undefined
      })
      
      // 需要JSON序列化的字段列表
      const jsonFields = ['estimate_data', 'construction_interest_details', 'loan_repayment_schedule_simple', 'loan_repayment_schedule_detailed']
      
      const values = fields.map(field => {
        if (jsonFields.includes(field)) {
          const value = (updates as any)[field]
          // 安全序列化：如果是对象则JSON.stringify，否则直接返回
          if (value && typeof value === 'object') {
            try {
              return JSON.stringify(value)
            } catch (e) {
              console.error(`JSON序列化失败 field=${field}:`, e)
              return null
            }
          }
          return value
        }
        const value = (updates as any)[field]
        // 将undefined转换为null
        return value === undefined ? null : value
      })
      
      // 调试日志：打印字段和值的数量
      console.log(`[InvestmentEstimate] UPDATE - fields数量: ${fields.length}, values数量: ${values.length}`)
      console.log(`[InvestmentEstimate] UPDATE - fields: ${fields.join(', ')}`)
      
      // 确保数量匹配
      if (fields.length !== values.length) {
        throw new Error(`字段数量不匹配: fields=${fields.length}, values=${values.length}`)
      }
      
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
