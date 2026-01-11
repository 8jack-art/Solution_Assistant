const bcrypt = require('bcryptjs')
const mysql = require('mysql2/promise')

async function resetPasswords() {
  const pool = mysql.createPool({
    host: 'sql.gxch.site',
    port: 3306,
    user: 'ProjInvDB',
    password: '8Pd6tTKmkzY6rYSC',
    database: 'ProjInvDB',
  })

  try {
    console.log('正在重置用户密码...')
    
    // 生成正确的密码哈希
    const adminHash = await bcrypt.hash('123456', 10)
    const userHash = await bcrypt.hash('123456', 10)
    
    console.log('Admin hash:', adminHash)
    console.log('User hash:', userHash)
    
    // 更新密码
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE username = ?',
      [adminHash, 'admin']
    )
    
    await pool.execute(
      'UPDATE users SET password_hash = ? WHERE username = ?',
      [userHash, 'user']
    )
    
    console.log('✅ 用户密码重置成功')
    console.log('用户名: admin, 密码: 123456')
    console.log('用户名: user, 密码: 123456')
  } catch (error) {
    console.error('❌ 重置密码失败:', error)
  } finally {
    await pool.end()
  }
}

resetPasswords()