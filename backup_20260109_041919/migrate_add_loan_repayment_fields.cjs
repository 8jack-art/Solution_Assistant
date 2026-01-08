const path = require('path')

// 设置NODE_PATH指向server的node_modules
process.env.NODE_PATH = process.cwd().includes('server') 
  ? path.join(process.cwd(), 'node_modules')
  : path.join(__dirname, 'server', 'node_modules');
require('module').Module._initPaths();

const sqlite3 = require('sqlite3').verbose()

// 根据运行位置确定数据库路径
const DB_PATH = process.cwd().includes('server') 
  ? path.join(__dirname, 'src', 'db', 'database.sqlite')
  : path.join(__dirname, 'server', 'src', 'db', 'database.sqlite')

async function migrate() {
  const db = new sqlite3.Database(DB_PATH)

  try {
    console.log('开始添加贷款相关字段...')

    // 检查字段是否已存在
    const tableInfo = await new Promise((resolve, reject) => {
      db.all('PRAGMA table_info(investment_estimates)', (err, rows) => {
        if (err) reject(err)
        else resolve(rows)
      })
    })

    const existingColumns = tableInfo.map(row => row.name)
    
    // 添加建设期利息详情字段
    if (!existingColumns.includes('construction_interest_details')) {
      await new Promise((resolve, reject) => {
        db.run(
          'ALTER TABLE investment_estimates ADD COLUMN construction_interest_details TEXT',
          (err) => {
            if (err) reject(err)
            else resolve()
          }
        )
      })
      console.log('✓ 添加 construction_interest_details 字段')
    } else {
      console.log('- construction_interest_details 字段已存在')
    }

    // 添加还本付息计划简表字段
    if (!existingColumns.includes('loan_repayment_schedule_simple')) {
      await new Promise((resolve, reject) => {
        db.run(
          'ALTER TABLE investment_estimates ADD COLUMN loan_repayment_schedule_simple TEXT',
          (err) => {
            if (err) reject(err)
            else resolve()
          }
        )
      })
      console.log('✓ 添加 loan_repayment_schedule_simple 字段')
    } else {
      console.log('- loan_repayment_schedule_simple 字段已存在')
    }

    // 添加还本付息计划表字段
    if (!existingColumns.includes('loan_repayment_schedule_detailed')) {
      await new Promise((resolve, reject) => {
        db.run(
          'ALTER TABLE investment_estimates ADD COLUMN loan_repayment_schedule_detailed TEXT',
          (err) => {
            if (err) reject(err)
            else resolve()
          }
        )
      })
      console.log('✓ 添加 loan_repayment_schedule_detailed 字段')
    } else {
      console.log('- loan_repayment_schedule_detailed 字段已存在')
    }

    console.log('✅ 数据库迁移完成！')
  } catch (error) {
    console.error('❌ 迁移失败:', error)
    process.exit(1)
  } finally {
    db.close()
  }
}

migrate()
