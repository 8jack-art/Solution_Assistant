import { pool } from '../db/config.js';
export class LLMConfigModel {
    static async findById(id) {
        try {
            const [rows] = await pool.execute('SELECT * FROM llm_configs WHERE id = ?', [id]);
            return rows.length > 0 ? rows[0] : null;
        }
        catch (error) {
            console.error('查找 LLM 配置失败:', error);
            return null;
        }
    }
    // 检查是否存在相同的配置（相同的服务商、URL和模型）
    static async findByCredentials(userId, provider, baseUrl, model) {
        try {
            const [rows] = await pool.execute(`SELECT * FROM llm_configs 
         WHERE user_id = ? AND provider = ? AND base_url = ? AND model = ?`, [userId, provider, baseUrl, model]);
            return rows.length > 0 ? rows[0] : null;
        }
        catch (error) {
            console.error('查找配置失败:', error);
            return null;
        }
    }
    static async findByUserId(userId, isAdmin = false) {
        try {
            let query;
            const params = [];
            if (isAdmin) {
                // 管理员看到所有配置
                query = 'SELECT * FROM llm_configs ORDER BY created_at DESC';
            }
            else {
                // 普通用户看到自己的配置 + 管理员的配置
                query = `
          SELECT lc.*, u.is_admin 
          FROM llm_configs lc
          LEFT JOIN users u ON lc.user_id = u.id
          WHERE lc.user_id = ? OR u.is_admin = TRUE
          ORDER BY lc.created_at DESC
        `;
                params.push(userId);
            }
            const [rows] = await pool.execute(query, params);
            return rows;
        }
        catch (error) {
            console.error('获取用户 LLM 配置列表失败:', error);
            return [];
        }
    }
    static async findDefaultByUserId(userId) {
        try {
            // 先查找用户自己的默认配置
            const [userRows] = await pool.execute('SELECT * FROM llm_configs WHERE user_id = ? AND is_default = TRUE LIMIT 1', [userId]);
            if (userRows.length > 0) {
                return userRows[0];
            }
            // 如果用户没有默认配置，查找管理员的默认配置
            const [adminRows] = await pool.execute(`SELECT lc.* 
         FROM llm_configs lc
         LEFT JOIN users u ON lc.user_id = u.id
         WHERE u.is_admin = TRUE AND lc.is_default = TRUE
         LIMIT 1`, []);
            return adminRows.length > 0 ? adminRows[0] : null;
        }
        catch (error) {
            console.error('查找默认 LLM 配置失败:', error);
            return null;
        }
    }
    static async create(configData) {
        try {
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();
                if (configData.is_default) {
                    await connection.execute('UPDATE llm_configs SET is_default = FALSE WHERE user_id = ?', [configData.user_id]);
                }
                const [result] = await connection.execute(`INSERT INTO llm_configs 
           (user_id, name, provider, api_key, base_url, model, is_default) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`, [
                    configData.user_id,
                    configData.name,
                    configData.provider,
                    configData.api_key,
                    configData.base_url,
                    configData.model,
                    configData.is_default
                ]);
                await connection.commit();
                return await this.findById(result.insertId);
            }
            catch (error) {
                await connection.rollback();
                throw error;
            }
            finally {
                connection.release();
            }
        }
        catch (error) {
            console.error('创建 LLM 配置失败:', error);
            return null;
        }
    }
    static async update(id, updates) {
        try {
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();
                if (updates.is_default) {
                    const config = await this.findById(id);
                    if (config) {
                        await connection.execute('UPDATE llm_configs SET is_default = FALSE WHERE user_id = ? AND id != ?', [config.user_id, id]);
                    }
                }
                const fields = Object.keys(updates).filter(key => key !== 'id');
                const values = fields.map(field => updates[field]);
                const setClause = fields.map(field => `${field} = ?`).join(', ');
                await connection.execute(`UPDATE llm_configs SET ${setClause} WHERE id = ?`, [...values, id]);
                await connection.commit();
                return await this.findById(id);
            }
            catch (error) {
                await connection.rollback();
                throw error;
            }
            finally {
                connection.release();
            }
        }
        catch (error) {
            console.error('更新 LLM 配置失败:', error);
            return null;
        }
    }
    static async setDefault(id, userId) {
        try {
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();
                await connection.execute('UPDATE llm_configs SET is_default = FALSE WHERE user_id = ?', [userId]);
                await connection.execute('UPDATE llm_configs SET is_default = TRUE WHERE id = ?', [id]);
                await connection.commit();
                return await this.findById(id);
            }
            catch (error) {
                await connection.rollback();
                throw error;
            }
            finally {
                connection.release();
            }
        }
        catch (error) {
            console.error('设置默认 LLM 配置失败:', error);
            return null;
        }
    }
    static async delete(id) {
        try {
            const [result] = await pool.execute('DELETE FROM llm_configs WHERE id = ?', [id]);
            return result.affectedRows > 0;
        }
        catch (error) {
            console.error('删除 LLM 配置失败:', error);
            return false;
        }
    }
}
//# sourceMappingURL=LLMConfig.js.map