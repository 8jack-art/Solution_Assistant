import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

export const dbConfig = {
  host: process.env.DB_HOST || 'sql.gxch.site',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'ProjInvDB',
  password: process.env.DB_PASSWORD || '8Pd6tTKmkzY6rYSC',
  database: process.env.DB_NAME || 'ProjInvDB',
  waitForConnections: true,
  connectionLimit: 20, // 增加最大连接数到20
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // 添加连接超时设置
  connectTimeout: 10000, // 10秒连接超时
  acquireTimeout: 10000, // 10秒获取连接超时
  timeout: 30000, // 30秒查询超时
}

export const pool = mysql.createPool(dbConfig)

export async function testConnection() {
  try {
    const connection = await pool.getConnection()
    console.log('✅ MariaDB 连接成功')
    connection.release()
    
    // 自动迁移：检查并添加缺失的字段
    await ensureFields()
    
    return true
  } catch (error) {
    console.error('❌ MariaDB 连接失败:', error)
    return false
  }
}

// 确保数据库字段存在
async function ensureFields() {
  const alterQueries = [
    // 投资项目的土地相关字段
    "ALTER TABLE investment_projects ADD COLUMN construction_unit VARCHAR(255) DEFAULT '' COMMENT '建设单位'",
    "ALTER TABLE investment_projects ADD COLUMN land_mode VARCHAR(10) DEFAULT 'A'",
    "ALTER TABLE investment_projects ADD COLUMN land_area DECIMAL(15,4) DEFAULT 0",
    "ALTER TABLE investment_projects ADD COLUMN land_unit_price DECIMAL(15,4) DEFAULT 0",
    "ALTER TABLE investment_projects ADD COLUMN land_lease_area DECIMAL(15,4) DEFAULT 0",
    "ALTER TABLE investment_projects ADD COLUMN land_lease_unit_price DECIMAL(15,4) DEFAULT 0",
    "ALTER TABLE investment_projects ADD COLUMN land_purchase_area DECIMAL(15,4) DEFAULT 0",
    "ALTER TABLE investment_projects ADD COLUMN land_purchase_unit_price DECIMAL(15,4) DEFAULT 0",
    "ALTER TABLE investment_projects ADD COLUMN land_cost DECIMAL(15,4) DEFAULT 0",
    "ALTER TABLE investment_projects ADD COLUMN land_remark TEXT",
    "ALTER TABLE investment_projects ADD COLUMN seedling_compensation DECIMAL(15,4) DEFAULT 0",
    "ALTER TABLE investment_projects ADD COLUMN lease_seedling_compensation DECIMAL(15,4) DEFAULT 0",
    // 项目地点和类型字段
    "ALTER TABLE investment_projects ADD COLUMN location VARCHAR(255) DEFAULT '' COMMENT '项目地点'",
    "ALTER TABLE investment_projects ADD COLUMN project_type VARCHAR(100) DEFAULT '' COMMENT '项目类型（曾用名：所属行业）'",
    "ALTER TABLE investment_projects ADD COLUMN industry VARCHAR(100) DEFAULT '' COMMENT '所属行业（已废弃，保留用于兼容旧数据）'",
    "ALTER TABLE investment_estimates ADD COLUMN custom_land_cost DECIMAL(15,2) DEFAULT NULL COMMENT '自定义土地费用（万元）'",
    // 报告表字段
    "ALTER TABLE generated_reports ADD COLUMN IF NOT EXISTS error_message TEXT COMMENT '错误信息'",
    "ALTER TABLE generated_reports ADD COLUMN IF NOT EXISTS style_config JSON COMMENT '样式配置'",
    "ALTER TABLE generated_reports ADD COLUMN IF NOT EXISTS sections_config JSON COMMENT '章节配置'",
    "ALTER TABLE generated_reports ADD COLUMN IF NOT EXISTS resources_config JSON COMMENT '资源映射'",
  ]

  for (const query of alterQueries) {
    try {
      await pool.execute(query)
      console.log('✅ 添加字段:', query.match(/ADD COLUMN (\w+)/)?.[1])
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        // 字段已存在，跳过
      } else {
        console.error('❌ 迁移失败:', error.message)
      }
    }
  }
}
