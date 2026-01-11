// 数据库迁移：添加土地信息字段到investment_projects表
import { pool } from './config.js'

async function migrate() {
  try {
    console.log('开始迁移：添加土地信息字段...')
    
    const alterQueries = [
      "ALTER TABLE investment_projects ADD COLUMN IF NOT EXISTS land_mode VARCHAR(10) DEFAULT 'A'",
      "ALTER TABLE investment_projects ADD COLUMN IF NOT EXISTS land_area DECIMAL(15,4) DEFAULT 0",
      "ALTER TABLE investment_projects ADD COLUMN IF NOT EXISTS land_unit_price DECIMAL(15,4) DEFAULT 0",
      "ALTER TABLE investment_projects ADD COLUMN IF NOT EXISTS land_lease_area DECIMAL(15,4) DEFAULT 0",
      "ALTER TABLE investment_projects ADD COLUMN IF NOT EXISTS land_lease_unit_price DECIMAL(15,4) DEFAULT 0",
      "ALTER TABLE investment_projects ADD COLUMN IF NOT EXISTS land_purchase_area DECIMAL(15,4) DEFAULT 0",
      "ALTER TABLE investment_projects ADD COLUMN IF NOT EXISTS land_purchase_unit_price DECIMAL(15,4) DEFAULT 0",
      "ALTER TABLE investment_projects ADD COLUMN IF NOT EXISTS land_cost DECIMAL(15,4) DEFAULT 0",
      "ALTER TABLE investment_projects ADD COLUMN IF NOT EXISTS land_remark TEXT",
      "ALTER TABLE investment_projects ADD COLUMN IF NOT EXISTS seedling_compensation DECIMAL(15,4) DEFAULT 0",
      "ALTER TABLE investment_projects ADD COLUMN IF NOT EXISTS lease_seedling_compensation DECIMAL(15,4) DEFAULT 0"
    ]

    for (const query of alterQueries) {
      try {
        await pool.execute(query)
        console.log('成功:', query.substring(0, 80) + '...')
      } catch (error: any) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log('跳过(字段已存在):', query.substring(0, 80) + '...')
        } else {
          console.error('失败:', query.substring(0, 80), error.message)
        }
      }
    }

    console.log('迁移完成！')
    process.exit(0)
  } catch (error) {
    console.error('迁移失败:', error)
    process.exit(1)
  }
}

migrate()
