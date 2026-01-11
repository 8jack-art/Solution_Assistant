import { pool } from './config.js'

async function migrateLandInfo() {
  try {
    console.log('开始添加土地信息字段...')
    
    const queries = [
      `ALTER TABLE investment_projects 
       ADD COLUMN IF NOT EXISTS land_mode VARCHAR(20) DEFAULT 'A' COMMENT '用地模式: A-一次性征地, B-长期租赁, C-无土地需求, D-混合用地'`,
      
      `ALTER TABLE investment_projects 
       ADD COLUMN IF NOT EXISTS land_area DECIMAL(10,2) DEFAULT 0 COMMENT '土地面积(亩)'`,
      
      `ALTER TABLE investment_projects 
       ADD COLUMN IF NOT EXISTS land_unit_price DECIMAL(10,2) DEFAULT 0 COMMENT '土地单价(万元/亩或万元/亩/年)'`,
      
      `ALTER TABLE investment_projects 
       ADD COLUMN IF NOT EXISTS land_cost DECIMAL(15,2) DEFAULT 0 COMMENT '土地费用(万元)'`,
      
      `ALTER TABLE investment_projects 
       ADD COLUMN IF NOT EXISTS land_remark TEXT COMMENT '土地信息备注'`,
      
      `ALTER TABLE investment_projects 
       ADD COLUMN IF NOT EXISTS land_lease_area DECIMAL(10,2) DEFAULT 0 COMMENT '租赁土地面积(亩,混合模式)'`,
      
      `ALTER TABLE investment_projects 
       ADD COLUMN IF NOT EXISTS land_lease_unit_price DECIMAL(10,2) DEFAULT 0 COMMENT '租赁土地单价(万元/亩/年,混合模式)'`,
      
      `ALTER TABLE investment_projects 
       ADD COLUMN IF NOT EXISTS land_purchase_area DECIMAL(10,2) DEFAULT 0 COMMENT '征地面积(亩,混合模式)'`,
      
      `ALTER TABLE investment_projects 
       ADD COLUMN IF NOT EXISTS land_purchase_unit_price DECIMAL(10,2) DEFAULT 0 COMMENT '征地单价(万元/亩,混合模式)'`
    ]
    
    for (const query of queries) {
      try {
        await pool.execute(query)
        console.log('执行成功:', query.substring(0, 80) + '...')
      } catch (error: any) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log('字段已存在，跳过')
        } else {
          throw error
        }
      }
    }
    
    console.log('✅ 土地信息字段添加完成!')
    process.exit(0)
  } catch (error) {
    console.error('❌ 迁移失败:', error)
    process.exit(1)
  }
}

migrateLandInfo()
