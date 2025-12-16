import bcrypt from 'bcryptjs';
import { pool } from '../db/config.js';
async function updateTestPasswords() {
    try {
        console.log('正在更新测试用户密码...');
        const adminPassword = await bcrypt.hash('123456', 10);
        const userPassword = await bcrypt.hash('123456', 10);
        await pool.execute('UPDATE users SET password_hash = ? WHERE username = ?', [adminPassword, 'admin']);
        await pool.execute('UPDATE users SET password_hash = ? WHERE username = ?', [userPassword, 'user']);
        console.log('✅ 测试用户密码更新成功');
        console.log('用户名: admin, 密码: 123456');
        console.log('用户名: user, 密码: 123456');
    }
    catch (error) {
        console.error('❌ 更新密码失败:', error);
    }
    finally {
        process.exit(0);
    }
}
updateTestPasswords();
//# sourceMappingURL=hashPasswords.js.map