import { pool } from '../db/config.js';
export class UserModel {
    static async findById(id) {
        try {
            const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
            return rows.length > 0 ? rows[0] : null;
        }
        catch (error) {
            console.error('查找用户失败:', error);
            return null;
        }
    }
    static async findByUsername(username) {
        try {
            const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
            return rows.length > 0 ? rows[0] : null;
        }
        catch (error) {
            console.error('查找用户失败:', error);
            return null;
        }
    }
    static async create(userData) {
        try {
            const [result] = await pool.execute(`INSERT INTO users (username, password_hash, is_admin, is_expired, expired_at) 
         VALUES (?, ?, ?, ?, ?)`, [
                userData.username,
                userData.password_hash,
                userData.is_admin,
                userData.is_expired,
                userData.expired_at || null
            ]);
            return await this.findById(result.insertId);
        }
        catch (error) {
            console.error('创建用户失败:', error);
            return null;
        }
    }
    static async update(id, updates) {
        try {
            const fields = Object.keys(updates).filter(key => key !== 'id');
            const values = fields.map(field => updates[field]);
            const setClause = fields.map(field => `${field} = ?`).join(', ');
            await pool.execute(`UPDATE users SET ${setClause} WHERE id = ?`, [...values, id]);
            return await this.findById(id);
        }
        catch (error) {
            console.error('更新用户失败:', error);
            return null;
        }
    }
    static async delete(id) {
        try {
            const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id]);
            return result.affectedRows > 0;
        }
        catch (error) {
            console.error('删除用户失败:', error);
            return false;
        }
    }
    static async getAll() {
        try {
            const [rows] = await pool.execute('SELECT * FROM users ORDER BY created_at DESC');
            return rows;
        }
        catch (error) {
            console.error('获取用户列表失败:', error);
            return [];
        }
    }
}
//# sourceMappingURL=User.js.map