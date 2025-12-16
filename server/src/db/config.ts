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
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
}

export const pool = mysql.createPool(dbConfig)

export async function testConnection() {
  try {
    const connection = await pool.getConnection()
    console.log('✅ MariaDB 连接成功')
    connection.release()
    
    // 自动迁移：检查并添加缺失的土地字段
    await ensureLandFields()
    
    return true
  } catch (error) {
    console.error('❌ MariaDB 连接失败:', error)
    return false
  }
}

// 确保土地信息字段存在
async function ensureLandFields() {
  const alterQueries = [
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
    "ALTER TABLE investment_estimates ADD COLUMN custom_land_cost DECIMAL(15,2) DEFAULT NULL COMMENT '自定义土地费用（万元）'"
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