import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const dbConfig = {
  host: process.env.DB_HOST || 'sql.gxch.site',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'ProjInvDB',
  password: process.env.DB_PASSWORD || '8Pd6tTKmkzY6rYSC',
  database: process.env.DB_NAME || 'ProjInvDB',
}

async function migrateLoanFields() {
  const connection = await mysql.createConnection(dbConfig)
  
  try {
    console.log('开始添加贷款相关字段...')
    
    // 检查现有字段
    const [rows] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${dbConfig.database}' 
      AND TABLE_NAME = 'investment_estimates'
    `)
    
    const existingColumns = (rows as any[]).map(row => row.COLUMN_NAME)
    console.log('现有字段:', existingColumns)
    
    const fieldsToAdd = [
      {
        name: 'construction_interest_details',
        definition: "ADD COLUMN construction_interest_details TEXT COMMENT '建设期利息详情JSON'"
      },
      {
        name: 'loan_repayment_schedule_simple', 
        definition: "ADD COLUMN loan_repayment_schedule_simple TEXT COMMENT '还本付息计划简表JSON（等额本金）'"
      },
      {
        name: 'loan_repayment_schedule_detailed',
        definition: "ADD COLUMN loan_repayment_schedule_detailed TEXT COMMENT '还本付息计划表JSON（等额本息）'"
      }
    ]
    
    for (const field of fieldsToAdd) {
      if (!existingColumns.includes(field.name)) {
        try {
          await connection.execute(`
            ALTER TABLE investment_estimates ${field.definition}
          `)
          console.log(`✓ 添加 ${field.name} 字段`)
        } catch (error: any) {
          if (error.code === 'ER_DUP_FIELDNAME') {
            console.log(`- ${field.name} 字段已存在`)
          } else {
            console.error(`❌ 添加字段 ${field.name} 失败:`, error.message)
          }
        }
      } else {
        console.log(`- ${field.name} 字段已存在`)
      }
    }
    
    console.log('✅ 数据库迁移完成！')
  } catch (error) {
    console.error('❌ 迁移失败:', error)
    throw error
  } finally {
    await connection.end()
  }
}

// 运行迁移
migrateLoanFields().catch(console.error)
