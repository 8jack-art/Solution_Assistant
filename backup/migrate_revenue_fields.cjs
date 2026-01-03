const mysql = require('mysql2/promise');

async function addMissingFields() {
  const connection = await mysql.createConnection({
    host: 'sql.gxch.site',
    port: 3306,
    user: 'ProjInvDB',
    password: '8Pd6tTKmkzY6rYSC',
    database: 'ProjInvDB'
  });

  try {
    console.log('✅ 数据库连接成功\n');
    
    // 添加缺失字段
    const alterQueries = [
      {
        sql: "ALTER TABLE revenue_cost_estimates ADD COLUMN workflow_step VARCHAR(20) DEFAULT 'period' COMMENT '工作流步骤: period, suggest, revenue, cost, profit, validate, done'",
        field: 'workflow_step'
      },
      {
        sql: "ALTER TABLE revenue_cost_estimates ADD COLUMN model_data LONGTEXT COMMENT '完整的建模数据（JSON格式）'",
        field: 'model_data'
      },
      {
        sql: "ALTER TABLE revenue_cost_estimates ADD COLUMN is_completed BOOLEAN DEFAULT FALSE COMMENT '是否已完成'",
        field: 'is_completed'
      }
    ];

    for (const query of alterQueries) {
      try {
        await connection.execute(query.sql);
        console.log(`✅ 成功添加字段: ${query.field}`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`⏭️  字段已存在，跳过: ${query.field}`);
        } else {
          console.error(`❌ 添加字段失败 (${query.field}):`, error.message);
        }
      }
    }
    
    console.log('\n🎉 迁移完成！');
    
    // 验证字段
    const [columns] = await connection.query('SHOW COLUMNS FROM revenue_cost_estimates');
    const hasWorkflowStep = columns.some(col => col.Field === 'workflow_step');
    const hasModelData = columns.some(col => col.Field === 'model_data');
    const hasIsCompleted = columns.some(col => col.Field === 'is_completed');
    
    console.log('\n🔍 验证结果:');
    console.log('  workflow_step:', hasWorkflowStep ? '✅ 存在' : '❌ 缺失');
    console.log('  model_data:', hasModelData ? '✅ 存在' : '❌ 缺失');
    console.log('  is_completed:', hasIsCompleted ? '✅ 存在' : '❌ 缺失');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await connection.end();
  }
}

addMissingFields();
