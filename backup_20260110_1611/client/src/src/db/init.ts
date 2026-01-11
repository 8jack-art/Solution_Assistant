import fs from 'fs'
import path from 'path'
import { pool } from './config.js'

export async function initDatabase() {
  try {
    console.log('🚀 正在初始化数据库...')
    
    const schemaPath = path.join(import.meta.dirname, 'schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')
    
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)

    for (const statement of statements) {
      await pool.execute(statement)
    }

    // 更新密码哈希以确保能正确登录
    const updatePath = path.join(import.meta.dirname, 'updatePasswords.sql')
    const updateSql = fs.readFileSync(updatePath, 'utf8')
    const updateStatements = updateSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0)

    for (const statement of updateStatements) {
      await pool.execute(statement)
    }

    console.log('✅ 数据库初始化完成')
    console.log('🔑 测试账号已更新:')
    console.log('   管理员: admin / 123456')
    console.log('   用户: user / 123456')
    return true
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error)
    return false
  }
}