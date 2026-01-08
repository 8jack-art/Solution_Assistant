import { pool } from '../config.ts'

async function executeMigrations() {
  try {
    console.log('开始执行缺失的数据库迁移...')
    
    // 检查并添加缺失的字段
    const migrations = [
      {
        name: 'construction_interest_details',
        sql: `ALTER TABLE investment_estimates 
               ADD COLUMN construction_interest_details JSON NULL COMMENT '建设期利息详情JSON数据'`
      },
      {
        name: 'loan_repayment_schedule_simple',
        sql: `ALTER TABLE investment_estimates 
               ADD COLUMN loan_repayment_schedule_simple JSON NULL COMMENT '还本付息计划简表JSON数据（等额本金）'`
      },
      {
        name: 'loan_repayment_schedule_detailed',
        sql: `ALTER TABLE investment_estimates 
               ADD COLUMN loan_repayment_schedule_detailed JSON NULL COMMENT '还本付息计划详细表JSON数据（等额本息）'`
      },
      {
        name: 'custom_land_cost',
        sql: `ALTER TABLE investment_estimates 
               ADD COLUMN custom_land_cost DECIMAL(15,2) NULL COMMENT '自定义土地费用'`
      }
    ]
    
    for (const migration of migrations) {
      try {
        console.log(`执行迁移: ${migration.name}`)
        await pool.execute(migration.sql)
        console.log(`✓ 成功添加字段: ${migration.name}`)
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`- 字段已存在: ${migration.name}`)
        } else {
          console.error(`✗ 执行迁移失败 ${migration.name}:`, error.message)
        }
      }
    }
    
    console.log('迁移执行完成')
    
    // 验证表结构
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'miaoda' AND TABLE_NAME = 'investment_estimates'
      ORDER BY ORDINAL_POSITION
    `)
    
    console.log('\n当前investment_estimates表结构:')
    columns.forEach(col => {
      console.log(`- ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE})`)
    })
    
  } catch (error) {
    console.error('执行迁移失败:', error)
  } finally {
    await pool.end()
  }
}

executeMigrations()