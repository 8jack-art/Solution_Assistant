import { pool } from './config.js'

async function addSeedlingCompensation() {
  try {
    console.log('添加青苗补偿费字段...')
    
    await pool.execute(`
      ALTER TABLE investment_projects 
      ADD COLUMN IF NOT EXISTS seedling_compensation DECIMAL(10,2) DEFAULT 0 COMMENT '青苗补偿费(万元)'
    `)
    
    console.log('✅ 青苗补偿费字段添加完成!')
    process.exit(0)
  } catch (error: any) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('字段已存在')
      process.exit(0)
    }
    console.error('❌ 添加失败:', error)
    process.exit(1)
  }
}

addSeedlingCompensation()
