import { pool } from '../db/config.js'
import { InvestmentEstimate } from '../types/index.js'
import { randomUUID } from 'crypto'

export class InvestmentEstimateModel {
  static async findById(id: string): Promise<InvestmentEstimate | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM investment_estimates WHERE id = ?',
        [id]
      ) as any[]
      
      if (rows.length > 0) {
        const row = rows[0]
        // 解析JSON字段
        if (row.estimate_data && typeof row.estimate_data === 'string') {
          row.estimate_data = JSON.parse(row.estimate_data)
        }
        // 解析新增的JSON字段
        if (row.construction_interest_details && typeof row.construction_interest_details === 'string') {
          row.construction_interest_details = JSON.parse(row.construction_interest_details)
        }
        if (row.loan_repayment_schedule_simple && typeof row.loan_repayment_schedule_simple === 'string') {
          row.loan_repayment_schedule_simple = JSON.parse(row.loan_repayment_schedule_simple)
        }
        if (row.loan_repayment_schedule_detailed && typeof row.loan_repayment_schedule_detailed === 'string') {
          row.loan_repayment_schedule_detailed = JSON.parse(row.loan_repayment_schedule_detailed)
        }
        return row
      }
      return null
    } catch (error) {
      console.error('查找投资估算失败:', error)
      return null
    }
  }

  static async findByProjectId(projectId: string): Promise<InvestmentEstimate | null> {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM investment_estimates WHERE project_id = ?',
        [projectId]
      ) as any[]
      
      if (rows.length > 0) {
        const row = rows[0]
        // 解析JSON字段
        if (row.estimate_data && typeof row.estimate_data === 'string') {
          row.estimate_data = JSON.parse(row.estimate_data)
        }
        // 解析新增的JSON字段
        if (row.construction_interest_details && typeof row.construction_interest_details === 'string') {
          row.construction_interest_details = JSON.parse(row.construction_interest_details)
        }
        if (row.loan_repayment_schedule_simple && typeof row.loan_repayment_schedule_simple === 'string') {
          row.loan_repayment_schedule_simple = JSON.parse(row.loan_repayment_schedule_simple)
        }
        if (row.loan_repayment_schedule_detailed && typeof row.loan_repayment_schedule_detailed === 'string') {
          row.loan_repayment_schedule_detailed = JSON.parse(row.loan_repayment_schedule_detailed)
        }
        return row
      }
      return null
    } catch (error) {
      console.error('查找项目投资估算失败:', error)
      return null
    }
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
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
