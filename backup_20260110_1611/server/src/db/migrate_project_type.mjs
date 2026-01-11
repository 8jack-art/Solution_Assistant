import { pool } from './config.js'

async function migrate() {
  try {
    console.log('开始执行数据库迁移：添加 project_type 和 location 字段')
    
    // 添加 location 字段
    await pool.execute(
      'ALTER TABLE investment_projects ADD COLUMN location VARCHAR(255) DEFAULT \'\' COMMENT \'项目地点\' AFTER operation_years'
    )
    console.log('✅ 已添加 location 字段')
    
    // 添加 project_type 字段
    await pool.execute(
      'ALTER TABLE investment_projects ADD COLUMN project_type VARCHAR(100) DEFAULT \'\' COMMENT \'项目类型（曾用名：所属行业）\' AFTER location'
    )
    console.log('✅ 已添加 project_type 字段')
    
    // 如果 industry 字段不存在，添加它（用于兼容旧数据）
    try {
      await pool.execute(
        'ALTER TABLE investment_projects ADD COLUMN industry VARCHAR(100) DEFAULT \'\' COMMENT \'所属行业（已废弃，保留用于兼容旧数据）\' AFTER project_type'
      )
      console.log('✅ 已添加 industry 字段（兼容旧数据）')
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  industry 字段已存在，跳过')
      } else {
        throw error
      }
    }
    
    // 迁移数据：如果 project_type 为空但 industry 有值，则复制数据
    await pool.execute(
      'UPDATE investment_projects SET project_type = industry WHERE project_type = \'\' OR project_type IS NULL AND industry IS NOT NULL AND industry != \'\''
    )
    console.log('✅ 已将旧数据从 industry 迁移到 project_type')
    
    console.log('数据库迁移完成！')
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  字段已存在，跳过迁移')
    } else {
      console.error('❌ 数据库迁移失败:', error)
      throw error
    }
  } finally {
    await pool.end()
  }
}

migrate()
