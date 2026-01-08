import { pool } from '../db/config.js';
import { randomUUID } from 'crypto';
export class InvestmentProjectModel {
    static async findById(id) {
        try {
            const [rows] = await pool.execute('SELECT * FROM investment_projects WHERE id = ?', [id]);
            return rows.length > 0 ? rows[0] : null;
        }
        catch (error) {
            console.error('查找投资项目失败:', error);
            return null;
        }
    }
    static async findByUserId(userId, isAdmin = false) {
        try {
            let query = 'SELECT * FROM investment_projects';
            const params = [];
            if (!isAdmin) {
                query += ' WHERE user_id = ?';
                params.push(userId);
            }
            query += ' ORDER BY created_at DESC';
            const [rows] = await pool.execute(query, params);
            return rows;
        }
        catch (error) {
            console.error('获取用户项目列表失败:', error);
            return [];
        }
    }
    static async create(projectData) {
        try {
            // 生成UUID
            const id = randomUUID();
            const [result] = await pool.execute(`INSERT INTO investment_projects
         (id, user_id, project_name, total_investment, project_info, status,
          construction_years, operation_years, loan_ratio, loan_interest_rate,
          construction_unit, location, project_type, is_locked, locked_at,
          land_mode, land_area, land_unit_price, land_cost, land_remark,
          land_lease_area, land_lease_unit_price, land_purchase_area, land_purchase_unit_price, seedling_compensation, lease_seedling_compensation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                id,
                projectData.user_id,
                projectData.project_name,
                projectData.total_investment,
                projectData.project_info || null,
                projectData.status,
                projectData.construction_years,
                projectData.operation_years,
                projectData.loan_ratio,
                projectData.loan_interest_rate,
                projectData.construction_unit || '',
                projectData.location || '',
                projectData.project_type || '',
                projectData.is_locked,
                projectData.locked_at || null,
                projectData.land_mode || 'A',
                projectData.land_area || 0,
                projectData.land_unit_price || 0,
                projectData.land_cost || 0,
                projectData.land_remark || null,
                projectData.land_lease_area || 0,
                projectData.land_lease_unit_price || 0,
                projectData.land_purchase_area || 0,
                projectData.land_purchase_unit_price || 0,
                projectData.seedling_compensation || 0,
                projectData.lease_seedling_compensation || 0
            ]);
            return await this.findById(id);
        }
        catch (error) {
            console.error('创建投资项目失败:', error);
            return null;
        }
    }
    static async update(id, updates) {
        try {
            const fields = Object.keys(updates).filter(key => key !== 'id');
            const values = fields.map(field => updates[field]);
            const setClause = fields.map(field => `${field} = ?`).join(', ');
            await pool.execute(`UPDATE investment_projects SET ${setClause} WHERE id = ?`, [...values, id]);
            return await this.findById(id);
        }
        catch (error) {
            console.error('更新投资项目失败:', error);
            return null;
        }
    }
    static async updateStatus(id, status) {
        try {
            await pool.execute('UPDATE investment_projects SET status = ? WHERE id = ?', [status, id]);
            return await this.findById(id);
        }
        catch (error) {
            console.error('更新项目状态失败:', error);
            return null;
        }
    }
    static async lock(id) {
        try {
            await pool.execute('UPDATE investment_projects SET is_locked = TRUE, locked_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
            return await this.findById(id);
        }
        catch (error) {
            console.error('锁定项目失败:', error);
            return null;
        }
    }
    static async unlock(id) {
        try {
            await pool.execute('UPDATE investment_projects SET is_locked = FALSE, locked_at = NULL WHERE id = ?', [id]);
            return await this.findById(id);
        }
        catch (error) {
            console.error('解锁项目失败:', error);
            return null;
        }
    }
    static async delete(id) {
        try {
            const [result] = await pool.execute('DELETE FROM investment_projects WHERE id = ?', [id]);
            return result.affectedRows > 0;
        }
        catch (error) {
            console.error('删除投资项目失败:', error);
            return false;
        }
    }
}
//# sourceMappingURL=InvestmentProject.js.map